import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ACTOR_REGISTRY, type PlannerParams } from '@/lib/actor-registry';
import { estimateActorCost } from '@/lib/cost';
import type { Platform, PlannedActorRun, ResearchSpec } from '@/lib/types';

// ============================================
// GEO NORMALIZATION
// ============================================
// The planner AI may produce free-text like "UK (primary), Romania, ..."
// but Apify actors need 2-letter ISO country codes.

const COUNTRY_TO_ISO: Record<string, string> = {
  'united states': 'US', 'usa': 'US', 'us': 'US', 'america': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'gb': 'GB', 'britain': 'GB', 'england': 'GB',
  'germany': 'DE', 'de': 'DE', 'france': 'FR', 'fr': 'FR',
  'italy': 'IT', 'it': 'IT', 'spain': 'ES', 'es': 'ES',
  'canada': 'CA', 'ca': 'CA', 'australia': 'AU', 'au': 'AU',
  'brazil': 'BR', 'br': 'BR', 'india': 'IN', 'in': 'IN',
  'japan': 'JP', 'jp': 'JP', 'china': 'CN', 'cn': 'CN',
  'mexico': 'MX', 'mx': 'MX', 'south korea': 'KR', 'korea': 'KR',
  'netherlands': 'NL', 'nl': 'NL', 'sweden': 'SE', 'se': 'SE',
  'switzerland': 'CH', 'ch': 'CH', 'ireland': 'IE', 'ie': 'IE',
  'poland': 'PL', 'pl': 'PL', 'romania': 'RO', 'ro': 'RO',
  'serbia': 'RS', 'rs': 'RS', 'portugal': 'PT', 'pt': 'PT',
  'belgium': 'BE', 'be': 'BE', 'austria': 'AT', 'at': 'AT',
  'norway': 'NO', 'no': 'NO', 'denmark': 'DK', 'dk': 'DK',
  'finland': 'FI', 'fi': 'FI', 'new zealand': 'NZ', 'nz': 'NZ',
  'singapore': 'SG', 'sg': 'SG', 'south africa': 'ZA', 'za': 'ZA',
  'uae': 'AE', 'united arab emirates': 'AE',
  'global': '', 'worldwide': '',
};

function normalizeGeo(raw: string): string {
  if (!raw) return 'US';
  // Already a 2-letter code?
  const trimmed = raw.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(trimmed)) return trimmed;
  // Try to extract the first recognizable country from a comma-separated or descriptive string
  const lower = raw.toLowerCase();
  // Remove parenthetical notes like "(primary)"
  const cleaned = lower.replace(/\([^)]*\)/g, '');
  // Split on commas and try each token
  const tokens = cleaned.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
  for (const token of tokens) {
    if (COUNTRY_TO_ISO[token] !== undefined) return COUNTRY_TO_ISO[token] || 'US';
  }
  // Try matching anywhere in the full string
  for (const [name, code] of Object.entries(COUNTRY_TO_ISO)) {
    if (name.length > 2 && lower.includes(name)) return code || 'US';
  }
  return 'US';
}

// ============================================
// THREE-LAYER COLLECTION STRATEGY
// ============================================
// Layer 1 (Brand/Direct): Competitor-specific searches — what people say about specific brands
// Layer 2 (Category): Research keyword searches — the broader category conversation
// Layer 3 (Discovery): Trending/hot content — what's culturally relevant right now
//
// This mirrors the Uncommon plugin's collection approach for richer, more diverse data.

/**
 * Extract the subject brand/topic from the research objective.
 * E.g., "Understand Gen Z brand sentiment toward KFC in Australia" → ["KFC"]
 */
