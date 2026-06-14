import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'

export type PurchaseReturnDictionaryType = 'return_reason' | 'issue_category'

export interface PurchaseReturnDictionaryItem {
  id?: number
  dictType: PurchaseReturnDictionaryType
  code: string
  name: string
  description?: string
  sortOrder?: number
  isDefault?: boolean
  isSystem?: boolean
  status?: string
  version?: number
}

export async function getPurchaseReturnDictionaries(
  dictType: PurchaseReturnDictionaryType
): Promise<PurchaseReturnDictionaryItem[]> {
  const res = await apiFetch<PurchaseReturnDictionaryItem[]>(
    `/purchase/return-dictionaries?type=${dictType}`
  )
  return ensureArrayResponse<PurchaseReturnDictionaryItem>(
    res,
    'PurchaseReturnDictionaryService.getPurchaseReturnDictionaries'
  )
}
