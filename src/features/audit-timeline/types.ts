export interface DiffItem {
  f: string; // Field
  o: unknown;    // Old
  n: unknown;    // New
  a: string; // Alias
}

export interface AuditLog {
  id: string;
  module: string;
  target_id: string;
  action: string;
  diff: DiffItem[];
  operator: string;
  ip: string;
  created_at: string;
}
