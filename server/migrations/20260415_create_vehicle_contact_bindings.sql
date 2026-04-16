CREATE TABLE IF NOT EXISTS vehicle_contact_bindings (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  vehicle_name TEXT NOT NULL,
  category TEXT NOT NULL,
  supplier_name TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL,
  primary_phone TEXT NOT NULL,
  channels_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  region TEXT NOT NULL DEFAULT '',
  dispatch_advice TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_vehicle_contact_bindings_vehicle_id ON vehicle_contact_bindings (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_contact_bindings_category ON vehicle_contact_bindings (category);
CREATE INDEX IF NOT EXISTS idx_vehicle_contact_bindings_enabled ON vehicle_contact_bindings (enabled);
CREATE INDEX IF NOT EXISTS idx_vehicle_contact_bindings_deleted_at ON vehicle_contact_bindings (deleted_at);
