-- Add sharing columns to both report tables
ALTER TABLE culture_wire_searches ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'shared'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'shared'));

-- Sharing junction table for both report types
CREATE TABLE IF NOT EXISTS report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('culture_wire', 'research')),
  report_id UUID NOT NULL,
  shared_by TEXT NOT NULL,
  shared_with TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_shares_report ON report_shares(report_type, report_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_shared_with ON report_shares(shared_with);
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_shares_unique ON report_shares(report_type, report_id, shared_with);
