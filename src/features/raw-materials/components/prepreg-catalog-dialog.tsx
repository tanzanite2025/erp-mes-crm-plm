import { Layers3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/context/language-provider'
import { PrepregCatalogForm, type PrepregSupplierOption } from './prepreg-catalog-form'
import { PrepregLabelCapturePanel } from './prepreg-label-capture-panel'
import type {
  PrepregCleanedDimensionFields,
  PrepregCleanedResinBatchFields,
  PrepregFormState,
  PrepregMaterialSpec,
} from '../data/prepreg-material-spec-schema'

interface PrepregCatalogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingSpec: PrepregMaterialSpec | null
  form: PrepregFormState
  updateForm: <K extends keyof PrepregFormState>(key: K, value: PrepregFormState[K]) => void
  supplierSelectValue?: string
  supplierOptions: PrepregSupplierOption[]
  isSupplierLoading: boolean
  onSupplierChange: (value: string) => void
  cleanedDimensions: PrepregCleanedDimensionFields
  cleanedResinBatch: PrepregCleanedResinBatchFields
  onApplyRecognizedFields: (fields: Partial<PrepregFormState>) => void
  onSave: () => void
  isSaving: boolean
}

export function PrepregCatalogDialog({
  open,
  onOpenChange,
  editingSpec,
  form,
  updateForm,
  supplierSelectValue,
  supplierOptions,
  isSupplierLoading,
  onSupplierChange,
  cleanedDimensions,
  cleanedResinBatch,
  onApplyRecognizedFields,
  onSave,
  isSaving,
}: PrepregCatalogDialogProps) {
  const { t } = useLanguage()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='h-[90vh] max-h-[90vh] gap-3 overflow-hidden rounded-[24px] p-5 sm:max-w-[1120px]'>
        <DialogHeader className='space-y-1'>
          <DialogTitle className='flex items-center gap-2 text-lg font-black italic uppercase tracking-tighter'>
            <Layers3 className='size-5 text-primary' />
            {editingSpec
              ? t('rawMaterials.catalog.dialog.titleEdit')
              : t('rawMaterials.catalog.dialog.titleCreate')}
          </DialogTitle>
        </DialogHeader>
        <div className='min-h-0 flex-1 overflow-y-scroll pr-1'>
          <PrepregLabelCapturePanel onApply={onApplyRecognizedFields} />
          <PrepregCatalogForm
            form={form}
            updateForm={updateForm}
            supplierSelectValue={supplierSelectValue}
            supplierOptions={supplierOptions}
            isSupplierLoading={isSupplierLoading}
            onSupplierChange={onSupplierChange}
            cleanedDimensions={cleanedDimensions}
            cleanedResinBatch={cleanedResinBatch}
          />
        </div>

        <DialogFooter className='pt-1'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='h-9 rounded-full px-6 text-[10px] font-black uppercase tracking-widest'
          >
            {t('rawMaterials.catalog.actions.cancel')}
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className='h-9 rounded-full px-8 text-[10px] font-black uppercase tracking-widest'
          >
            {isSaving
              ? t('rawMaterials.catalog.actions.saving')
              : t('rawMaterials.catalog.actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
