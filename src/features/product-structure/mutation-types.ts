import {
  type BOM,
  type BOMItem,
  type BOMSubstitute,
} from './data/schema'
import { type MaterialOption } from '../material-archive/data/schema'

export type SaveBOMInput = Omit<BOM, 'bomDisplayVersion'>
export type BOMItemDraft = { [K in keyof BOMItem]?: BOMItem[K] }
export type MaterialOptionDraft = { [K in keyof MaterialOption]?: MaterialOption[K] }
export type BOMSubstitutePatch = { [K in keyof BOMSubstitute]?: BOMSubstitute[K] }
