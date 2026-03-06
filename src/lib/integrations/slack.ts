const SLACK_API = 'https://slack.com/api';

interface SlackInstallation {
  team_id: string;
  team_name: string;
  access_token: string;
  channel_id: string;
  channel_name: string;
}

export function getSlackInstallUrl(): string {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : 'http://localhost:3000'}/api/integrations/slack/callback`;
  const scopes = 'chat:write,channels:read';
  return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export async function exchangeCodeForToken(code: string): Promise<SlackInstallation> {
  const res = await fetch(`${SLACK_API}/oauth.v2.access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID || '',
      client_secret: process.env.SLACK_CLIENT_SECRET || '',
      code,
    }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(`Slack OAuth error: ${data.error}`);

  return {
    team_id: data.team.id,
    team_name: data.team.name,
    access_token: data.access_token,
    channel_id: data.incoming_webhook?.channel_id || '',
    channel_name: data.incoming_webhook?.channel || '',
  };
}

export async function sendSlackMessage(
  accessToken: string,
  channelId: string,
  text: string,
  blocks?: Record<string, unknown>[]
): Promise<void> {
  const res = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel: channelId, text, blocks }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(`Slack send error: ${data.error}`);
}

export function formatSearchResultsForSlack(
  brandName: string,
  opportunities: { title: string; score: number; tier: string }[],
  searchId: string
): { text: string; blocks: Record<string, unknown>[] } {
  const text = `CultureWire Report: ${brandName} — ${opportunities.length} opportunities found`;
  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `CultureWire: ${brandName}` },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${opportunities.length} opportunities* identified across platforms`,
      },
    },
    ...opportunities.slice(0, 5).map((o) => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${o.tier}* — ${o.title} (Score: ${o.score}/100)`,
      },
    })),
  ];

  return { text, blocks };
}
