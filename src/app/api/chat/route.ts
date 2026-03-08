import { NextRequest } from 'next/server';
import { getAnthropicClient, MODEL_FALLBACK_ORDER } from '@/lib/anthropic';
import { createServerClient } from '@/lib/supabase/server';
import { ChatRequestSchema } from '@/lib/validators';
import { buildPlannerSystemPrompt } from '@/lib/prompts/planner';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return Response.json({ error: 'projectId required' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at')
    .limit(100);

  return Response.json({ messages: messages || [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = ChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId, message } = parsed.data;
  const supabase = await createServerClient();
  const anthropic = getAnthropicClient();

  // Save user message
  await supabase.from('chat_messages').insert({
    project_id: projectId,
    role: 'user',
    content: message,
  });

  // Load conversation history
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('project_id', projectId)
    .order('created_at')
    .limit(100);

  // Load project context (brief text if any)
  const { data: project } = await supabase
    .from('projects')
    .select('brief_text, brief_parsed')
    .eq('id', projectId)
    .single();

  const briefContext = project?.brief_parsed || project?.brief_text || '';

  // Build messages for Claude
  const systemPrompt = buildPlannerSystemPrompt() +
    (briefContext ? `\n\n## User's Brief Document\n${briefContext}` : '');

  const messages_for_claude = (history || []).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Stream response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = '';

      try {
        // Stream with model fallback — streaming create() doesn't throw on 529,
        // errors surface during iteration, so we catch and retry with fallback model
        for (let i = 0; i < MODEL_FALLBACK_ORDER.length; i++) {
          const model = MODEL_FALLBACK_ORDER[i];
          try {
            const response = await anthropic.messages.create({
              model,
              max_tokens: 4096,
              system: systemPrompt,
              messages: messages_for_claude,
              stream: true,
            });

            for await (const event of response) {
              if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
              ) {
                const text = event.delta.text;
                fullResponse += text;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                );
              }
            }
            break; // Success — exit model loop
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            const isOverloaded = msg.includes('overloaded') || msg.includes('529') || msg.includes('rate');
            if (isOverloaded && i < MODEL_FALLBACK_ORDER.length - 1) {
              console.log(`[chat] ${model} overloaded, falling back to ${MODEL_FALLBACK_ORDER[i + 1]}`);
              fullResponse = ''; // Reset in case partial data came through
              continue;
            }
            throw err;
          }
        }

        // Save assistant message
        await supabase.from('chat_messages').insert({
          project_id: projectId,
          role: 'assistant',
          content: fullResponse,
        });

        // Check for research spec in response
        const specMatch = fullResponse.match(
          /```json:research_spec\n([\s\S]*?)\n```/
        );
        console.log('[chat] Spec block found:', !!specMatch);
        if (!specMatch) {
          // Log last 500 chars to see what Claude actually output
          console.log('[chat] Response tail:', fullResponse.slice(-500));
        }
        if (specMatch) {
          try {
            const specData = JSON.parse(specMatch[1]);
            const { data: spec } = await supabase
              .from('research_specs')
              .insert({
                project_id: projectId,
                objective: specData.objective,
                key_questions: specData.key_questions,
                target_audience: specData.target_audience,
                competitors: specData.competitors || [],
                keywords: specData.keywords || [],
                platforms: specData.platforms || [],
                geographic_focus: specData.geographic_focus,
                time_horizon: specData.time_horizon,
                raw_llm_output: fullResponse,
              })
              .select()
              .single();

            if (spec) {
              // Auto-title the project from the research objective
              const title = specData.objective
                ? specData.objective.slice(0, 100)
                : 'Untitled Research';
              await supabase
                .from('projects')
                .update({ status: 'planning', title })
                .eq('id', projectId);

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ research_spec: spec })}\n\n`
                )
              );
            }
          } catch (specErr) {
            console.error('[chat] Spec parsing/insert failed:', specErr);
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: (error as Error).message })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
