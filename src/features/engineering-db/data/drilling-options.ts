export type DrillingSelectOption = { label: string; value: string }

// Module-owned default options for standard drilling hole counts.
// This intentionally avoids dependency on the global dictionary center.
export const STANDARD_HOLE_COUNT_OPTIONS: DrillingSelectOption[] = [
  { label: '16H', value: '16' },
  { label: '18H', value: '18' },
  { label: '20H', value: '20' },
  { label: '24H', value: '24' },
  { label: '28H', value: '28' },
  { label: '32H', value: '32' },
  { label: '36H', value: '36' },
  { label: '40H', value: '40' },
]
