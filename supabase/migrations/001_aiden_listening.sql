-- AIDEN Listening — Full schema for fresh Supabase project
-- No auth.users FKs since auth is handled by AIDEN Gateway JWT

-- gen_random_uuid() is built into Postgres 13+, no extension needed

-- ============================================
-- PROJECTS (Research Agent)
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'planning', 'executing', 'synthesizing', 'complete', 'failed')),
  brief_text TEXT,
  brief_pdf_url TEXT,
  brief_parsed TEXT,
  estimated_cost_cents INTEGER,
  actual_cost_cents INTEGER DEFAULT 0,
  sheets_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);

-- ============================================
-- RESEARCH SPECS
-- ============================================
CREATE TABLE research_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  objective TEXT NOT NULL,
  key_questions JSONB NOT NULL DEFAULT '[]',
  target_audience TEXT,
  competitors JSONB DEFAULT '[]',
  keywords JSONB DEFAULT '[]',
  platforms JSONB DEFAULT '[]',
  geographic_focus TEXT,
  time_horizon TEXT,
  raw_llm_output TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_research_specs_project_id ON research_specs(project_id);

-- ============================================
-- EXECUTION PLANS
-- ============================================
CREATE TABLE execution_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  spec_id UUID NOT NULL REFERENCES research_specs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'executing', 'complete', 'failed')),
  total_estimated_cost_cents INTEGER,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

CREATE INDEX idx_execution_plans_project_id ON execution_plans(project_id);

-- ============================================
-- SCRAPE JOBS
-- ============================================
CREATE TABLE scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES execution_plans(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  actor_display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'timeout')),
  input_params JSONB NOT NULL,
  apify_run_id TEXT,
  apify_dataset_id TEXT,
  estimated_cost_cents INTEGER,
  actual_cost_cents INTEGER,
  result_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scrape_jobs_project_id ON scrape_jobs(project_id);
CREATE INDEX idx_scrape_jobs_plan_id ON scrape_jobs(plan_id);
CREATE INDEX idx_scrape_jobs_status ON scrape_jobs(status);

-- ============================================
-- SCRAPE RESULTS
-- ============================================
CREATE TABLE scrape_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  raw_data JSONB NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scrape_results_job_id ON scrape_results(job_id);
CREATE INDEX idx_scrape_results_project_id ON scrape_results(project_id);

-- ============================================
-- ANALYSIS RESULTS
-- ============================================
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pass_type TEXT NOT NULL
    CHECK (pass_type IN ('per_source', 'cross_source', 'strategic_narrative', 'creative_routes')),
  source_platform TEXT,
  analysis_content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analysis_results_project_id ON analysis_results(project_id);
CREATE INDEX idx_analysis_results_pass_type ON analysis_results(pass_type);

-- ============================================
-- CHAT MESSAGES
-- ============================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_project_id ON chat_messages(project_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- ============================================
-- CULTURE WIRE: SEARCHES
-- ============================================
CREATE TABLE culture_wire_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  brand_context JSONB,
  search_type TEXT NOT NULL DEFAULT 'brand'
    CHECK (search_type IN ('brand', 'category')),
  category_slug TEXT,
  geo TEXT DEFAULT 'AU',
  time_window_hours INTEGER DEFAULT 24,
  platforms TEXT[] DEFAULT ARRAY['reddit','tiktok','youtube','instagram'],
  status TEXT NOT NULL DEFAULT 'collecting'
    CHECK (status IN ('collecting','analyzing','complete','failed')),
  result_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_cw_searches_user_id ON culture_wire_searches(user_id);
CREATE INDEX idx_cw_searches_status ON culture_wire_searches(status);

-- ============================================
-- CULTURE WIRE: RESULTS
-- ============================================
CREATE TABLE culture_wire_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES culture_wire_searches(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  layer TEXT NOT NULL CHECK (layer IN ('brand','category','trending')),
  raw_data JSONB NOT NULL,
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cw_results_search_id ON culture_wire_results(search_id);

-- ============================================
-- CULTURE WIRE: ANALYSES
-- ============================================
CREATE TABLE culture_wire_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES culture_wire_searches(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL
    CHECK (analysis_type IN ('opportunities','tensions','strategic_brief','right_to_play')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cw_analyses_search_id ON culture_wire_analyses(search_id);

-- ============================================
-- CULTURE WIRE: SUPPLEMENTARY
-- ============================================
CREATE TABLE culture_wire_supplementary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES culture_wire_searches(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('reddit_threads','google_trends','news')),
  raw_data JSONB NOT NULL,
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cw_supplementary_search_id ON culture_wire_supplementary(search_id);

-- ============================================
-- SIGNUP REQUESTS (Admin approval flow)
-- ============================================
CREATE TABLE signup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  company TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signup_requests_status ON signup_requests(status);

-- ============================================
-- LEAD INFLUENCERS
-- ============================================
CREATE TABLE lead_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  handle TEXT,
  platform TEXT NOT NULL,
  category TEXT,
  tier TEXT DEFAULT 'lead' CHECK (tier IN ('lead', 'curated', 'rejected')),
  search_id UUID REFERENCES culture_wire_searches(id) ON DELETE SET NULL,
  followers INTEGER,
  engagement_rate NUMERIC,
  relevance_score NUMERIC,
  notes TEXT,
  added_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_influencers_tier ON lead_influencers(tier);
CREATE INDEX idx_lead_influencers_category ON lead_influencers(category);

-- ============================================
-- SLACK INSTALLATIONS
-- ============================================
CREATE TABLE slack_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL UNIQUE,
  team_name TEXT,
  access_token TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  installed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- REALTIME
-- ============================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE scrape_jobs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE projects;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE culture_wire_searches;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER signup_requests_updated_at
  BEFORE UPDATE ON signup_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
