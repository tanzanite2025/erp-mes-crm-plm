export interface DiffItem {
  f: string; // Field
  o: any;    // Old
  n: any;    // New
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
