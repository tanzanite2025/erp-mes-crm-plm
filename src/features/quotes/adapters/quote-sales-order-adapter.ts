import { useQueryClient } from '@tanstack/react-query'
import { quoteQueryKeys } from '@/features/quotes/query-keys'
import { useSalesDocumentReferenceResources } from '@/features/sales-document/hooks/use-sales-document-reference-resources'
import { useSalesOrderForm } from '@/features/trading/hooks/use-sales-order-form'
import { useSalesOrderMutations } from '@/features/trading/sales'
import { auditUtils } from '@/lib/audit-utils'

export function useQuoteWorkspaceSalesOrderAdapter(open: boolean, onCreated: (quoteId: string) => void) {
  const queryClient = useQueryClient()
  const {
    readResource: createResource,
    resources: createResources,
    retry: retryCreateResources,
  } = useSalesDocumentReferenceResources({
    enabled: open,
    scope: 'useQuoteWorkspaceSalesOrderAdapter',
    optionalResourceMode: 'blocking',
  })
  const {
    formData,
    setFormData,
    handleClassificationChange,
    handleAddLine,
    handleRemoveLine,
    updateLine,
    validate,
    prepareToSave,
  } = useSalesOrderForm(
    undefined,
    open,
    createResources.products,
    createResources.productDisplayProjectionMap,
    createResources.drillingOptions,
    createResources.labelingOptions,
    createResources.engineeringSpecs
  )
  const { createMutation } = useSalesOrderMutations()

  const createQuote = async () => {
    if (createResource.status !== 'ready') {
      return
    }

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

  return {
    quoteDraft: formData,
    updateQuoteDraft: setFormData,
    changeQuoteClassification: handleClassificationChange,
    addQuoteLine: handleAddLine,
    removeQuoteLine: handleRemoveLine,
    updateQuoteLine: updateLine,
    createResources,
    createResource,
    createQuote,
    isCreatingQuote: createMutation.isPending,
    createQuoteError: createMutation.error instanceof Error ? createMutation.error.message : null,
    retryCreateResources,
  }
}
