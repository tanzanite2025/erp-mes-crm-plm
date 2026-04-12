import { useCallback, useMemo } from 'react'
import { type Unit } from '@/features/basic-settings/services/unit-service'
import { type Product } from '@/features/engineering/data/schema'
import { formatProductDisplayName } from '@/features/engineering/utils/product-utils'
import { type SalesOrderLine } from '../data/schema'

type SalesOrderLineFieldValue = SalesOrderLine[keyof SalesOrderLine]

interface LinesEditorViewModelOptions {
  products: Product[]
  units: Unit[]
  currency?: string
  onLineChange: (
    index: number,
    field: keyof SalesOrderLine,
    value: SalesOrderLineFieldValue,
    extraData?: Partial<SalesOrderLine>
  ) => void
}

interface LinesEditorViewModel {
  currencySymbol: string
  productById: Map<string, Product>
  productOptions: { id: string; label: string }[]
  activeUnitOptions: { id: string; code: string }[]
  handleProductChange: (index: number, productId: string) => void
}

function getCurrencySymbol(currency?: string) {
  if (!currency) return 'CNY '
  switch (currency.toUpperCase()) {
    case 'CNY':
      return 'CNY '
    case 'USD':
      return '$'
    case 'EUR':
      return 'EUR '
    case 'GBP':
      return 'GBP '
    case 'JPY':
      return 'JPY '
    default:
      return `${currency} `
  }
}

export function useSalesOrderLinesEditorViewModel({
  products,
  units,
  currency,
  onLineChange,
}: LinesEditorViewModelOptions): LinesEditorViewModel {
  const currencySymbol = useMemo(() => getCurrencySymbol(currency), [currency])
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  )
  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        id: product.id,
        label: formatProductDisplayName(product),
      })),
    [products]
  )
  const activeUnitOptions = useMemo(
    () =>
      units
        .filter((unit) => unit.status === 'active')
        .map((unit) => ({
          id: unit.id,
          code: unit.code,
        })),
    [units]
  )

  const handleProductChange = useCallback(
    (index: number, productId: string) => {
      const product = productById.get(productId)
      if (!product) {
        onLineChange(index, 'productId', productId)
        return
      }

      onLineChange(index, 'productId', productId, {
        productModel: product.sku,
        productCode: product.sku,
        specification: formatProductDisplayName(product),
        uom: 'PCS',
      })
    },
    [onLineChange, productById]
  )

  return {
    currencySymbol,
    productById,
    productOptions,
    activeUnitOptions,
    handleProductChange,
  }
}
