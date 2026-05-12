import {
  type BOM,
  type BOMItem,
} from './data/schema'
import { type MaterialOption } from '../material-archive/data/schema'
import { type BOMRelationSidecar } from './utils/bom-relation-sidecar'

export type SaveBOMInput = Omit<BOM, 'bomDisplayVersion'> & {
  relationSidecar: BOMRelationSidecar
  _v?: number
}
export type BOMItemDraft = { [K in keyof BOMItem]?: BOMItem[K] }
export type MaterialOptionDraft = { [K in keyof MaterialOption]?: MaterialOption[K] }
