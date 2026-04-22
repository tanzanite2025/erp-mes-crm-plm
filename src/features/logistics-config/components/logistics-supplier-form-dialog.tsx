import type { Dispatch, SetStateAction } from 'react'
import { AlertTriangle, Check, Loader2, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/context/language-provider'
import type { LogisticsProviderDraft, LogisticsVerificationStatus } from '@/features/sandbox/logistics-api/types'
import { LogisticsSupplierBasicFieldsSection } from './logistics-supplier-basic-fields-section'
import { LogisticsSupplierCredentialsSection } from './logistics-supplier-credentials-section'
import { LogisticsSupplierDirectoryFieldsSection } from './logistics-supplier-directory-fields-section'
import { LogisticsSupplierIntegrationFieldsSection } from './logistics-supplier-integration-fields-section'
import { LogisticsSupplierTemplateSection } from './logistics-supplier-template-section'

type LogisticsSupplierFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: LogisticsProviderDraft
  setFormData: Dispatch<SetStateAction<LogisticsProviderDraft>>
  selectedTemplateNote: string
  previewConnected: boolean
  previewVerificationStatus: LogisticsVerificationStatus
  isFormValid: boolean
  isCredentialsComplete: boolean
  savePending: boolean
  onApplyTemplate: (code: string) => void
  onSave: () => void
}

export function LogisticsSupplierFormDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  selectedTemplateNote,
  previewConnected,
  previewVerificationStatus,
  isFormValid,
  isCredentialsComplete,
  savePending,
  onApplyTemplate,
  onSave,
}: LogisticsSupplierFormDialogProps) {
  const { t } = useLanguage()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='6xl' className='rounded-[32px] border-none bg-white/95 p-8 shadow-2xl backdrop-blur-xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl font-black italic tracking-tighter'>
            <Truck className='size-5 text-primary' />
            {formData.id
              ? t('logisticsConfig.suppliers.dialog.editTitle')
              : t('logisticsConfig.suppliers.dialog.createTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-6 py-4'>
          <LogisticsSupplierTemplateSection
            selectedTemplateNote={selectedTemplateNote}
            onApplyTemplate={onApplyTemplate}
          />
          <LogisticsSupplierBasicFieldsSection formData={formData} setFormData={setFormData} />
          <div className='grid grid-cols-2 gap-6'>
            <LogisticsSupplierDirectoryFieldsSection formData={formData} setFormData={setFormData} />
            <div className='space-y-6'>
              <LogisticsSupplierIntegrationFieldsSection
                formData={formData}
                setFormData={setFormData}
                previewConnected={previewConnected}
                previewVerificationStatus={previewVerificationStatus}
              />
              <LogisticsSupplierCredentialsSection formData={formData} setFormData={setFormData} />
            </div>
          </div>
        </div>

        <DialogFooter className='flex-col gap-2'>
          {!isCredentialsComplete && isFormValid ? (
            <p className='flex w-full items-center justify-center gap-1 text-[10px] font-bold text-amber-600'>
              <AlertTriangle className='size-3' />
              {t('logisticsConfig.suppliers.states.credentialsIncomplete')}
            </p>
          ) : null}
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('logisticsConfig.suppliers.actions.cancel')}
          </Button>
          <Button onClick={onSave} disabled={!isFormValid || savePending} className='w-full'>
            {savePending ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
            {isCredentialsComplete
              ? t('logisticsConfig.suppliers.actions.saveReady')
              : t('logisticsConfig.suppliers.actions.saveIncomplete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
