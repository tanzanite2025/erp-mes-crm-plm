import { useQuoteWorkspaceSalesOrderAdapter } from '@/features/quotes/adapters/quote-sales-order-adapter'

export function useQuoteCreateEditor(open: boolean, onCreated: (quoteId: string) => void) {
  const {
    quoteDraft,
    updateQuoteDraft,
    changeQuoteClassification,
    addQuoteLine,
    removeQuoteLine,
    updateQuoteLine,
    createResources,
    createQuote,
    isCreatingQuote,
    createQuoteError,
    createResource,
    retryCreateResources,
  } = useQuoteWorkspaceSalesOrderAdapter(open, onCreated)

  return {
    formData: quoteDraft,
    setFormData: updateQuoteDraft,
    handleClassificationChange: changeQuoteClassification,
    handleAddLine: addQuoteLine,
    handleRemoveLine: removeQuoteLine,
    updateLine: updateQuoteLine,
    createResources,
    createResource,
    handleCreate: createQuote,
    isCreating: isCreatingQuote,
    createError: createQuoteError,
    retryCreateResources,
  }
}
