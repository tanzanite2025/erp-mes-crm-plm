export const SYSTEM_ANOMALY_KEYS = {
  DICTIONARY_MISSING: 'system_anomaly_dictionary_missing',
} as const;

export type SystemAnomalyType = keyof typeof SYSTEM_ANOMALY_KEYS;
