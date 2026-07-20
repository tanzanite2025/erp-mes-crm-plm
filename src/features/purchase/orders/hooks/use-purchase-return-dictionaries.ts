import { useQuery } from '@tanstack/react-query'
import {
  getPurchaseReturnDictionaries,
  type PurchaseReturnDictionaryItem,
  type PurchaseReturnDictionaryType,
} from '../services/purchase-return-dictionary-service'
import { purchaseOrderQueryKeys } from '../query-keys'

export function usePurchaseReturnDictionaryOptions(
  dictType: PurchaseReturnDictionaryType
) {
  return useQuery<PurchaseReturnDictionaryItem[], Error>({
    queryKey: purchaseOrderQueryKeys.returnDictionaries(dictType),
    queryFn: () => getPurchaseReturnDictionaries(dictType),
  })
}
