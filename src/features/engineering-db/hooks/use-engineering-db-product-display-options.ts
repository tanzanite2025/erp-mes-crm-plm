'use client'

import {
  type ProductDisplayOption,
  useProductDisplayOptions,
} from '@/features/engineering/hooks/use-product-display-options'

export type EngineeringDbProductDisplayOption = ProductDisplayOption

interface UseEngineeringDbProductDisplayOptionsOptions {
  enabled?: boolean
}

export function useEngineeringDbProductDisplayOptions({
  enabled = true,
}: UseEngineeringDbProductDisplayOptionsOptions = {}) {
  return useProductDisplayOptions({ enabled })
}
