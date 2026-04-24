import { useMemo } from 'react'
import { type MasterDataSearchResult } from '../inventory'
import { useProductInbound } from './use-product-inbound'

export function useProductInboundViewModel() {
  const inbound = useProductInbound()

  const handleSearchQueryChange = (value: string) => {
    inbound.setSearchQuery(value)
  }

  const handleInboundDialogOpenChange = (open: boolean) => {
    if (!open) inbound.closeInboundDialog()
  }

  const handleTargetCategoryChange = (value: string) => {
    inbound.setFormData((current) => ({ ...current, targetCategory: value }))
  }

  const handleEntryDateChange = (value: string) => {
    inbound.setFormData((current) => ({ ...current, entryDate: value }))
  }

  const handleQuantityChange = (value: number) => {
    inbound.setFormData((current) => ({ ...current, quantity: value }))
  }

  const handleBatchNoChange = (value: string) => {
    inbound.setFormData((current) => ({ ...current, batchNo: value }))
  }

  const handleRemarksChange = (value: string) => {
    inbound.setFormData((current) => ({ ...current, remarks: value }))
  }

  const handleOpenInboundForm = (item: MasterDataSearchResult) => {
    inbound.openInboundForm(item)
  }

  const targetNodeDescription = useMemo(() => {
    if (!inbound.selectedItem) return null
    return {
      name: inbound.selectedItem.name,
      code: inbound.selectedItem.code,
    }
  }, [inbound.selectedItem])

  return {
    error: inbound.error,
    searchQuery: inbound.searchQuery,
    searchResults: inbound.searchResults,
    isSearching: inbound.isSearching,
    hasSearched: inbound.hasSearched,
    selectedItem: inbound.selectedItem,
    targetNodeDescription,
    isInboundOpen: inbound.isInboundOpen,
    formData: inbound.formData,
    history: inbound.history,
    warehouseCategories: inbound.warehouseCategories,
    selectableWarehouseCategories: inbound.selectableWarehouseCategories,
    isSubmittingInbound: inbound.isSubmittingInbound,
    handleSearchQueryChange,
    handleOpenInboundForm,
    handleInboundDialogOpenChange,
    handleTargetCategoryChange,
    handleEntryDateChange,
    handleQuantityChange,
    handleBatchNoChange,
    handleRemarksChange,
    handleSubmitInbound: inbound.submitInbound,
    handleCloseInboundDialog: inbound.closeInboundDialog,
  }
}
