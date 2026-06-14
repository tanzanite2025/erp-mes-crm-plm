import { type DeltaSet } from '@/lib/delta/types'
import { type MaterialOption } from '../material-archive/data/schema'
import { type BOM, type BOMItem } from './data/schema'
import { type BOMRelationSidecar } from './utils/bom-relation-sidecar'

export type SaveBOMInput = BOM & {
  relationSidecar: BOMRelationSidecar
  /**
   * Optional delta set for RelationSidecar changes.
   * Used for enhanced audit logging and future delta-based PATCH operations.
   */
  _sidecarDelta?: DeltaSet | null
}
export type BOMItemDraft = { [K in keyof BOMItem]?: BOMItem[K] }
export type MaterialOptionDraft = {
  [K in keyof MaterialOption]?: MaterialOption[K]
}
