import { useCallback, useMemo } from 'react'
import { type Unit } from '@/features/basic-settings/services/unit-service'
import { useActiveHoleCodeSource } from '@/features/code-center/hooks/use-hole-code-source'
import { type ProductDisplayProjectionV2 } from '@/features/engineering/display/product-display-v2'
import { type ProductAppearance } from '@/features/engineering/data/product-appearance'
import { type Product } from '@/features/engineering/data/schema'
import { type SalesOrderLine } from '../data/schema'
import { buildSalesOrderLineProductFields } from '../utils/sales-order-line-product-fields'

type SalesOrderLineFieldValue = SalesOrderLine[keyof SalesOrderLine]

interface LinesEditorViewModelOptions {
  appearances: ProductAppearance[]
  products: Product[]
  productDisplayLabelMap: Map<string, string>
  productDisplayProjectionMap: Map<string, ProductDisplayProjectionV2>
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
  appearanceById: Map<string, ProductAppearance>
  appearanceOptions: { id: string; label: string }[]
  currencySymbol: string
  productById: Map<string, Product>
  productOptions: { id: string; label: string }[]
  activeUnitOptions: { id: string; code: string }[]
  getHoleCountOptions: (currentValue?: number) => { value: string; label: string }[]
  handleAppearanceChange: (index: number, appearanceId: string) => void
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
  appearances,
  products,
  productDisplayLabelMap,
  productDisplayProjectionMap,
  units,
  currency,
  onLineChange,
}: LinesEditorViewModelOptions): LinesEditorViewModel {
  const { activeCounts } = useActiveHoleCodeSource()
  const appearanceById = useMemo(
    () => new Map(appearances.map((appearance) => [appearance.id, appearance])),
    [appearances]
  )
  const appearanceOptions = useMemo(
    () =>
      appearances
        .filter((appearance) => appearance.active)
        .map((appearance) => ({
          id: appearance.id,
          label: `${appearance.name} · ${appearance.barcodeCode}`,
        })),
    [appearances]
  )
  const currencySymbol = useMemo(() => getCurrencySymbol(currency), [currency])
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  )
  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        id: product.id,
        label: productDisplayLabelMap.get(product.id) ?? '',
      })),
    [productDisplayLabelMap, products]
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
  const baseHoleCountOptions = useMemo(
    () =>
      activeCounts.map((item) => ({
        value: item.value,
        label: item.label || item.value,
      })),
    [activeCounts]
  )

  const getHoleCountOptions = useCallback(
    (_currentValue?: number) => baseHoleCountOptions,
    [baseHoleCountOptions]
  )

  const handleProductChange = useCallback(
    (index: number, productId: string) => {
      const product = productById.get(productId)
      const displayProjection = productDisplayProjectionMap.get(productId)
      if (!product || !displayProjection) {
        onLineChange(index, 'productId', productId, {
          selectedPackaging: undefined,
        })
        return
      }

      const productFields = buildSalesOrderLineProductFields(product, displayProjection)

      onLineChange(index, 'productId', productId, {
        ...productFields,
        uom: 'PCS',
        selectedPackaging: undefined,
      })
    },
    [onLineChange, productById, productDisplayProjectionMap]
  )

  const handleAppearanceChange = useCallback(
    (index: number, appearanceId: string) => {
      const appearance = appearanceById.get(appearanceId)
      if (!appearance) {
        onLineChange(index, 'appearanceId', appearanceId, {
          appearanceNameSnapshot: '',
          appearanceBarcodeCodeSnapshot: '',
          appearanceDescriptionSnapshot: '',
          appearanceImageUrlSnapshot: '',
        })
        return
      }

      onLineChange(index, 'appearanceId', appearanceId, {
        appearanceNameSnapshot: appearance.name,
        appearanceBarcodeCodeSnapshot: appearance.barcodeCode,
        appearanceDescriptionSnapshot: appearance.description,
        appearanceImageUrlSnapshot: appearance.imageThumbnailUrl || appearance.imageUrl || '',
      })
    },
    [appearanceById, onLineChange]
  )

  return {
    appearanceById,
    appearanceOptions,
    currencySymbol,
    productById,
    productOptions,
    activeUnitOptions,
    getHoleCountOptions,
    handleAppearanceChange,
    handleProductChange,
  }
}
