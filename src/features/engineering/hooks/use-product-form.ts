import { useEffect, useRef, useState } from 'react'
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
  const initializedSessionIdentityRef = useRef<string | null>(null)
  const initialState = ProductCommand.composeInitialState({ isEdit, currentRow })
  const currentSessionIdentity = isEdit ? `edit:${currentRow?.id ?? ''}` : 'create'

  const form = useForm<Product>({
    resolver: zodResolver(productDraftSchema) as Resolver<Product>,
    defaultValues: initialState.formValues,
  })

  const {
    attributeCategories,
    attributeOptions,
    versionLevelOptions,
    moldOptions,
    specOptions,
    metadataInitError,
    metadataReady,
  } = useProductFormInit({
    open,
  })

  useEffect(() => {
    if (!open) {
      initializedSessionIdentityRef.current = null
      queueMicrotask(() => {
        setSelectedVariants([])
      })
    }
  }, [open])

  useEffect(() => {
    if (!open || !metadataReady) {
      return
    }
    if (initializedSessionIdentityRef.current === currentSessionIdentity) {
      return
    }

    const nextInitialState = ProductCommand.composeInitialState({
      isEdit,
      currentRow,
      versionLevelOptions,
    })
    form.reset(nextInitialState.formValues)
    initializedSessionIdentityRef.current = currentSessionIdentity
    queueMicrotask(() => {
      setSelectedVariants(nextInitialState.selectedVariants)
    })
  }, [currentRow, currentSessionIdentity, form, isEdit, metadataReady, open, versionLevelOptions])

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
    versionLevelOptions,
    moldOptions,
    specOptions,
    metadataInitError,
    metadataReady,
    nextCodeDeriveError,
    skuPreview,
    selectedVariants,
    specPreviewSummary,
    handleVariantToggle,
    updateVariantWeight,
    handleFormSubmit,
  }
}
