import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ACTOR_REGISTRY, type PlannerParams } from '@/lib/actor-registry';
import { estimateActorCost } from '@/lib/cost';
import type { Platform, PlannedActorRun, ResearchSpec } from '@/lib/types';

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: plan } = await supabase
    .from('execution_plans')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ plan: plan || null });
}

export async function POST(request: NextRequest) {
  const { projectId } = await request.json();

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Load latest research spec
  const { data: spec, error: specError } = await supabase
    .from('research_specs')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (specError || !spec) {
    return NextResponse.json({ error: 'No research spec found' }, { status: 404 });
  }

  const researchSpec = spec as ResearchSpec;

  // Build execution plan from spec
  const plannedRuns: PlannedActorRun[] = [];

  for (const platform of researchSpec.platforms) {
    const entry = ACTOR_REGISTRY[platform as Platform];
    if (!entry) continue;

    const params: PlannerParams = {
      keywords: researchSpec.keywords,
      brands: researchSpec.competitors,
      subreddits: [], // Could be extracted from keywords
      hashtags: researchSpec.keywords.map((k) => k.replace(/\s+/g, '')),
      urls: [],
      geo: researchSpec.geographic_focus || 'US',
      timeRange: researchSpec.time_horizon || 'last 6 months',
      maxResults: entry.defaults.maxResults,
    };

    const inputParams = entry.buildInput(params);
    const estimatedCostCents = estimateActorCost(platform as Platform, entry.defaults.maxResults);

    plannedRuns.push({
      platform: platform as Platform,
      actorId: entry.id,
      displayName: entry.displayName,
      inputParams,
      estimatedCostCents,
      estimatedResults: entry.defaults.maxResults,
      rationale: `${entry.displayName}: ${entry.useCases[0]}`,
    });
  }

  const totalCost = plannedRuns.reduce((sum, r) => sum + r.estimatedCostCents, 0);

  // Save execution plan
  const { data: plan, error: planError } = await supabase
    .from('execution_plans')
    .insert({
      project_id: projectId,
      spec_id: researchSpec.id,
      status: 'pending',
      total_estimated_cost_cents: totalCost,
      plan_data: plannedRuns,
    })
    .select()
    .single();

  if (planError) {
    return NextResponse.json({ error: planError.message }, { status: 500 });
  }

  // Update project cost estimate
  await supabase
    .from('projects')
    .update({ estimated_cost_cents: totalCost })
    .eq('id', projectId);

  return NextResponse.json({ plan });
}

// Approve a plan
export async function PATCH(request: NextRequest) {
  const { planId, action } = await request.json();

  if (!planId || action !== 'approve') {
    return NextResponse.json({ error: 'planId and action=approve required' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: plan, error } = await supabase
    .from('execution_plans')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan });
}
