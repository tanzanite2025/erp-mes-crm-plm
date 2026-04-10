import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type Product, type ProductType } from '../data/schema'
import { useProductFormInit } from './use-product-form-init'
import { useProductFormSubmit } from './use-product-form-submit'
import { useProductFormDerive } from './use-product-form-derive'
import {
  buildDefaultProductValues,
  type ProductVariantSelection,
} from '../utils/product-form-utils'

interface UseProductFormProps {
  currentRow?: Product
  open: boolean
  productTypes: ProductType[]
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: Product | Product[]) => Promise<void> | void
}

export function useProductForm({
  currentRow,
  open,
  productTypes,
  onOpenChange,
  onSubmit,
}: UseProductFormProps) {
  const isEdit = !!currentRow
  const [selectedVariants, setSelectedVariants] = useState<ProductVariantSelection[]>([])

  const form = useForm<Product>({
    resolver: zodResolver(productSchema) as Resolver<Product>,
    defaultValues: buildDefaultProductValues({ includeVersion: true }),
  })

  const {
    attributeCategories,
    attributeOptions,
    attributeBindings,
    versionLevelOptions,
    moldOptions,
    specOptions,
    metadataInitError,
  } = useProductFormInit({
    open,
    isEdit,
    currentRow,
    productTypes,
    form,
    selectedVariants,
    setSelectedVariants,
  })

  const { dynamicTypes, specSummary } = useProductFormDerive({
    isEdit,
    open,
    form,
    productTypes,
  })

  const { handleVariantToggle, updateVariantWeight, handleFormSubmit } = useProductFormSubmit({
    currentRow,
    isEdit,
    form,
    productTypes,
    selectedVariants,
    setSelectedVariants,
    onOpenChange,
    onSubmit,
  })

  return {
    form,
    isEdit,
    dynamicTypes,
    attributeCategories,
    attributeOptions,
    attributeBindings,
    versionLevelOptions,
    moldOptions,
    specOptions,
    metadataInitError,
    selectedVariants,
    specSummary,
    handleVariantToggle,
    updateVariantWeight,
    handleFormSubmit,
  }
}
