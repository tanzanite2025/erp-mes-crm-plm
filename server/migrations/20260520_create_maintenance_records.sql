CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type VARCHAR(50) NOT NULL,
  asset_id UUID NOT NULL,
  asset_sn VARCHAR(100) DEFAULT '',
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cost NUMERIC(12,2) DEFAULT 0,
  remarks TEXT DEFAULT '',
  created_by VARCHAR(100) DEFAULT '',
  updated_by VARCHAR(100) DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mr_asset ON maintenance_records(asset_type, asset_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mr_status ON maintenance_records(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mr_created ON maintenance_records(created_at DESC) WHERE deleted_at IS NULL;
