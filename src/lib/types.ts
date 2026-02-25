// ============================================
// DATABASE ROW TYPES
// ============================================

export type ProjectStatus = 'draft' | 'planning' | 'executing' | 'synthesizing' | 'complete' | 'failed';
export type Platform = 'reddit' | 'trustpilot' | 'youtube' | 'tiktok' | 'google_trends';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  brief_text: string | null;
  brief_pdf_url: string | null;
  brief_parsed: string | null;
  estimated_cost_cents: number | null;
  actual_cost_cents: number;
  sheets_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchSpec {
  id: string;
  project_id: string;
  version: number;
  objective: string;
  key_questions: string[];
  target_audience: string | null;
  competitors: string[];
  keywords: string[];
  platforms: Platform[];
  geographic_focus: string | null;
  time_horizon: string | null;
  raw_llm_output: string | null;
  created_at: string;
}

export interface ExecutionPlan {
  id: string;
  project_id: string;
  spec_id: string;
  status: 'pending' | 'approved' | 'executing' | 'complete' | 'failed';
  total_estimated_cost_cents: number | null;
  plan_data: PlannedActorRun[];
  created_at: string;
  approved_at: string | null;
}

export interface PlannedActorRun {
  platform: Platform;
  actorId: string;
  displayName: string;
  inputParams: Record<string, unknown>;
  estimatedCostCents: number;
  estimatedResults: number;
  rationale: string;
}

export interface ScrapeJob {
  id: string;
  project_id: string;
  plan_id: string;
  actor_id: string;
  actor_display_name: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'timeout';
  input_params: Record<string, unknown>;
  apify_run_id: string | null;
  apify_dataset_id: string | null;
  estimated_cost_cents: number | null;
  actual_cost_cents: number | null;
  result_count: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ScrapeResult {
  id: string;
  job_id: string;
  project_id: string;
  source_platform: string;
  raw_data: Record<string, unknown>[];
  item_count: number;
  created_at: string;
}

export interface AnalysisResult {
  id: string;
  project_id: string;
  pass_type: 'per_source' | 'cross_source' | 'strategic_narrative';
  source_platform: string | null;
  analysis_content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================
// API TYPES
// ============================================

export interface ChatRequest {
  projectId: string;
  message: string;
  attachments?: { type: 'pdf'; url: string }[];
}

export interface ExecuteRequest {
  projectId: string;
  planId: string;
}

export interface SynthesizeRequest {
  projectId: string;
}

export interface ProjectStatusResponse {
  project: Project;
  jobs: ScrapeJob[];
  completedCount: number;
  totalCount: number;
  failedCount: number;
  analysis_results: { id: string; pass_type: string; source_platform: string | null; created_at: string }[];
}
