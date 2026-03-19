import { describe, it, expect } from 'vitest';
import {
  normalizeItems,
  scoreItems,
  boostRelevance,
  buildScoredItemsSummary,
  type ScoredItem,
} from '@/lib/scoring';

// ---------------------------------------------------------------------------
// normalizeItems
// ---------------------------------------------------------------------------
describe('normalizeItems', () => {
  describe('YouTube', () => {
    it('maps viewCount, likeCount, commentCount from top-level fields', () => {
      const items = [{ views: 5000, likes: 200, commentsCount: 30, title: 'My Video' }];
      const [result] = normalizeItems('youtube', items);
      expect(result.viewCount).toBe(5000);
      expect(result.likeCount).toBe(200);
      expect(result.commentCount).toBe(30);
      expect(result.title).toBe('My Video');
    });

    it('maps from nested statistics object', () => {
      const items = [
        {
          statistics: { viewCount: '12000', likeCount: '800', commentCount: '45' },
          snippet: { title: 'Snippet Title', channelTitle: 'My Channel' },
        },
      ];
      const [result] = normalizeItems('youtube', items);
      expect(result.viewCount).toBe(12000);
      expect(result.likeCount).toBe(800);
      expect(result.commentCount).toBe(45);
      expect(result.title).toBe('Snippet Title');
      expect(result.channelTitle).toBe('My Channel');
    });

    it('maps channelName to channelTitle (grow_media actor)', () => {
      const items = [{ channelName: 'GrowChannel', date: '2025-01-01' }];
      const [result] = normalizeItems('youtube', items);
      expect(result.channelTitle).toBe('GrowChannel');
      expect(result.publishedAt).toBe('2025-01-01');
    });

    it('defaults missing numeric fields to 0', () => {
      const items = [{}];
      const [result] = normalizeItems('youtube', items);
      expect(result.viewCount).toBe(0);
      expect(result.likeCount).toBe(0);
      expect(result.commentCount).toBe(0);
    });
  });

  describe('Instagram', () => {
    it('maps likesCount, commentsCount from standard fields', () => {
      const items = [{ likesCount: 300, commentsCount: 25, caption: 'Hello IG' }];
      const [result] = normalizeItems('instagram', items);
      expect(result.likesCount).toBe(300);
      expect(result.commentsCount).toBe(25);
      expect(result.caption).toBe('Hello IG');
    });

    it('maps from alternative field names (likes, comments)', () => {
      const items = [{ likes: 150, comments: 10, text: 'Alt fields' }];
      const [result] = normalizeItems('instagram', items);
      expect(result.likesCount).toBe(150);
      expect(result.commentsCount).toBe(10);
      expect(result.caption).toBe('Alt fields');
    });

    it('detects hashtag metadata and returns _isHashtagMeta flag', () => {
      const items = [{ postsCount: 500000, name: 'fitness', url: 'https://instagram.com/explore/tags/fitness' }];
      const [result] = normalizeItems('instagram', items);
      expect(result._isHashtagMeta).toBe(true);
      expect(result._postsCount).toBe(500000);
      expect(result.likesCount).toBe(0);
      expect(result.commentsCount).toBe(0);
      expect(String(result.caption)).toContain('#fitness');
    });

    it('maps ownerUsername from alternative fields', () => {
      const items = [{ username: 'user123', likesCount: 10 }];
      const [result] = normalizeItems('instagram', items);
      expect(result.ownerUsername).toBe('user123');
    });
  });

  describe('TikTok', () => {
    it('maps playCount, diggCount, shareCount from stats object', () => {
      const items = [
        {
          stats: { playCount: 100000, diggCount: 5000, shareCount: 800, commentCount: 200 },
          text: 'TikTok caption',
          authorMeta: { name: 'creator1' },
        },
      ];
      const [result] = normalizeItems('tiktok', items);
      expect(result.playCount).toBe(100000);
      expect(result.diggCount).toBe(5000);
      expect(result.shareCount).toBe(800);
      expect(result.commentCount).toBe(200);
      expect(result.text).toBe('TikTok caption');
    });

    it('maps from top-level fields when stats is absent', () => {
      const items = [{ playCount: 50000, diggCount: 2000, shareCount: 300 }];
      const [result] = normalizeItems('tiktok', items);
      expect(result.playCount).toBe(50000);
      expect(result.diggCount).toBe(2000);
      expect(result.shareCount).toBe(300);
    });

    it('maps desc to text', () => {
      const items = [{ desc: 'Description text' }];
      const [result] = normalizeItems('tiktok', items);
      expect(result.text).toBe('Description text');
    });

    it('maps webVideoUrl from url field', () => {
      const items = [{ url: 'https://tiktok.com/video/123' }];
      const [result] = normalizeItems('tiktok', items);
      expect(result.webVideoUrl).toBe('https://tiktok.com/video/123');
    });
  });

  describe('unknown platform', () => {
    it('returns items unchanged', () => {
      const items = [{ foo: 'bar' }];
      const result = normalizeItems('unknown_platform', items);
      expect(result).toEqual(items);
    });
  });
});

