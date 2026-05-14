import {
  ALL_BOM_REFERENCES,
  useBOMReferenceResource,
  type BOMReferenceResource,
} from './use-bom-reference-resource'

interface UseBOMFormOptionsParams {
  open: boolean
}

export type BOMFormOptionsResource = BOMReferenceResource

/**
 * BOM 表单需要 products / materials / sections 三组资源（含 productDisplayLabelMap
 * 计算所需的 templates/types/categories/options）。直接转发到全集模式。
 */
export function useBOMFormOptions({ open }: UseBOMFormOptionsParams): BOMFormOptionsResource {
  return useBOMReferenceResource({ enabled: open, include: ALL_BOM_REFERENCES })
}
