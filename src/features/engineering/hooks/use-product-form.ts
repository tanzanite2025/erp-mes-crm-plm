import { useEffect, useRef } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ProductCommand } from '../commands/product-command'
import {
  productDraftSchema,
  type Product,
  type ProductType,
} from '../data/schema'
import { useProductFormDerive } from './use-product-form-derive'
import { useProductFormInit } from './use-product-form-init'
import { useProductFormPreviewTemplate } from './use-product-form-preview-template'
import { useProductFormSubmit } from './use-product-form-submit'

export interface ProductSubmitPayload {
  products: Product[]
  currentRow?: Product
}

interface UseProductFormProps {
  currentRow?: Product
  open: boolean
  productTypes: ProductType[]
  onOpenChange: (open: boolean) => void
  onSubmit?: (
    payload: ProductSubmitPayload
  ) => Promise<Product[] | void> | Product[] | void
  onSaved?: (products: Product[]) => void
}

export function useProductForm({
  currentRow,
  open,
  productTypes,
  onOpenChange,
  onSubmit,
  onSaved,
}: UseProductFormProps) {
  const isEdit = !!currentRow
  const initializedSessionIdentityRef = useRef<string | null>(null)
  const initialState = ProductCommand.composeInitialState({
    isEdit,
    currentRow,
  })
  const currentSessionIdentity = isEdit
    ? `edit:${currentRow?.id ?? ''}`
    : 'create'

  const form = useForm<Product>({
    resolver: zodResolver(productDraftSchema) as Resolver<Product>,
    defaultValues: initialState.formValues,
  })

  const {
    attributeCategories,
    attributeOptions,
    moldOptions,
    specOptions,
    boms,
    bomOptions,
    customerNameMap,
    isBomOptionsPending,
    metadataInitError,
    metadataReady,
  } = useProductFormInit({
    open,
  })

  useEffect(() => {
    if (!open) {
      initializedSessionIdentityRef.current = null
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
    })
    form.reset(nextInitialState.formValues)
    initializedSessionIdentityRef.current = currentSessionIdentity
  }, [currentRow, currentSessionIdentity, form, isEdit, metadataReady, open])

  const { boundTemplate, templateResolveError, templateResolutionPending } =
    useProductFormPreviewTemplate({
      currentRow,
      form,
      isEdit,
      open,
      productTypes,
    })

  const {
    dynamicTypes,
    specPreviewTitle,
    specPreviewSummary,
    specPreviewAggregateLabel,
    specPreviewV2,
    specPreviewItems,
    selectedBomContext,
    skuPreview,
    nextCodeDeriveError,
  } = useProductFormDerive({
    isEdit,
    open,
    form,
    previewTemplate: boundTemplate,
    attributeCategories,
    attributeOptions,
    boms,
    customerNameMap,
    productTypes,
  })

  const { handleFormSubmit } = useProductFormSubmit({
    currentRow,
    isEdit,
    form,
    productTypes,
    attributeOptions,
    boms,
    customerNameMap,
    onOpenChange,
    onSubmit,
    onSaved,
  })

  return {
    form,
    isEdit,
    dynamicTypes,
    attributeCategories,
    attributeOptions,
    moldOptions,
    specOptions,
    bomOptions,
    isBomOptionsPending,
    metadataInitError,
    metadataReady,
    nextCodeDeriveError,
    skuPreview,
    boundTemplate,
    templateResolveError,
    templateResolutionPending,
    specPreviewTitle,
    specPreviewSummary,
    specPreviewAggregateLabel,
    specPreviewV2,
    specPreviewItems,
    selectedBomContext,
    handleFormSubmit,
  }
}
