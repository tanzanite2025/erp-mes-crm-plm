import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import {
  ENGINEERING_DB_DRILLING_QUERY_KEY,
  ENGINEERING_DB_LABELING_QUERY_KEY,
} from '@/features/engineering-db/query-keys'
import { ProductionDBService } from '@/features/engineering-db/services/production-db-service'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { quoteQueryKeys } from '@/features/quotes/query-keys'
import { useGetCustomers } from '@/features/trading/customer'
import { useSalesOrderDrawingOptions } from '@/features/trading/hooks/use-sales-order-drawing-options'
import { useSalesOrderForm } from '@/features/trading/hooks/use-sales-order-form'
import { useSalesOrderMutations } from '@/features/trading/sales'
import { auditUtils } from '@/lib/audit-utils'

export function useQuoteWorkspaceSalesOrderAdapter(open: boolean, onCreated: (quoteId: string) => void) {
  const queryClient = useQueryClient()
  const { data: customers = [] } = useGetCustomers({ enabled: open })
  const { data: products = [] } = useGetProducts({ enabled: open })
  const { units = [] } = useUnitsQuery({ enabled: open })
  const drillingQuery = useQuery({
    queryKey: ENGINEERING_DB_DRILLING_QUERY_KEY,
    queryFn: () => ProductionDBService.getDrilling(),
    enabled: open,
  })
  const labelingQuery = useQuery({
    queryKey: ENGINEERING_DB_LABELING_QUERY_KEY,
    queryFn: () => ProductionDBService.getLabeling(),
    enabled: open,
  })
  const drillingOptions = useSalesOrderDrawingOptions(drillingQuery.data)
  const labelingOptions = useSalesOrderDrawingOptions(labelingQuery.data)
  const {
    formData,
    setFormData,
    handleClassificationChange,
    handleAddLine,
    handleRemoveLine,
    updateLine,
    validate,
    prepareToSave,
  } = useSalesOrderForm(undefined, open)
  const { createMutation } = useSalesOrderMutations()

  const createQuote = async () => {
    if (!validate()) {
      return
    }

    const finalData = await prepareToSave()
    if (!finalData) {
      return
    }

    const stampedData = auditUtils.stamp(finalData, 'create')
    const created = await createMutation.mutateAsync(stampedData)
    await queryClient.invalidateQueries({ queryKey: quoteQueryKeys.all() })
    onCreated(created.id)
  }

  const createResources = useMemo(
    () => ({
      customers,
      products,
      units,
      drillingOptions,
      labelingOptions,
    }),
    [customers, drillingOptions, labelingOptions, products, units]
  )

  return {
    quoteDraft: formData,
    updateQuoteDraft: setFormData,
    changeQuoteClassification: handleClassificationChange,
    addQuoteLine: handleAddLine,
    removeQuoteLine: handleRemoveLine,
    updateQuoteLine: updateLine,
    createResources,
    createQuote,
    isCreatingQuote: createMutation.isPending,
    createQuoteError: createMutation.error instanceof Error ? createMutation.error.message : null,
  }
}
