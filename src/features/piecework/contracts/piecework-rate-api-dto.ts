export interface PieceworkRateApiDTO {
  id: string
  createdAt?: string
  updatedAt?: string
  payItemId: string
  payItemCode: string
  payItemName: string
  unit: string
  unitPrice: number
  currency: string
  effectiveFrom: string
  effectiveTo?: string | null
  status: 'active' | 'inactive'
  remarks?: string
  version: number
  operator?: string
}

export interface PieceworkRateWriteApiDTO {
  id?: string
  payItemId: string
  unit?: string
  unitPrice?: number
  currency?: string
  effectiveFrom?: string
  effectiveTo?: string
  status?: string
  remarks?: string
  version?: number
}

export const PIECEWORK_RATE_PATCH_WRITABLE_FIELDS = [
  'payItemId',
  'unit',
  'unitPrice',
  'currency',
  'effectiveFrom',
  'effectiveTo',
  'status',
  'remarks',
] as const satisfies readonly (keyof Omit<
  PieceworkRateWriteApiDTO,
  'id' | 'version'
>)[]

export interface PieceworkRatePatchApiDTO {
  op: 'PATCH'
  delta: Partial<
    Record<
      (typeof PIECEWORK_RATE_PATCH_WRITABLE_FIELDS)[number],
      { o: unknown; n: unknown }
    >
  >
  metadata: {
    id: string
    version: number
  }
}
