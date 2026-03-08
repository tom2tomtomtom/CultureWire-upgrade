import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

// Common words to skip when extracting keywords from objectives
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'must',
  'that', 'which', 'who', 'whom', 'this', 'these', 'those', 'it', 'its',
  'how', 'what', 'when', 'where', 'why', 'not', 'no', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'than', 'too', 'very', 'just', 'about', 'above', 'after', 'again',
  'also', 'any', 'because', 'before', 'between', 'into', 'over',
  'under', 'until', 'up', 'down', 'out', 'off', 'then', 'there',
  'through', 'during', 'while', 'so', 'if', 'only', 'own', 'same',
  'research', 'analyze', 'analyse', 'understand', 'explore', 'investigate',
  'find', 'look', 'around', 'across', 'within', 'among',
]);

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  // Return unique keywords, prioritizing longer words (more specific)
  const unique = [...new Set(words)];
  unique.sort((a, b) => b.length - a.length);
  return unique.slice(0, 4);
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const objective = searchParams.get('objective');

  if (!objective || objective.trim().length === 0) {
    return NextResponse.json({ error: 'objective is required' }, { status: 400 });
  }

  const keywords = extractKeywords(objective);

  if (keywords.length === 0) {
    return NextResponse.json({ similar: [] });
  }

  const supabase = await createServerClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Build OR filter for keyword matching on research_specs.objective
  // Use individual queries per keyword and merge results
  const allMatches = new Map<string, any>();

  for (const keyword of keywords) {
    const { data: specs } = await supabase
      .from('research_specs')
      .select('id, project_id, objective, created_at')
      .ilike('objective', `%${keyword}%`)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (specs) {
      for (const spec of specs) {
        if (!allMatches.has(spec.project_id)) {
          allMatches.set(spec.project_id, spec);
        }
      }
    }
  }

  if (allMatches.size === 0) {
    return NextResponse.json({ similar: [] });
  }

  // Fetch project details for matched specs
  const projectIds = [...allMatches.keys()];
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, created_at, user_id, status')
    .in('id', projectIds)
    .eq('status', 'complete');

  const similar: Array<{
    id: string;
    title: string;
    objective: string;
    created_at: string;
    is_own: boolean;
  }> = [];

  if (projects) {
    for (const project of projects) {
      const spec = allMatches.get(project.id);
      similar.push({
        id: project.id,
        title: project.title,
        objective: spec?.objective || '',
        created_at: project.created_at,
        is_own: project.user_id === session.sub,
      });
    }
  }

  // Sort by most recent first
  similar.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ similar: similar.slice(0, 10) });
}
