export const SYSTEM_ANOMALY_KEYS = {
  FILESYSTEM_PERMISSION_DENIED: 'system_anomaly_fs_permission',
} as const;

export type SystemAnomalyType = keyof typeof SYSTEM_ANOMALY_KEYS;
