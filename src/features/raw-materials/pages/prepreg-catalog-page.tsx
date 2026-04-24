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
    applyRecognizedFields,
    handleSave,
    isSaving,
  } = usePrepregCatalogPageState()

  return (
    <div className='flex flex-col gap-5 animate-in fade-in duration-700'>
      <PrepregCatalogList
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onCreate={openCreate}
        specs={specs}
        isLoading={isLoading}
        onEdit={openEdit}
      />

      <PrepregCatalogDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingSpec={editingSpec}
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