function extractSubjectFromObjective(objective: string): string[] {
  if (!objective) return [];
  // Remove common research phrasing to isolate the subject
  const cleaned = objective
    .replace(/understand|analyze|research|explore|investigate|examine|assess|evaluate|map|track|monitor|compare|measure/gi, '')
    .replace(/\b(how|what|why|the|and|for|in|of|to|a|an|is|are|do|does|over|last|next|past|months?|years?|weeks?|brand|sentiment|toward|towards|among|consumers?|perception|awareness|engagement|conversation|discourse|landscape|trends?|opportunities?|gen\s*z|millennials?|boomers?|audience|target|australian?|americans?|global|online)\b/gi, '')
    .trim();
  // Split and keep words that look like proper nouns (capitalized) or are 3+ chars
  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map((w) => w.replace(/[,.:;!?'"]+/g, ''))
    .filter(Boolean);
  return [...new Set(words)];
}

function buildLayeredRuns(
  platform: Platform,
  spec: ResearchSpec
): PlannedActorRun[] {
  const entry = ACTOR_REGISTRY[platform];
  if (!entry) return [];

  const geo = normalizeGeo(spec.geographic_focus || 'US');
  const timeRange = spec.time_horizon || 'last 6 months';
  const brands = spec.competitors;
  const keywords = spec.keywords;

  // Extract the research subject and ensure it's always searched for
  const subjectBrands = extractSubjectFromObjective(spec.objective);
  // Combine subject + competitors for brand layer, with subject first
  const allBrands = [...new Set([...subjectBrands, ...brands])];
  const hashtags = keywords.map((k) => k.replace(/\s+/g, ''));
  const runs: PlannedActorRun[] = [];

  function addRun(
    layerLabel: string,
    params: PlannerParams,
    rationale: string,
    resultOverride?: number
  ) {
    const inputParams = entry.buildInput(params);
    const resultCount = resultOverride || params.maxResults;
    const costCents = estimateActorCost(platform, resultCount);
    runs.push({
      platform,
      actorId: entry.id,
      displayName: entry.displayName,
      inputParams,
      estimatedCostCents: costCents,
      estimatedResults: resultCount,
      rationale: `[${layerLabel}] ${rationale}`,
    });
  }

  switch (platform) {
    case 'reddit': {
      // Reddit is free — be generous with layers

      // Layer 1a: Subject-specific search (always — this is the core)
      if (subjectBrands.length > 0) {
        addRun('Subject', {
          keywords: subjectBrands,
          brands: allBrands, subreddits: [], hashtags: [], urls: [],
          geo, timeRange, maxResults: 50,
        }, `Subject-specific conversations about ${subjectBrands.join(', ')}`, 50);
      }

      // Layer 1b: Competitor mentions (if competitors exist)
      if (brands.length > 0) {
        addRun('Brand', {
          keywords: brands,
          brands, subreddits: [], hashtags: [], urls: [],
          geo, timeRange, maxResults: 50,
        }, `Competitor conversations about ${brands.join(', ')}`, 50);
      }

      // Layer 2: Category keywords — the core research topic
      addRun('Category', {
        keywords,
        brands: allBrands, subreddits: [], hashtags: [], urls: [],
        geo, timeRange, maxResults: 80,
      }, `Category conversations: ${keywords.slice(0, 3).join(', ')}`, 80);

      // Layer 3: Discovery — trending/hot posts in the space
      const discoveryParams: PlannerParams = {
        keywords,
        brands: allBrands, subreddits: [], hashtags: [], urls: [],
        geo, timeRange, maxResults: 50,
      };
      const discoveryInput = entry.buildInput(discoveryParams);
      // Override sort to 'hot' for trending discovery
      (discoveryInput as Record<string, unknown>).sort = 'hot';
      runs.push({
        platform,
        actorId: entry.id,
        displayName: entry.displayName,
        inputParams: discoveryInput,
        estimatedCostCents: 0,
        estimatedResults: 50,
        rationale: '[Discovery] Trending/hot conversations to catch cultural momentum',
      });
      break;
    }

    case 'youtube': {
      // Layer 1a: Subject-specific videos (always)
      if (subjectBrands.length > 0) {
        addRun('Subject', {
          keywords: subjectBrands.map((b) => `${b} review`),
          brands: allBrands, subreddits: [], hashtags: [], urls: [],
          geo, timeRange, maxResults: 50,
        }, `Subject-focused content: ${subjectBrands.join(', ')} reviews`, 50);
      }

      // Layer 1b: Competitor videos (if competitors exist)
      if (brands.length > 0) {
        addRun('Brand', {
          keywords: brands.slice(0, 3).map((b) => `${b} review`),
          brands, subreddits: [], hashtags: [], urls: [],
          geo, timeRange, maxResults: 40,
        }, `Competitor content: ${brands.slice(0, 3).join(', ')} reviews`, 40);
      }

      // Layer 2: Category keyword search
      addRun('Category', {
        keywords: keywords.slice(0, 3),
        brands: allBrands, subreddits: [], hashtags: [], urls: [],
        geo, timeRange, maxResults: 60,
      }, `Category content: ${keywords.slice(0, 3).join(', ')}`, 60);

      // Layer 3: Popular/trending — sort by viewCount
      const trendingParams: PlannerParams = {
        keywords: keywords.slice(0, 2),
        brands: allBrands, subreddits: [], hashtags: [], urls: [],
        geo, timeRange, maxResults: 40,
      };
      const trendingInput = entry.buildInput(trendingParams);
      (trendingInput as Record<string, unknown>).order = 'viewCount';
      runs.push({
        platform,
        actorId: entry.id,
        displayName: entry.displayName,
        inputParams: trendingInput,
        estimatedCostCents: estimateActorCost(platform, 40),
        estimatedResults: 40,
        rationale: '[Discovery] Most-viewed content to identify dominant narratives',
      });
      break;
    }

    case 'tiktok': {
      // Layer 1: Subject-specific content (always)
      if (subjectBrands.length > 0) {
        addRun('Subject', {
          keywords: subjectBrands,
          brands: allBrands, subreddits: [], hashtags: [],
          urls: [], geo, timeRange, maxResults: 60,
        }, `Subject searches: ${subjectBrands.join(', ')}`, 60);
      }

      // Layer 2: Keyword search — category topic content
      addRun('Category', {
        keywords,
        brands: allBrands, subreddits: [], hashtags: [],
        urls: [], geo, timeRange, maxResults: 60,
      }, `Topic searches: ${keywords.slice(0, 3).join(', ')}`, 60);

      // Layer 3: Hashtag discovery — cultural conversation
      const subjectHashtags = subjectBrands.map((b) => b.replace(/\s+/g, '').toLowerCase());
      const trendingHashtags = [
        ...subjectHashtags,
        ...hashtags,
        ...(brands.length > 0 ? brands.map((b) => b.replace(/\s+/g, '').toLowerCase()) : []),
      ];
      addRun('Discovery', {
        keywords: [],
        brands: allBrands, subreddits: [],
        hashtags: [...new Set(trendingHashtags)],
        urls: [], geo, timeRange, maxResults: 60,
      }, `Hashtag discovery: #${[...new Set(trendingHashtags)].slice(0, 3).join(', #')}`, 60);
      break;
    }

    case 'trustpilot': {
      // Trustpilot is URL-based per brand — no layering, just one run
      if (brands.length > 0) {
        addRun('Brand', {
          keywords, brands, subreddits: [], hashtags: [], urls: [],
          geo, timeRange, maxResults: entry.defaults.maxResults,
        }, `Reviews for ${brands.join(', ')}`, entry.defaults.maxResults);
      }
      break;
    }

    case 'google_trends': {
      // Google Trends already provides trend data — one run is sufficient
      addRun('Category', {
        keywords: keywords.slice(0, 5),
        brands, subreddits: [], hashtags: [], urls: [],
        geo, timeRange, maxResults: entry.defaults.maxResults,
      }, `Trend analysis for: ${keywords.slice(0, 5).join(', ')}`, entry.defaults.maxResults);
      break;
    }

    case 'instagram': {
      // Layer 1: Subject-specific hashtags (always)
      if (subjectBrands.length > 0) {
        const subjectHashtags = subjectBrands.map((b) => b.replace(/\s+/g, '').toLowerCase());
        addRun('Subject', {
          keywords: subjectBrands,
          brands: allBrands, subreddits: [],
          hashtags: subjectHashtags,
          urls: [], geo, timeRange, maxResults: 60,
        }, `Subject content: #${subjectHashtags.join(', #')}`, 60);
      }

      // Layer 2: Category hashtag search
      addRun('Category', {
        keywords,
        brands: allBrands, subreddits: [],
        hashtags,
        urls: [], geo, timeRange, maxResults: 60,
      }, `Hashtag posts: #${hashtags.slice(0, 3).join(', #')}`, 60);

      // Layer 3: Competitor profiles (if competitors exist)
      if (brands.length > 0) {
        const brandHashtags = brands.map((b) => b.replace(/\s+/g, '').toLowerCase());
        addRun('Brand', {
          keywords: [],
          brands, subreddits: [],
          hashtags: brandHashtags,
          urls: [], geo, timeRange, maxResults: 40,
        }, `Competitor content: #${brandHashtags.slice(0, 3).join(', #')}`, 40);
      }
      break;
    }
  }

  return runs;
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const supabase = await createServerClient();

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
  console.log('[plan] POST called for project:', projectId);

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Load latest research spec
  const { data: spec, error: specError } = await supabase
    .from('research_specs')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  console.log('[plan] Spec lookup:', spec ? `found (${spec.id})` : 'not found', specError?.message || '');

  if (specError || !spec) {
    return NextResponse.json({ error: 'No research spec found' }, { status: 404 });
  }

  const researchSpec = spec as ResearchSpec;

  // Build three-layer execution plan from spec
  const plannedRuns: PlannedActorRun[] = [];

  for (const platform of researchSpec.platforms) {
    const layeredRuns = buildLayeredRuns(platform as Platform, researchSpec);
    plannedRuns.push(...layeredRuns);
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

  console.log('[plan] Insert result:', plan ? `success (${plan.id})` : 'failed', planError?.message || '');

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

  const supabase = await createServerClient();

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
