import { PrepregBindTokenEntryDialog } from '../components/prepreg-bind-token-entry-dialog'
import { PrepregCatalogDialog } from '../components/prepreg-catalog-dialog'
import { PrepregCatalogList } from '../components/prepreg-catalog-list'
import { usePrepregCatalogPageState } from '../hooks/use-prepreg-catalog-page-state'

export function PrepregCatalogPage() {
  const {
    searchTerm,
    setSearchTerm,
    specs,
    isLoading,
    dialogOpen,
    setDialogOpen,
    editingSpec,
    form,
    updateForm,
    supplierOptions,
    supplierSelectValue,
    isSupplierLoading,
    onSupplierChange,
    cleanedDimensions,
    cleanedResinBatch,
    openCreate,
    openEdit,
    bindingTokenDialogOpen,
    setBindingTokenDialogOpen,
    submitBindingTokenInput,
    activeBindingToken,
    applyRecognizedFields,
    handleSave,
    isSaving,
  } = usePrepregCatalogPageState()

  return (
    <div className='flex animate-in flex-col gap-5 duration-700 fade-in'>
      <PrepregCatalogList
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onCreate={openCreate}
        onScanBind={() => setBindingTokenDialogOpen(true)}
        specs={specs}
        isLoading={isLoading}
        onEdit={openEdit}
      />

      <PrepregBindTokenEntryDialog
        open={bindingTokenDialogOpen}
        onOpenChange={setBindingTokenDialogOpen}
        onSubmit={submitBindingTokenInput}
      />

      <PrepregCatalogDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingSpec={editingSpec}
        activeBindingToken={activeBindingToken}
        form={form}
        updateForm={updateForm}
        supplierSelectValue={supplierSelectValue}
        supplierOptions={supplierOptions}
        isSupplierLoading={isSupplierLoading}
        onSupplierChange={onSupplierChange}
        cleanedDimensions={cleanedDimensions}
        cleanedResinBatch={cleanedResinBatch}
        onApplyRecognizedFields={applyRecognizedFields}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  )
}
