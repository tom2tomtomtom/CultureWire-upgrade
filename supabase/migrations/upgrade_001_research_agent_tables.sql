-- CultureWire Upgrade — Add Research Agent tables + extend CW schema
-- Run in Supabase SQL Editor on vixmcyseuftfodgdeyon
-- This is additive — preserves all existing CW tables (searches, signup_requests, lead_influencers, slack_installations)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- RESEARCH AGENT: PROJECTS
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ============================================
-- RESEARCH AGENT: RESEARCH SPECS
-- ============================================
CREATE TABLE IF NOT EXISTS research_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX IF NOT EXISTS idx_research_specs_project_id ON research_specs(project_id);

-- ============================================
-- RESEARCH AGENT: EXECUTION PLANS
-- ============================================
CREATE TABLE IF NOT EXISTS execution_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  spec_id UUID NOT NULL REFERENCES research_specs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'executing', 'complete', 'failed')),
  total_estimated_cost_cents INTEGER,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_execution_plans_project_id ON execution_plans(project_id);

-- ============================================
-- RESEARCH AGENT: SCRAPE JOBS
-- ============================================
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_project_id ON scrape_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_plan_id ON scrape_jobs(plan_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);

-- ============================================
-- RESEARCH AGENT: SCRAPE RESULTS
-- ============================================
CREATE TABLE IF NOT EXISTS scrape_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  raw_data JSONB NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_results_job_id ON scrape_results(job_id);
CREATE INDEX IF NOT EXISTS idx_scrape_results_project_id ON scrape_results(project_id);

-- ============================================
-- RESEARCH AGENT: ANALYSIS RESULTS
-- ============================================
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pass_type TEXT NOT NULL
    CHECK (pass_type IN ('per_source', 'cross_source', 'strategic_narrative', 'creative_routes')),
  source_platform TEXT,
  analysis_content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_results_project_id ON analysis_results(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_pass_type ON analysis_results(pass_type);

-- ============================================
-- RESEARCH AGENT: CHAT MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_project_id ON chat_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- ============================================
-- CULTURE WIRE: SEARCHES (new normalized tables)
-- ============================================
CREATE TABLE IF NOT EXISTS culture_wire_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_cw_searches_user_id ON culture_wire_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_cw_searches_status ON culture_wire_searches(status);

-- ============================================
-- CULTURE WIRE: RESULTS
-- ============================================
CREATE TABLE IF NOT EXISTS culture_wire_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID NOT NULL REFERENCES culture_wire_searches(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  layer TEXT NOT NULL CHECK (layer IN ('brand','category','trending')),
  raw_data JSONB NOT NULL,
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cw_results_search_id ON culture_wire_results(search_id);

-- ============================================
-- CULTURE WIRE: ANALYSES
-- ============================================
CREATE TABLE IF NOT EXISTS culture_wire_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID NOT NULL REFERENCES culture_wire_searches(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL
    CHECK (analysis_type IN ('opportunities','tensions','strategic_brief','right_to_play')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cw_analyses_search_id ON culture_wire_analyses(search_id);

-- ============================================
-- CULTURE WIRE: SUPPLEMENTARY RESULTS (Deep Dive)
-- ============================================
CREATE TABLE IF NOT EXISTS culture_wire_supplementary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID NOT NULL REFERENCES culture_wire_searches(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('reddit_threads','google_trends','news')),
  raw_data JSONB NOT NULL,
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cw_supplementary_search_id ON culture_wire_supplementary(search_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE culture_wire_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE culture_wire_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE culture_wire_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE culture_wire_supplementary ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe re-run)
DO $$
BEGIN
  -- Projects
  DROP POLICY IF EXISTS "Users can access own projects" ON projects;
  CREATE POLICY "Users can access own projects" ON projects FOR ALL USING (auth.uid() = user_id);

  -- Research specs
  DROP POLICY IF EXISTS "Users can access own research_specs" ON research_specs;
  CREATE POLICY "Users can access own research_specs" ON research_specs FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

  -- Execution plans
  DROP POLICY IF EXISTS "Users can access own execution_plans" ON execution_plans;
  CREATE POLICY "Users can access own execution_plans" ON execution_plans FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

  -- Scrape jobs
  DROP POLICY IF EXISTS "Users can access own scrape_jobs" ON scrape_jobs;
  CREATE POLICY "Users can access own scrape_jobs" ON scrape_jobs FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

  -- Scrape results
  DROP POLICY IF EXISTS "Users can access own scrape_results" ON scrape_results;
  CREATE POLICY "Users can access own scrape_results" ON scrape_results FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

  -- Analysis results
  DROP POLICY IF EXISTS "Users can access own analysis_results" ON analysis_results;
  CREATE POLICY "Users can access own analysis_results" ON analysis_results FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

  -- Chat messages
  DROP POLICY IF EXISTS "Users can access own chat_messages" ON chat_messages;
  CREATE POLICY "Users can access own chat_messages" ON chat_messages FOR ALL
    USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

  -- Culture Wire searches
  DROP POLICY IF EXISTS "Users access own searches" ON culture_wire_searches;
  CREATE POLICY "Users access own searches" ON culture_wire_searches FOR ALL USING (auth.uid() = user_id);

  -- Culture Wire results
  DROP POLICY IF EXISTS "Users access own results" ON culture_wire_results;
  CREATE POLICY "Users access own results" ON culture_wire_results FOR ALL
    USING (search_id IN (SELECT id FROM culture_wire_searches WHERE user_id = auth.uid()));

  -- Culture Wire analyses
  DROP POLICY IF EXISTS "Users access own analyses" ON culture_wire_analyses;
  CREATE POLICY "Users access own analyses" ON culture_wire_analyses FOR ALL
    USING (search_id IN (SELECT id FROM culture_wire_searches WHERE user_id = auth.uid()));

  -- Culture Wire supplementary
  DROP POLICY IF EXISTS "Users access own supplementary" ON culture_wire_supplementary;
  CREATE POLICY "Users access own supplementary" ON culture_wire_supplementary FOR ALL
    USING (search_id IN (SELECT id FROM culture_wire_searches WHERE user_id = auth.uid()));
END $$;

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

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
