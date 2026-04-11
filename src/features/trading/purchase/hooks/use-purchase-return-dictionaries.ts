import { useQuery } from '@tanstack/react-query'
import {
  getPurchaseReturnDictionaries,
  type PurchaseReturnDictionaryItem,
  type PurchaseReturnDictionaryType,
} from '../services/purchase-return-dictionary-service'

export function usePurchaseReturnDictionaryOptions(dictType: PurchaseReturnDictionaryType) {
  return useQuery<PurchaseReturnDictionaryItem[], Error>({
    queryKey: ['purchase-return-dictionaries', dictType],
    queryFn: () => getPurchaseReturnDictionaries(dictType),
  })
}

