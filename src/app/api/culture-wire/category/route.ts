import { NextRequest, NextResponse, after } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { getCategoryBySlug } from '@/lib/culture-wire/categories';
import { runCategoryCollection } from '@/lib/culture-wire/collector';
import { runAnalysisPipeline } from '@/lib/culture-wire/analyzer';
import type { BrandContext } from '@/lib/types';

export async function POST(request: NextRequest) {
  const { categorySlug, platforms = ['reddit', 'tiktok', 'youtube', 'instagram'] } = await request.json();

  const category = getCategoryBySlug(categorySlug);
  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServerClient();

  // Create search record with category type
  const { data: search, error } = await supabase
    .from('culture_wire_searches')
    .insert({
      user_id: session.sub,
      brand_name: category.name,
      search_type: 'category',
      category_slug: categorySlug,
      geo: category.geo_scope === 'au' ? 'AU' : 'US',
      platforms,
      status: 'collecting',
    })
    .select()
    .single();

  if (error || !search) {
    return NextResponse.json({ error: error?.message || 'Failed to create search' }, { status: 500 });
  }

  // Run collection + analysis in background
  after(async () => {
    const admin = createAdminClient();

    try {
      // Build a synthetic brand context from category data
      const categoryContext: BrandContext = {
        category: category.group,
        subcategory: category.name,
        brand_values: [],
        brand_pillars: [],
        tone: 'observational, trend-focused',
        competitors: [],
        keywords: {
          brand: category.keywords.slice(0, 5),
          category: category.keywords.slice(5, 10),
          trending: category.keywords.slice(10),
        },
      };

      await admin
        .from('culture_wire_searches')
        .update({ brand_context: categoryContext })
        .eq('id', search.id);

      // Run category collection (uses category keywords directly)
      await runCategoryCollection(
        search.id,
        category,
        platforms,
        50
      );

      await admin
        .from('culture_wire_searches')
        .update({ status: 'analyzing' })
        .eq('id', search.id);

      await runAnalysisPipeline(search.id, category.name, categoryContext);
    } catch (err) {
      console.error('[culture-wire/category] Pipeline failed:', err);
      await admin
        .from('culture_wire_searches')
        .update({
          status: 'failed',
          result_summary: { error: err instanceof Error ? err.message : 'Unknown error' },
        })
        .eq('id', search.id);
    }
  });

  return NextResponse.json({ search }, { status: 201 });
}
