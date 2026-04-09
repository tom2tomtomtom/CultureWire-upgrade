export type AnalysisType = 'post' | 'creator' | 'topic';
export type AnalysisStatus = 'pending' | 'analyzing' | 'complete' | 'failed';
export type SimilarDepth = 'quick' | 'deep';

export type InfluencerTier = 'nano' | 'micro' | 'mid-tier' | 'macro' | 'mega';

export interface CreatorIntelAnalysis {
  id: string;
  user_id: string;
  type: AnalysisType;
  input: string;
  status: AnalysisStatus;
  results: PostAnalysisResult | TopicAnalysisResult | null;
  created_at: string;
}

export interface PostAnalysisResult {
  kind: 'post';
  post: TikTokPost;
  creator: CreatorProfile;
  themes: string[];
}

export interface TopicAnalysisResult {
  kind: 'topic';
  topic: string;
  hashtags_searched: string[];
  region: string;
  total_posts: number;
  top_creators: CreatorSummary[];
  trending_posts: TikTokPost[];
  theme_breakdown: ThemeBreakdown[];
}

export interface TikTokPost {
  aweme_id: string;
  username: string;
  description: string;
  region: string;
  url: string;
  stats: PostStats;
  hashtags: string[];
}

export interface PostStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number;
}

export interface CreatorProfile {
  username: string;
  region: string;
  tier: InfluencerTier;
  follower_estimate: string | null;
  avg_views: number;
  avg_likes: number;
  avg_shares: number;
  posting_frequency: string;
  top_hashtags: string[];
  content_themes: string[];
  posts_analyzed: number;
}

export interface CreatorSummary {
  username: string;
  region: string;
  tier: InfluencerTier;
  avg_engagement_rate: number;
  top_themes: string[];
  post_count: number;
  total_views: number;
}

export interface ThemeBreakdown {
  theme: string;
  post_count: number;
  avg_engagement_rate: number;
}

export interface ScrapeCreatorsPost {
  aweme_id: string;
  desc: string;
  region: string;
  author: {
    unique_id: string;
    nickname: string;
  };
  statistics: {
    play_count: number;
    digg_count: number;
    share_count: number;
    comment_count: number;
  };
}

export interface ScrapeCreatorsResponse {
  success: boolean;
  credits_remaining: number;
  aweme_list: ScrapeCreatorsPost[];
}