// ---------------------------------------------------------------------------
// scoreItems
// ---------------------------------------------------------------------------
describe('scoreItems', () => {
  it('returns empty array for empty input', () => {
    expect(scoreItems('reddit', [])).toEqual([]);
    expect(scoreItems('youtube', [])).toEqual([]);
    expect(scoreItems('tiktok', [])).toEqual([]);
    expect(scoreItems('instagram', [])).toEqual([]);
  });

  describe('Reddit', () => {
    it('scores items with score and numberOfComments', () => {
      const items = [
        { score: 500, numberOfComments: 120, title: 'Hot post', upvoteRatio: 0.95, permalink: '/r/test/abc' },
        { score: 10, numberOfComments: 2, title: 'Cold post', upvoteRatio: 0.55, permalink: '/r/test/xyz' },
      ];
      const scored = scoreItems('reddit', items);

      expect(scored).toHaveLength(2);
      scored.forEach((item) => {
        expect(item._score).toBeGreaterThanOrEqual(0);
        expect(item._score).toBeLessThanOrEqual(100);
        expect(item._tier).toBeDefined();
        expect(item._platform_metric).toBeDefined();
      });

      // Higher engagement should yield higher score
      expect(scored[0]._score).toBeGreaterThan(scored[1]._score);
    });

    it('builds reddit URL from permalink', () => {
      const items = [{ score: 100, numberOfComments: 10, permalink: '/r/test/comments/abc', author: 'testuser' }];
      const [result] = scoreItems('reddit', items);
      expect(result._url).toBe('https://reddit.com/r/test/comments/abc');
      expect(result._creator).toBe('u/testuser');
    });
  });

  describe('YouTube', () => {
    it('scores items with viewCount and likeCount', () => {
      const items = [
        { viewCount: 1000000, likeCount: 50000, commentCount: 3000, id: 'abc123', title: 'Viral', channelTitle: 'Creator' },
        { viewCount: 100, likeCount: 2, commentCount: 0, id: 'xyz789', title: 'Flop', channelTitle: 'Nobody' },
      ];
      const scored = scoreItems('youtube', items);

      expect(scored).toHaveLength(2);
      expect(scored[0]._score).toBeGreaterThan(scored[1]._score);
      expect(scored[0]._url).toBe('https://youtube.com/watch?v=abc123');
      expect(scored[0]._thumbnail).toContain('abc123');
      expect(scored[0]._creator).toBe('Creator');
      expect(scored[0]._engagement_rate).toBeTypeOf('number');
    });
  });

  describe('TikTok', () => {
    it('scores items with playCount and shareCount', () => {
      const items = [
        { playCount: 5000000, diggCount: 300000, shareCount: 50000, commentCount: 10000, text: 'Viral TT', webVideoUrl: 'https://tiktok.com/v/1', authorMeta: { name: 'star' } },
        { playCount: 500, diggCount: 5, shareCount: 0, commentCount: 1, text: 'Quiet TT', webVideoUrl: 'https://tiktok.com/v/2', authorMeta: { name: 'new' } },
      ];
      const scored = scoreItems('tiktok', items);

      expect(scored).toHaveLength(2);
      expect(scored[0]._score).toBeGreaterThan(scored[1]._score);
      expect(scored[0]._creator).toBe('@star');
      expect(scored[0]._url).toBe('https://tiktok.com/v/1');
    });
  });

  describe('Instagram', () => {
    it('scores items with likesCount and commentsCount', () => {
      const items = [
        { likesCount: 10000, commentsCount: 500, url: 'https://instagram.com/p/abc', ownerUsername: 'popular', caption: 'Big post' },
        { likesCount: 5, commentsCount: 0, url: 'https://instagram.com/p/xyz', ownerUsername: 'quiet', caption: 'Small post' },
      ];
      const scored = scoreItems('instagram', items);

      expect(scored).toHaveLength(2);
      expect(scored[0]._score).toBeGreaterThan(scored[1]._score);
      expect(scored[0]._creator).toBe('@popular');
    });
  });

  describe('all platforms', () => {
    it('all scores are 0-100 and tiers follow the correct thresholds', () => {
      const platforms: Array<{ name: string; items: Record<string, unknown>[] }> = [
        { name: 'reddit', items: Array.from({ length: 10 }, (_, i) => ({ score: i * 100, numberOfComments: i * 10, upvoteRatio: 0.5 + i * 0.05 })) },
        { name: 'youtube', items: Array.from({ length: 10 }, (_, i) => ({ viewCount: i * 10000, likeCount: i * 500, commentCount: i * 50, id: `v${i}` })) },
        { name: 'tiktok', items: Array.from({ length: 10 }, (_, i) => ({ playCount: i * 50000, diggCount: i * 2000, shareCount: i * 500, commentCount: i * 100, text: `tt${i}` })) },
        { name: 'instagram', items: Array.from({ length: 10 }, (_, i) => ({ likesCount: i * 1000, commentsCount: i * 50, caption: `ig${i}` })) },
      ];

      for (const { name, items } of platforms) {
        const scored = scoreItems(name, items);
        for (const item of scored) {
          expect(item._score).toBeGreaterThanOrEqual(0);
          expect(item._score).toBeLessThanOrEqual(100);

          if (item._score >= 80) expect(item._tier).toBe('STRIKE ZONE');
          else if (item._score >= 65) expect(item._tier).toBe('OPPORTUNITY');
          else if (item._score >= 50) expect(item._tier).toBe('MONITOR');
          else expect(item._tier).toBe('SKIP');
        }
      }
    });
  });

  describe('unknown platform', () => {
    it('assigns score 50 and MONITOR tier to all items', () => {
      const items = [{ title: 'something' }, { keyword: 'other' }];
      const scored = scoreItems('unknown', items);
      scored.forEach((item) => {
        expect(item._score).toBe(50);
        expect(item._tier).toBe('MONITOR');
      });
    });
  });
});

