import { useMemo, useState } from 'react'
import { type Product } from '../data/schema'
import { useEngineeringBootstrap } from './use-engineering-bootstrap'
import { useEngineeringProductDisplayMetadata } from './use-engineering-product-display-metadata'
import { useProductWriteActions } from './use-product-write-actions'
import { useProductOwnersMap } from '@/features/product-structure/hooks/use-product-owners-map'
import { type ProductSubmitPayload } from './use-product-form'

const EMPTY_PRODUCTS: Product[] = []

export function useEngineeringWorkspaceViewModel() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined)

  const { saveProducts } = useProductWriteActions()
  const bootstrap = useEngineeringBootstrap()
  const products = bootstrap.products ?? EMPTY_PRODUCTS
  const types = bootstrap.types
  const displayMetadata = useEngineeringProductDisplayMetadata({
    products,
    productTypes: types,
  })
  // 方案 B + 1:1：归属语义在 BOM 维度，按产品聚合后给 sidebar 卡片显示。
  const { map: productOwnersMap } = useProductOwnersMap()
  const isLoading = bootstrap.isLoading || displayMetadata.isLoading
  const error = bootstrap.error ?? displayMetadata.error

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  )

  const selectedProduct = useMemo(() => {
    if (products.length === 0) {
      return undefined
    }

    if (selectedProductId && productMap.has(selectedProductId)) {
      return productMap.get(selectedProductId)
    }

    return products[0]
  }, [productMap, products, selectedProductId])

  const effectiveSelectedProductId = selectedProduct?.id ?? null
  const selectedProductDisplayMetadata = useMemo(() => {
    if (!selectedProduct) {
      return null
    }

    return displayMetadata.productDisplayMetadataMap.get(selectedProduct.id) || null
  }, [displayMetadata.productDisplayMetadataMap, selectedProduct])

  const handleSelectProduct = (id: string) => {
    setSelectedProductId(id)
  }

  const handleAddProduct = () => {
    setEditingProduct(undefined)
    setIsProductDialogOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setIsProductDialogOpen(true)
  }

  const handleOpenTypeDialog = () => {
    setIsTypeDialogOpen(true)
  }

  const handleProductDialogOpenChange = (open: boolean) => {
    setIsProductDialogOpen(open)
    if (!open) {
      setEditingProduct(undefined)
    }
  }

  const handleTypeDialogOpenChange = (open: boolean) => {
    setIsTypeDialogOpen(open)
  }

  const handleProductSubmit = async ({ products: incoming, currentRow }: ProductSubmitPayload) => {
    if (incoming.length === 0) {
      throw new Error('[CRITICAL] useEngineeringWorkspaceViewModel.handleProductSubmit received empty products payload')
    }

    const savedProducts = await saveProducts(
      incoming.map((product) => ({
        data: product,
        currentRow,
      }))
    )

    if (!editingProduct && savedProducts.length > 0) {
      setSelectedProductId(savedProducts[0].id)
    }

    return savedProducts
  }

  return {
    products,
    types,
    isLoading,
    error,
    editingProduct,
    selectedProduct,
    selectedProductDisplayMetadata,
    productDisplayMetadataMap: displayMetadata.productDisplayMetadataMap,
    productOwnersMap,
    effectiveSelectedProductId,
    isProductDialogOpen,
    isTypeDialogOpen,
    handleSelectProduct,
    handleAddProduct,
    handleEditProduct,
    handleOpenTypeDialog,
    handleProductDialogOpenChange,
    handleTypeDialogOpenChange,
    handleProductSubmit,
  }
}
