export const PURCHASE_LOGISTICS_KEYS = {
  listRoot: ['purchase-logistics-list'] as const,
  list: (search = '') => ['purchase-logistics-list', search] as const,
  tracking: (trackingNo: string) => ['purchase-logistics', 'tracking', trackingNo] as const,
  offlineDrafts: ['purchase-logistics', 'offline-drafts'] as const,
} as const