// ---------------------------------------------------------------------------
// boostRelevance
// ---------------------------------------------------------------------------
describe('boostRelevance', () => {
  function makeScoredItem(overrides: Partial<ScoredItem> = {}): ScoredItem {
    return {
      _score: 50,
      _tier: 'MONITOR',
      _url: null,
      _thumbnail: null,
      _creator: null,
      _title: null,
      _engagement_rate: null,
      _platform_metric: null,
      ...overrides,
    };
  }

  it('boosts items matching 1 keyword by +15', () => {
    const items = [makeScoredItem({ title: 'Officeworks sale this week', _title: 'Officeworks sale this week' })];
    const boosted = boostRelevance(items, ['Officeworks']);
    expect(boosted[0]._score).toBe(65);
    expect(boosted[0]._relevance_boost).toBe(15);
  });

  it('boosts items matching 3 keywords by +25 (15 + 5 + 5)', () => {
    const items = [
      makeScoredItem({
        title: 'Officeworks back to school deal in Australia',
        _title: 'Officeworks back to school deal in Australia',
        description: 'Officeworks Australia sale',
      }),
    ];
    const boosted = boostRelevance(items, ['Officeworks', 'back to school', 'Australia']);
    expect(boosted[0]._score).toBe(75);
    expect(boosted[0]._relevance_boost).toBe(25);
  });

  it('does not boost items with no keyword matches', () => {
    const items = [makeScoredItem({ title: 'Random furniture store', _title: 'Random furniture store' })];
    const boosted = boostRelevance(items, ['Officeworks']);
    expect(boosted[0]._score).toBe(50);
    expect((boosted[0] as Record<string, unknown>)._relevance_boost).toBeUndefined();
  });

  it('caps boosted score at 100', () => {
    const items = [makeScoredItem({ _score: 95, title: 'Officeworks mega deal', _title: 'Officeworks mega deal' })];
    const boosted = boostRelevance(items, ['Officeworks']);
    expect(boosted[0]._score).toBe(100);
  });

  it('keywords are case-insensitive', () => {
    const items = [makeScoredItem({ title: 'OFFICEWORKS BIG SALE', _title: 'OFFICEWORKS BIG SALE' })];
    const boosted = boostRelevance(items, ['officeworks']);
    expect(boosted[0]._relevance_boost).toBe(15);
  });

  it('returns items unchanged when keywords array is empty', () => {
    const items = [makeScoredItem({ title: 'anything', _title: 'anything' })];
    const boosted = boostRelevance(items, []);
    expect(boosted[0]._score).toBe(50);
    expect((boosted[0] as Record<string, unknown>)._relevance_boost).toBeUndefined();
  });

  it('updates tier label after boost', () => {
    // Score 60 (MONITOR) + 15 boost = 75 (OPPORTUNITY)
    const items = [makeScoredItem({ _score: 60, _tier: 'MONITOR', title: 'Officeworks', _title: 'Officeworks' })];
    const boosted = boostRelevance(items, ['Officeworks']);
    expect(boosted[0]._score).toBe(75);
    expect(boosted[0]._tier).toBe('OPPORTUNITY');
  });

  it('matches keywords in body, caption, and description fields', () => {
    const bodyItem = makeScoredItem({ body: 'Check out Officeworks' });
    const captionItem = makeScoredItem({ caption: 'Love Officeworks stationery' });
    const descItem = makeScoredItem({ description: 'Officeworks has great prices' });

    const boosted = boostRelevance([bodyItem, captionItem, descItem], ['Officeworks']);
    boosted.forEach((item) => {
      expect(item._relevance_boost).toBe(15);
    });
  });
});

