import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'APIFY_API_KEY not configured' }, { status: 500 });
  }

  try {
    // Get user account info (includes subscription & usage)
    const userRes = await fetch(`https://api.apify.com/v2/users/me?token=${apiKey}`);
    if (!userRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch Apify account info' }, { status: 502 });
    }
    const userData = await userRes.json();
    const plan = userData.data?.plan;
    const usage = userData.data?.usage;

    // Get recent actor runs for cost tracking
    const runsRes = await fetch(
      `https://api.apify.com/v2/actor-runs?token=${apiKey}&limit=20&desc=true`
    );
    const runsData = runsRes.ok ? await runsRes.json() : { data: { items: [] } };
    const recentRuns = (runsData.data?.items || []).map((run: Record<string, unknown>) => ({
      id: run.id,
      actorId: run.actId,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      usageTotalUsd: run.usageTotalUsd,
      defaultDatasetId: run.defaultDatasetId,
    }));

    return NextResponse.json({
      plan: {
        name: plan?.name || 'Unknown',
        monthlyUsageCreditsUsd: plan?.monthlyUsageCreditsUsd || 0,
      },
      usage: {
        monthlyUsageCreditsUsedUsd: usage?.monthlyUsageCreditsUsedUsd || 0,
        monthlyUsageCreditsMaxUsd: plan?.monthlyUsageCreditsUsd || 0,
      },
      creditBalance: {
        used: usage?.monthlyUsageCreditsUsedUsd || 0,
        total: plan?.monthlyUsageCreditsUsd || 0,
        remaining: (plan?.monthlyUsageCreditsUsd || 0) - (usage?.monthlyUsageCreditsUsedUsd || 0),
        percentUsed: plan?.monthlyUsageCreditsUsd
          ? Math.round(((usage?.monthlyUsageCreditsUsedUsd || 0) / plan.monthlyUsageCreditsUsd) * 100)
          : 0,
      },
      recentRuns,
    });
  } catch (error) {
    console.error('[apify/usage] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
  }
}
