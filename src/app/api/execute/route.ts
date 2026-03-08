import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { startActorRun, pollRunToCompletion, getDatasetItems, scrapeRedditDirect } from '@/lib/apify';
import { ExecuteRequestSchema, CancelExecutionSchema } from '@/lib/validators';
import type { PlannedActorRun, ScrapeJob } from '@/lib/types';
import { ACTOR_REGISTRY } from '@/lib/actor-registry';

async function processJob(jobId: string, projectId: string, runId: string, platform: string) {
  const supabase = createAdminClient();
  try {
    const run = await pollRunToCompletion(runId, 300_000);
    const items = await getDatasetItems(run.defaultDatasetId);

    await supabase.from('scrape_results').insert({
      job_id: jobId,
      project_id: projectId,
      source_platform: platform,
      raw_data: items,
      item_count: items.length,
    });

    await supabase
      .from('scrape_jobs')
      .update({
        status: 'succeeded',
        apify_dataset_id: run.defaultDatasetId,
        result_count: items.length,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  } catch (error) {
    await supabase
      .from('scrape_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = ExecuteRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId, planId } = parsed.data;
  const supabase = await createServerClient();

  // Load plan
  const { data: plan, error: planError } = await supabase
    .from('execution_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  if (plan.status !== 'approved') {
    return NextResponse.json({ error: 'Plan must be approved first' }, { status: 400 });
  }

  // Update plan and project status
  await supabase
    .from('execution_plans')
    .update({ status: 'executing' })
    .eq('id', planId);
  await supabase
    .from('projects')
    .update({ status: 'executing' })
    .eq('id', projectId);

  const allPlannedRuns = plan.plan_data as PlannedActorRun[];
  // Whitelist: only allow runs whose platform/actorId match the ACTOR_REGISTRY
  const plannedRuns = allPlannedRuns.filter((run) => {
    const entry = ACTOR_REGISTRY[run.platform];
    if (!entry || entry.id !== run.actorId) {
      console.warn(`[execute] Skipping unrecognized actor: platform=${run.platform}, actorId=${run.actorId}`);
      return false;
    }
    return true;
  });
  const jobs: ScrapeJob[] = [];
  // Map job IDs to their actual platform for correct source_platform storage
  const jobPlatformMap = new Map<string, string>();

  // Start all actors
  for (const run of plannedRuns) {
    try {
      // Use direct Reddit API instead of Apify
      if (run.platform === 'reddit') {
        const items = await scrapeRedditDirect(run.inputParams);

        const { data: job } = await supabase
          .from('scrape_jobs')
          .insert({
            project_id: projectId,
            plan_id: planId,
            actor_id: 'reddit-direct-api',
            actor_display_name: run.displayName,
            status: 'succeeded',
            input_params: run.inputParams,
            result_count: items.length,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (job) {
          await supabase.from('scrape_results').insert({
            job_id: job.id,
            project_id: projectId,
            source_platform: run.platform,
            raw_data: items,
            item_count: items.length,
          });
          jobPlatformMap.set(job.id, run.platform);
          jobs.push(job);
        }
        continue;
      }

      const { runId } = await startActorRun(run.actorId, run.inputParams);

      const { data: job } = await supabase
        .from('scrape_jobs')
        .insert({
          project_id: projectId,
          plan_id: planId,
          actor_id: run.actorId,
          actor_display_name: run.displayName,
          status: 'running',
          input_params: run.inputParams,
          apify_run_id: runId,
          estimated_cost_cents: run.estimatedCostCents,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (job) {
        jobPlatformMap.set(job.id, run.platform);
        jobs.push(job);
      }
    } catch (error) {
      // Insert failed job
      const { data: job } = await supabase
        .from('scrape_jobs')
        .insert({
          project_id: projectId,
          plan_id: planId,
          actor_id: run.actorId,
          actor_display_name: run.displayName,
          status: 'failed',
          input_params: run.inputParams,
          error_message: error instanceof Error ? error.message : 'Failed to start',
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (job) {
        jobPlatformMap.set(job.id, run.platform);
        jobs.push(job);
      }
    }
  }

  // Background polling for running jobs
  after(async () => {
    const adminClient = createAdminClient();
    const runningJobs = jobs.filter((j) => j.status === 'running' && j.apify_run_id);
    await Promise.allSettled(
      runningJobs.map((j) =>
        processJob(j.id, projectId, j.apify_run_id!, jobPlatformMap.get(j.id) || j.actor_display_name.toLowerCase().replace(/\s+/g, '_'))
      )
    );

    // Check if all complete
    const { data: allJobs } = await adminClient
      .from('scrape_jobs')
      .select('status')
      .eq('plan_id', planId);

    if (allJobs) {
      const allDone = allJobs.every(
        (j) => j.status === 'succeeded' || j.status === 'failed' || j.status === 'timeout'
      );
      if (allDone) {
        await adminClient
          .from('execution_plans')
          .update({ status: 'complete' })
          .eq('id', planId);
      }
    }
  });

  return NextResponse.json({ jobs });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const parsed = CancelExecutionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { action } = parsed.data;

  if (action === 'cancel') {
    const { projectId } = parsed.data;
    // Fail all running/pending jobs
    await supabase
      .from('scrape_jobs')
      .update({
        status: 'failed',
        error_message: 'Cancelled by user',
        completed_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .in('status', ['running', 'pending']);

    // Set project to failed
    await supabase
      .from('projects')
      .update({ status: 'failed' })
      .eq('id', projectId);

    return NextResponse.json({ success: true });
  }

  if (action === 'skip_and_synthesize') {
    const { projectId } = parsed.data;
    // Fail remaining running/pending jobs
    await supabase
      .from('scrape_jobs')
      .update({
        status: 'failed',
        error_message: 'Skipped — user requested early synthesis',
        completed_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .in('status', ['running', 'pending']);

    // Leave project in executing state — client will trigger synthesis
    return NextResponse.json({ success: true });
  }

  if (action === 'mark_job_failed') {
    const { projectId, jobId } = parsed.data;
    await supabase
      .from('scrape_jobs')
      .update({
        status: 'failed',
        error_message: 'Marked failed by user',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('project_id', projectId);

    return NextResponse.json({ success: true });
  }

  if (action === 'retry_failed') {
    const { projectId, planId } = parsed.data;

    // Get failed jobs
    const { data: failedJobs } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('plan_id', planId)
      .eq('project_id', projectId)
      .in('status', ['failed', 'timeout']);

    if (!failedJobs || failedJobs.length === 0) {
      return NextResponse.json({ error: 'No failed jobs to retry' }, { status: 400 });
    }

    // Update project back to executing
    await supabase
      .from('projects')
      .update({ status: 'executing' })
      .eq('id', projectId);

    const newJobs: ScrapeJob[] = [];

    for (const oldJob of failedJobs) {
      const platform = oldJob.actor_display_name.toLowerCase().replace(/\s+/g, '_');

      try {
        if (platform === 'reddit' || oldJob.actor_id === 'reddit-direct-api') {
          const items = await scrapeRedditDirect(oldJob.input_params);

          const { data: job } = await supabase
            .from('scrape_jobs')
            .insert({
              project_id: projectId,
              plan_id: planId,
              actor_id: 'reddit-direct-api',
              actor_display_name: oldJob.actor_display_name,
              status: 'succeeded',
              input_params: oldJob.input_params,
              result_count: items.length,
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (job) {
            await supabase.from('scrape_results').insert({
              job_id: job.id,
              project_id: projectId,
              source_platform: 'reddit',
              raw_data: items,
              item_count: items.length,
            });
            newJobs.push(job);
          }
        } else {
          const { runId } = await startActorRun(oldJob.actor_id, oldJob.input_params);

          const { data: job } = await supabase
            .from('scrape_jobs')
            .insert({
              project_id: projectId,
              plan_id: planId,
              actor_id: oldJob.actor_id,
              actor_display_name: oldJob.actor_display_name,
              status: 'running',
              input_params: oldJob.input_params,
              apify_run_id: runId,
              estimated_cost_cents: oldJob.estimated_cost_cents,
              started_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (job) newJobs.push(job);
        }

        // Delete old failed job
        await supabase.from('scrape_jobs').delete().eq('id', oldJob.id);
      } catch (error) {
        // Insert replacement as failed
        const { data: job } = await supabase
          .from('scrape_jobs')
          .insert({
            project_id: projectId,
            plan_id: planId,
            actor_id: oldJob.actor_id,
            actor_display_name: oldJob.actor_display_name,
            status: 'failed',
            input_params: oldJob.input_params,
            error_message: error instanceof Error ? error.message : 'Retry failed',
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (job) newJobs.push(job);
        await supabase.from('scrape_jobs').delete().eq('id', oldJob.id);
      }
    }

    // Background poll for running retry jobs
    const runningRetries = newJobs.filter((j) => j.status === 'running' && j.apify_run_id);
    if (runningRetries.length > 0) {
      after(async () => {
        await Promise.allSettled(
          runningRetries.map((j) =>
            processJob(j.id, projectId, j.apify_run_id!, j.actor_display_name.toLowerCase().replace(/\s+/g, '_'))
          )
        );
      });
    }

    return NextResponse.json({ jobs: newJobs });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