// ---------------------------------------------------------------------------
// buildScoredItemsSummary
// ---------------------------------------------------------------------------
describe('buildScoredItemsSummary', () => {
  function makeScoredItem(overrides: Partial<ScoredItem> = {}): ScoredItem {
    return {
      _score: 50,
      _tier: 'MONITOR',
      _url: null,
      _thumbnail: null,
      _creator: null,
      _title: 'Test item',
      _engagement_rate: null,
      _platform_metric: '100 views',
      ...overrides,
    };
  }

  it('returns empty string for empty array', () => {
    expect(buildScoredItemsSummary('reddit', [])).toBe('');
  });

  it('returns markdown table with headers for non-empty input', () => {
    const items = [
      makeScoredItem({ _score: 85, _tier: 'STRIKE ZONE', _title: 'Top post', _creator: 'u/user1', _platform_metric: '500 upvotes' }),
      makeScoredItem({ _score: 40, _tier: 'SKIP', _title: 'Low post', _creator: 'u/user2', _platform_metric: '5 upvotes' }),
    ];
    const summary = buildScoredItemsSummary('reddit', items);

    expect(summary).toContain('TOP SCORED ITEMS');
    expect(summary).toContain('reddit');
    expect(summary).toContain('| # | Score | Tier | Title | Creator | Metric |');
    expect(summary).toContain('|---|-------|------|-------|---------|--------|');
    expect(summary).toContain('Top post');
    expect(summary).toContain('Low post');
  });

  it('includes tier distribution', () => {
    const items = [
      makeScoredItem({ _score: 90, _tier: 'STRIKE ZONE' }),
      makeScoredItem({ _score: 85, _tier: 'STRIKE ZONE' }),
      makeScoredItem({ _score: 70, _tier: 'OPPORTUNITY' }),
      makeScoredItem({ _score: 30, _tier: 'SKIP' }),
    ];
    const summary = buildScoredItemsSummary('tiktok', items);

    expect(summary).toContain('Tier distribution');
    expect(summary).toContain('STRIKE ZONE: 2');
    expect(summary).toContain('OPPORTUNITY: 1');
    expect(summary).toContain('SKIP: 1');
  });

  it('limits output to top 15 items', () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      makeScoredItem({ _score: i * 5, _title: `Item ${i}` })
    );
    const summary = buildScoredItemsSummary('youtube', items);
    // Count data rows (excluding header rows and tier distribution)
    const dataRows = summary.split('\n').filter((line) => line.startsWith('| ') && !line.startsWith('| #') && !line.startsWith('|--'));
    expect(dataRows.length).toBe(15);
  });

  it('sorts items by score descending', () => {
    const items = [
      makeScoredItem({ _score: 30, _title: 'Low' }),
      makeScoredItem({ _score: 90, _title: 'High' }),
      makeScoredItem({ _score: 60, _title: 'Mid' }),
    ];
    const summary = buildScoredItemsSummary('instagram', items);
    const highIdx = summary.indexOf('High');
    const midIdx = summary.indexOf('Mid');
    const lowIdx = summary.indexOf('Low');
    expect(highIdx).toBeLessThan(midIdx);
    expect(midIdx).toBeLessThan(lowIdx);
  });
});
