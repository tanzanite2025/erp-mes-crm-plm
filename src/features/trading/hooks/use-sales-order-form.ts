import { useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { numberingService } from '@/features/basic-settings/services/numbering-service'
import { type ProductDisplayProjectionV2 } from '@/features/engineering/display/product-display-v2'
import { type Product } from '@/features/engineering/data/schema'
import { type SalesOrder, type SalesOrderFormValues } from '../data/schema'
import { getSalesOrderClassificationExt } from '../data/sales-order-options'
import { mergeSalesOrderLineProductFields } from '../utils/sales-order-line-product-fields'
import { validateSalesOrder } from '../utils/sales-order-validator'
import { useSalesOrderInit } from './use-sales-order-init'
import { useSalesOrderOps } from './use-sales-order-ops'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'

type SalesOrderFormState = SalesOrderFormValues
type SalesOrderFormUpdater = SalesOrderFormState | ((prev: SalesOrderFormState) => SalesOrderFormState)

export function useSalesOrderForm(
  initialOrder: SalesOrder | null | undefined,
  open: boolean,
  products: Product[],
  productDisplayProjectionMap: Map<string, ProductDisplayProjectionV2>
) {
  const { t } = useLanguage()
  const classificationPreviewRequestIdRef = useRef(0)
  const { initialFormData, isInitializing, initError, retryInit } = useSalesOrderInit(initialOrder, open)
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  )

  const memoizedInitial = useMemo<SalesOrderFormValues>(() => initialFormData, [initialFormData])
  const { data: formData, commit, replace, isDirty } = useDeltaTracker(memoizedInitial, open)

  const setFormData = useCallback((updater: SalesOrderFormUpdater) => {
    if (typeof updater === 'function') {
      const next = updater(formData)
      replace(next)
    } else {
      replace(updater)
    }
  }, [formData, replace])

  const { handleAddLine, handleRemoveLine, updateLine } = useSalesOrderOps(setFormData)

  const handleClassificationChange = useCallback(async (value: string) => {
    const requestId = classificationPreviewRequestIdRef.current + 1
    classificationPreviewRequestIdRef.current = requestId
    const newBarcode = await numberingService.previewContractBarcode(
      getSalesOrderClassificationExt(value)
    )
    if (requestId !== classificationPreviewRequestIdRef.current) {
      return
    }

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
        const displayProjection = productDisplayProjectionMap.get(line.productId)
        if (!product) {
          throw new Error(
            t('tradingSalesOrder.errors.lineProductMissing', {
              lineNo: line.lineNo,
            })
          )
        }

        if (!displayProjection) {
          throw new Error(`第 ${line.lineNo} 行产品展示快照缺失，请刷新后重试`)
        }

        const productFields = mergeSalesOrderLineProductFields(line, product, displayProjection)

        return {
          ...line,
          ...productFields,
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
