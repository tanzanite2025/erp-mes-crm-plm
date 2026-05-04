import { useMemo, useState } from 'react'
import { type Product } from '../data/schema'
import { useEngineeringBootstrap } from './use-engineering-bootstrap'
import { useProductWriteActions } from './use-product-write-actions'
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
  const isLoading = bootstrap.isLoading
  const error = bootstrap.error

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
