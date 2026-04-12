import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productDraftSchema, type Product, type ProductType } from '../data/schema'
import { useProductFormInit } from './use-product-form-init'
import { useProductFormSubmit } from './use-product-form-submit'
import { useProductFormDerive } from './use-product-form-derive'
import { type ProductVariantSelection } from '../utils/product-form-utils'
import { ProductCommand } from '../commands/product-command'

export interface ProductSubmitPayload {
  products: Product[]
  currentRow?: Product
}

interface UseProductFormProps {
  currentRow?: Product
  open: boolean
  productTypes: ProductType[]
  onOpenChange: (open: boolean) => void
  onSubmit?: (payload: ProductSubmitPayload) => Promise<void> | void
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
  const initialState = ProductCommand.composeInitialState({ isEdit, currentRow })

  const form = useForm<Product>({
    resolver: zodResolver(productDraftSchema) as Resolver<Product>,
    defaultValues: initialState.formValues,
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

  const { dynamicTypes, specPreviewSummary, skuPreview, nextCodeDeriveError } = useProductFormDerive({
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
    nextCodeDeriveError,
    skuPreview,
    selectedVariants,
    specPreviewSummary,
    handleVariantToggle,
    updateVariantWeight,
    handleFormSubmit,
  }
}
