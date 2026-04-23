import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { numberingService } from '@/features/basic-settings/services/numbering-service'
import { type Product } from '@/features/engineering/data/schema'
import { type SalesOrder, type SalesOrderFormValues } from '../data/schema'
import { getSalesOrderClassificationExt } from '../data/sales-order-options'
import { validateSalesOrder } from '../utils/sales-order-validator'
import { useSalesOrderInit } from './use-sales-order-init'
import { useSalesOrderOps } from './use-sales-order-ops'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'

type SalesOrderFormState = SalesOrderFormValues
type SalesOrderFormUpdater = SalesOrderFormState | ((prev: SalesOrderFormState) => SalesOrderFormState)

export function useSalesOrderForm(
  initialOrder: SalesOrder | null | undefined,
  open: boolean,
  products: Product[]
) {
  const { t } = useLanguage()
  const { initialFormData, isInitializing, initError, retryInit } = useSalesOrderInit(initialOrder, open)
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  )

  const memoizedInitial = useMemo<SalesOrderFormValues>(() => initialFormData, [initialFormData])
  const { data: formData, commit, isDirty } = useDeltaTracker(memoizedInitial, open)

  const setFormData = useCallback((updater: SalesOrderFormUpdater) => {
    if (typeof updater === 'function') {
      const next = updater(formData)
      Object.assign(formData, next)
    } else {
      Object.assign(formData, updater)
    }
  }, [formData])

  const { handleAddLine, handleRemoveLine, updateLine } = useSalesOrderOps(setFormData)

  const handleClassificationChange = useCallback(async (value: string) => {
    const newBarcode = await numberingService.previewContractBarcode(
      getSalesOrderClassificationExt(value)
    )

    setFormData((prev) => ({
      ...prev,
      classification: value,
      orderNo: newBarcode,
      barcode: newBarcode,
    }))
  }, [setFormData])

  const validate = (): boolean => {
    const { isValid, errorKey } = validateSalesOrder(formData, initialOrder)
    if (!isValid && errorKey) {
      toast.error(t(errorKey))
      return false
    }
    return true
  }

  const prepareToSave = async () => {
    let normalizedLines: typeof formData.lines

    try {
      normalizedLines = formData.lines.map((line) => {
        if (!line.productId) {
          throw new Error(
            t('tradingSalesOrder.errors.lineProductMissing', {
              lineNo: line.lineNo,
            })
          )
        }

        const product = productById.get(line.productId)
        const modelCodeSnapshot = product?.barcodeConfig?.modelCode
        const holePrefixSnapshot = product?.barcodeConfig?.category

        if (!product || !modelCodeSnapshot || !holePrefixSnapshot) {
          throw new Error(
            t('tradingSalesOrder.errors.lineBarcodeConfigMissing', {
              lineNo: line.lineNo,
            })
          )
        }

        return {
          ...line,
          modelCodeSnapshot,
          holePrefixSnapshot,
        }
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('tradingSalesOrder.toasts.saveFailed'))
      return undefined
    }

    setFormData((prev) => ({
      ...prev,
      lines: normalizedLines,
    }))

    if (!initialOrder) {
      const barcode = await numberingService.generateContractBarcode(
        getSalesOrderClassificationExt(formData.classification)
      )
      setFormData((prev) => ({
        ...prev,
        orderNo: barcode,
        barcode,
        lines: normalizedLines,
      }))
      return {
        ...formData,
        orderNo: barcode,
        barcode,
        lines: normalizedLines,
      }
    }

    return {
      ...formData,
      lines: normalizedLines,
    }
  }

  return {
    formData,
    setFormData,
    handleClassificationChange,
    handleAddLine,
    handleRemoveLine,
    updateLine,
    validate,
    prepareToSave,
    commit,
    isDirty,
    isInitializing,
    initError,
    retryInit,
  }
}
