-- Research Agent — Initial Schema
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE projects (
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

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);

-- ============================================
-- RESEARCH SPECS
-- ============================================
CREATE TABLE research_specs (
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

CREATE INDEX idx_research_specs_project_id ON research_specs(project_id);

-- ============================================
-- EXECUTION PLANS
-- ============================================
CREATE TABLE execution_plans (
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

CREATE INDEX idx_execution_plans_project_id ON execution_plans(project_id);

-- ============================================
-- SCRAPE JOBS
-- ============================================
CREATE TABLE scrape_jobs (
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

CREATE INDEX idx_scrape_jobs_project_id ON scrape_jobs(project_id);
CREATE INDEX idx_scrape_jobs_plan_id ON scrape_jobs(plan_id);
CREATE INDEX idx_scrape_jobs_status ON scrape_jobs(status);

-- ============================================
-- SCRAPE RESULTS
-- ============================================
CREATE TABLE scrape_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pass_type TEXT NOT NULL
    CHECK (pass_type IN ('per_source', 'cross_source', 'strategic_narrative')),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_project_id ON chat_messages(project_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

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

CREATE POLICY "Users can access own projects"
  ON projects FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own research_specs"
  ON research_specs FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can access own execution_plans"
  ON execution_plans FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can access own scrape_jobs"
  ON scrape_jobs FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can access own scrape_results"
  ON scrape_results FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can access own analysis_results"
  ON analysis_results FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can access own chat_messages"
  ON chat_messages FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE scrape_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;

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
