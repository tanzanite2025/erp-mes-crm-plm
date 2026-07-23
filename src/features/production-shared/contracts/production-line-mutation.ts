import type { DeltaSet } from '@/lib/delta/types'
import type { ProductionLine } from '../data/production-line'

export type ProductionLineMutationPayload =
  | { type: 'CREATE'; data: ProductionLine }
  | { type: 'UPDATE'; id: string; delta: DeltaSet; version: number }
