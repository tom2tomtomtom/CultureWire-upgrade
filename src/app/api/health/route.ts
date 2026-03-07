import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { getApifyCreditBalance, getRedditAccessToken } from '@/lib/apify';

interface CheckResult {
  ok: boolean;
  latency_ms: number;
  error?: string;
  credits_remaining?: number;
}

async function timedCheck(name: string, fn: () => Promise<Partial<CheckResult>>): Promise<[string, CheckResult]> {
  const start = Date.now();
  try {
    const result = await fn();
    return [name, { ok: true, latency_ms: Date.now() - start, ...result }];
  } catch (err) {
    return [name, { ok: false, latency_ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) }];
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = await Promise.allSettled([
    timedCheck('supabase', async () => {
      const supabase = await createServerClient();
      const { error } = await supabase.from('culture_wire_searches').select('id').limit(1);
      if (error) throw new Error(error.message);
      return {};
    }),
    timedCheck('claude', async () => {
      const anthropic = getAnthropicClient();
      await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return {};
    }),
    timedCheck('apify', async () => {
      const credits = await getApifyCreditBalance();
      if (!credits) throw new Error('APIFY_API_KEY not configured or API unreachable');
      return { credits_remaining: credits.remaining };
    }),
    timedCheck('reddit', async () => {
      await getRedditAccessToken();
      return {};
    }),
    timedCheck('newsapi', async () => {
      if (!process.env.NEWS_API_KEY) throw new Error('NEWS_API_KEY not configured');
      return {};
    }),
    timedCheck('perplexity', async () => {
      if (!process.env.PERPLEXITY_API_KEY) throw new Error('PERPLEXITY_API_KEY not configured');
      return {};
    }),
  ]);

  const checks: Record<string, CheckResult> = {};
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const [name, check] = result.value;
      checks[name] = check;
    }
  }

  const critical = ['supabase', 'claude'];
  const criticalFailed = critical.some((s) => !checks[s]?.ok);
  const anyFailed = Object.values(checks).some((c) => !c.ok);

  const status = criticalFailed ? 'unhealthy' : anyFailed ? 'degraded' : 'healthy';

  return NextResponse.json(
    { status, checks, timestamp: new Date().toISOString() },
    { status: status === 'unhealthy' ? 503 : 200 }
  );
}
