import { useBOMReferenceResource, type BOMReferenceResource } from './use-bom-reference-resource'

interface UseBOMFormOptionsParams {
  open: boolean
}

export type BOMFormOptionsResource = BOMReferenceResource

export function useBOMFormOptions({ open }: UseBOMFormOptionsParams): BOMFormOptionsResource {
  return useBOMReferenceResource({ enabled: open })
}
