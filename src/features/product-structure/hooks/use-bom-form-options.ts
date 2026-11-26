import { type CompositeReadResource } from '@/lib/read-resource'
import {
  ALL_BOM_REFERENCES,
  useBOMReferenceResource,
  type BOMReferenceResourceFields,
} from './use-bom-reference-resource'

const BOM_FORM_REFERENCES = [...ALL_BOM_REFERENCES, 'productionLines'] as const

interface UseBOMFormOptionsParams {
  open: boolean
}

export type BOMFormOptionsResource =
  CompositeReadResource<BOMReferenceResourceFields>

/**
 * BOM 表单额外读取工程权限可访问的有效产线选项；其他 BOM 只读场景不加载该列表。
 */
export function useBOMFormOptions({
  open,
}: UseBOMFormOptionsParams): BOMFormOptionsResource {
  return useBOMReferenceResource({
    enabled: open,
    include: BOM_FORM_REFERENCES,
  })
}
