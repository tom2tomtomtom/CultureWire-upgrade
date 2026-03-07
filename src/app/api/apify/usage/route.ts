import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

const APIFY_BASE = 'https://api.apify.com/v2';

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
    // Fetch account info and monthly usage in parallel
    const [userRes, usageRes] = await Promise.all([
      fetch(`${APIFY_BASE}/users/me?token=${apiKey}`),
      fetch(`${APIFY_BASE}/users/me/usage/monthly?token=${apiKey}`),
    ]);

    if (!userRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch Apify account info' }, { status: 502 });
    }

    const userData = await userRes.json();
    const plan = userData.data?.plan;
    const monthlyBudget = plan?.monthlyUsageCreditsUsd || 0;

    // Calculate total used from monthly usage breakdown
    let totalUsed = 0;
    const usageBreakdown: Record<string, number> = {};

    if (usageRes.ok) {
      const usageData = await usageRes.json();
      const services = usageData.data?.monthlyServiceUsage || {};
      for (const [key, val] of Object.entries(services)) {
        const amt = (val as Record<string, number>)?.amountAfterVolumeDiscountUsd || 0;
        totalUsed += amt;
        if (amt > 0.001) {
          usageBreakdown[key] = Math.round(amt * 100) / 100;
        }
      }
    }

    const remaining = monthlyBudget - totalUsed;

    return NextResponse.json({
      plan: {
        name: plan?.id || 'Unknown',
        monthlyBudget,
      },
      creditBalance: {
        used: Math.round(totalUsed * 100) / 100,
        total: monthlyBudget,
        remaining: Math.round(remaining * 100) / 100,
        percentUsed: monthlyBudget
          ? Math.round((totalUsed / monthlyBudget) * 100)
          : 0,
      },
      usageBreakdown,
    });
  } catch (error) {
    console.error('[apify/usage] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
  }
}
