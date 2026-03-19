import { describe, it, expect } from 'vitest';
import { scoreItems, boostRelevance, type ScoredItem } from '@/lib/scoring';

/**
 * Simulates the Officeworks problem: TikTok results for "Officeworks" return
 * many irrelevant office/furniture videos alongside genuinely relevant ones.
 * The relevance filter should promote branded content and allow filtering
 * of high-engagement but off-topic items.
 */
describe('Relevance filtering (Officeworks scenario)', () => {
  // 5 relevant Officeworks items
  const relevantItems: Record<string, unknown>[] = [
    { text: 'Officeworks back to school haul 2025', playCount: 80000, diggCount: 4000, shareCount: 600, commentCount: 200, webVideoUrl: 'https://tiktok.com/v/r1', authorMeta: { name: 'student_life' } },
    { text: 'I work at Officeworks AMA', playCount: 150000, diggCount: 8000, shareCount: 1200, commentCount: 500, webVideoUrl: 'https://tiktok.com/v/r2', authorMeta: { name: 'retail_worker' } },
    { text: 'Officeworks price beat guarantee test', playCount: 40000, diggCount: 2000, shareCount: 300, commentCount: 100, webVideoUrl: 'https://tiktok.com/v/r3', authorMeta: { name: 'deal_hunter' } },
    { text: 'My officeworks stationery haul', playCount: 25000, diggCount: 1500, shareCount: 200, commentCount: 80, webVideoUrl: 'https://tiktok.com/v/r4', authorMeta: { name: 'stationery_addict' } },
    { text: 'Officeworks Australia tech deals', playCount: 60000, diggCount: 3000, shareCount: 400, commentCount: 150, webVideoUrl: 'https://tiktok.com/v/r5', authorMeta: { name: 'tech_bargains' } },
  ];

  // 15 irrelevant items (generic office/furniture content, no "officeworks")
  const irrelevantItems: Record<string, unknown>[] = [
    { text: 'My home office transformation', playCount: 500000, diggCount: 30000, shareCount: 5000, commentCount: 2000, webVideoUrl: 'https://tiktok.com/v/i1', authorMeta: { name: 'interior_inspo' } },
    { text: 'Office desk setup tour 2025', playCount: 400000, diggCount: 25000, shareCount: 4000, commentCount: 1500, webVideoUrl: 'https://tiktok.com/v/i2', authorMeta: { name: 'desk_guru' } },
    { text: 'Best office chairs under $500', playCount: 300000, diggCount: 18000, shareCount: 3000, commentCount: 1000, webVideoUrl: 'https://tiktok.com/v/i3', authorMeta: { name: 'ergo_expert' } },
    { text: 'Organizing my office supplies', playCount: 250000, diggCount: 15000, shareCount: 2500, commentCount: 800, webVideoUrl: 'https://tiktok.com/v/i4', authorMeta: { name: 'org_queen' } },
    { text: 'Office pranks compilation', playCount: 2000000, diggCount: 100000, shareCount: 20000, commentCount: 5000, webVideoUrl: 'https://tiktok.com/v/i5', authorMeta: { name: 'prankster' } },
    { text: 'IKEA office furniture haul', playCount: 350000, diggCount: 20000, shareCount: 3500, commentCount: 1200, webVideoUrl: 'https://tiktok.com/v/i6', authorMeta: { name: 'ikea_fan' } },
    { text: 'Work from home office ideas', playCount: 180000, diggCount: 10000, shareCount: 1800, commentCount: 600, webVideoUrl: 'https://tiktok.com/v/i7', authorMeta: { name: 'wfh_tips' } },
    { text: 'Day in my life at the office', playCount: 120000, diggCount: 6000, shareCount: 900, commentCount: 400, webVideoUrl: 'https://tiktok.com/v/i8', authorMeta: { name: 'corporate_life' } },
    { text: 'Cute stationery for your desk', playCount: 90000, diggCount: 5000, shareCount: 700, commentCount: 300, webVideoUrl: 'https://tiktok.com/v/i9', authorMeta: { name: 'cute_stuff' } },
    { text: 'Office makeover on a budget', playCount: 70000, diggCount: 3500, shareCount: 500, commentCount: 200, webVideoUrl: 'https://tiktok.com/v/i10', authorMeta: { name: 'budget_decor' } },
    { text: 'Best pens for journaling', playCount: 55000, diggCount: 2800, shareCount: 400, commentCount: 150, webVideoUrl: 'https://tiktok.com/v/i11', authorMeta: { name: 'pen_reviewer' } },
    { text: 'Corporate office tour NYC', playCount: 45000, diggCount: 2200, shareCount: 350, commentCount: 120, webVideoUrl: 'https://tiktok.com/v/i12', authorMeta: { name: 'office_tours' } },
    { text: 'Minimalist desk setup', playCount: 35000, diggCount: 1800, shareCount: 250, commentCount: 90, webVideoUrl: 'https://tiktok.com/v/i13', authorMeta: { name: 'minimal_desk' } },
    { text: 'Office snack haul', playCount: 20000, diggCount: 1000, shareCount: 150, commentCount: 60, webVideoUrl: 'https://tiktok.com/v/i14', authorMeta: { name: 'snack_lover' } },
    { text: 'Study with me at library', playCount: 15000, diggCount: 800, shareCount: 100, commentCount: 40, webVideoUrl: 'https://tiktok.com/v/i15', authorMeta: { name: 'study_buddy' } },
  ];

  const allItems = [...relevantItems, ...irrelevantItems];

  it('scores all 20 items', () => {
    const scored = scoreItems('tiktok', allItems);
    expect(scored).toHaveLength(20);
  });

  it('irrelevant viral items outscore relevant items before boosting', () => {
    const scored = scoreItems('tiktok', allItems);
    // The "Office pranks compilation" with 2M plays should score very high
    const prankItem = scored.find((i) => String(i.text).includes('pranks'));
    const officeworksHaul = scored.find((i) => String(i.text).includes('Officeworks back to school'));

    expect(prankItem).toBeDefined();
    expect(officeworksHaul).toBeDefined();
    // Without boosting, the viral irrelevant item scores higher
    expect(prankItem!._score).toBeGreaterThan(officeworksHaul!._score);
  });

  it('boostRelevance marks all 5 Officeworks items with _relevance_boost', () => {
    const scored = scoreItems('tiktok', allItems);
    const boosted = boostRelevance(scored, ['Officeworks', 'officeworks australia']);

    const boostedItems = boosted.filter((i) => (i as Record<string, unknown>)._relevance_boost !== undefined);
    expect(boostedItems).toHaveLength(5);

    // Verify these are exactly the Officeworks items
    for (const item of boostedItems) {
      expect(String(item.text).toLowerCase()).toContain('officeworks');
    }
  });

  it('irrelevant items do NOT receive _relevance_boost', () => {
    const scored = scoreItems('tiktok', allItems);
    const boosted = boostRelevance(scored, ['Officeworks', 'officeworks australia']);

    const unboostedItems = boosted.filter((i) => (i as Record<string, unknown>)._relevance_boost === undefined);
    expect(unboostedItems).toHaveLength(15);

    for (const item of unboostedItems) {
      expect(String(item.text).toLowerCase()).not.toContain('officeworks');
    }
  });

  it('after boosting, Officeworks items have higher scores', () => {
    const scored = scoreItems('tiktok', allItems);
    const boosted = boostRelevance(scored, ['Officeworks', 'officeworks australia']);

    const officeworksItems = boosted.filter((i) => (i as Record<string, unknown>)._relevance_boost !== undefined);

    // Each Officeworks item's boosted score should be at least 15 more than original
    for (const item of officeworksItems) {
      const boost = (item as Record<string, unknown>)._relevance_boost as number;
      expect(boost).toBeGreaterThanOrEqual(15);
    }
  });

  it('median filter logic: items without boost and below median would be filtered', () => {
    const scored = scoreItems('tiktok', allItems);
    const boosted = boostRelevance(scored, ['Officeworks', 'officeworks australia']);

    // Simulate median filter: compute median score of all items
    const allScores = boosted.map((i) => i._score).sort((a, b) => a - b);
    const mid = Math.floor(allScores.length / 2);
    const median = allScores.length % 2 === 0
      ? (allScores[mid - 1] + allScores[mid]) / 2
      : allScores[mid];

    // Items that would survive: boosted items OR items above median
    const surviving = boosted.filter(
      (i) => (i as Record<string, unknown>)._relevance_boost !== undefined || i._score >= median
    );

    // All 5 Officeworks items should survive regardless of their raw score
    const survivingOfficeworks = surviving.filter((i) =>
      String(i.text).toLowerCase().includes('officeworks')
    );
    expect(survivingOfficeworks).toHaveLength(5);

    // Some low-engagement irrelevant items should be filtered out
    const filteredOut = boosted.filter(
      (i) => (i as Record<string, unknown>)._relevance_boost === undefined && i._score < median
    );
    expect(filteredOut.length).toBeGreaterThan(0);
  });

  it('items matching multiple keywords get a larger boost', () => {
    const scored = scoreItems('tiktok', allItems);
    const boosted = boostRelevance(scored, ['Officeworks', 'officeworks australia']);

    // "Officeworks Australia tech deals" matches both "Officeworks" and "officeworks australia"
    const multiMatch = boosted.find((i) => String(i.text).includes('Australia tech deals'));
    const singleMatch = boosted.find((i) => String(i.text).includes('price beat guarantee'));

    expect(multiMatch).toBeDefined();
    expect(singleMatch).toBeDefined();

    const multiBoost = (multiMatch as Record<string, unknown>)._relevance_boost as number;
    const singleBoost = (singleMatch as Record<string, unknown>)._relevance_boost as number;

    // Multi-match should get a bigger boost (20 vs 15)
    expect(multiBoost).toBeGreaterThan(singleBoost);
  });
});
