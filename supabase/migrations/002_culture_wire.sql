-- Culture Wire — Brand Intelligence Search
-- Migration 002

-- ============================================
-- CULTURE WIRE SEARCHES
-- ============================================
CREATE TABLE culture_wire_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  brand_context JSONB,
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
-- CULTURE WIRE RESULTS
-- ============================================
CREATE TABLE culture_wire_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID NOT NULL REFERENCES culture_wire_searches(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  layer TEXT NOT NULL CHECK (layer IN ('brand','category','trending')),
  raw_data JSONB NOT NULL,
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cw_results_search_id ON culture_wire_results(search_id);

-- ============================================
-- CULTURE WIRE ANALYSES
-- ============================================
CREATE TABLE culture_wire_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id UUID NOT NULL REFERENCES culture_wire_searches(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL
    CHECK (analysis_type IN ('opportunities','tensions','strategic_brief','right_to_play')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cw_analyses_search_id ON culture_wire_analyses(search_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE culture_wire_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE culture_wire_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE culture_wire_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own searches" ON culture_wire_searches
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own results" ON culture_wire_results
  FOR ALL USING (search_id IN (SELECT id FROM culture_wire_searches WHERE user_id = auth.uid()));
CREATE POLICY "Users access own analyses" ON culture_wire_analyses
  FOR ALL USING (search_id IN (SELECT id FROM culture_wire_searches WHERE user_id = auth.uid()));

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE culture_wire_searches;
