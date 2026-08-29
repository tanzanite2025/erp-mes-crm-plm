export interface PieceworkRateApiDTO {
  id: string
  createdAt?: string
  updatedAt?: string
  productId: string
  processStepId?: string | null
  routeStepId?: string | null
  processCode?: string
  processName?: string
  unit?: string
  unitPrice?: number
  piecePrice?: number
  currency?: string
  effectiveAt?: string | null
  effectiveFrom?: string | null
  effectiveTo?: string | null
  status?: string
  remarks?: string
  version?: number
  operator?: string
}

export interface PieceworkRateWriteApiDTO {
  id?: string
  productId: string
  processStepId?: string
  routeStepId?: string
  unit?: string
  unitPrice?: number
  currency?: string
  effectiveFrom?: string
  effectiveTo?: string
  status?: string
  remarks?: string
  version?: number
}

export interface PieceworkRatePatchApiDTO {
  op: 'PATCH'
  delta: Record<string, { o: unknown; n: unknown }>
  metadata: {
    id: string
    version: number
  }
}
