import type { Dispatch, SetStateAction } from 'react'
import { AlertTriangle, Check, Loader2, Settings2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type {
  LogisticsProviderDraft,
  LogisticsVerificationStatus,
} from '@/features/sandbox/logistics-api/types'
import { ProviderBasicFieldsSection } from './provider-form-sections/provider-basic-fields-section'
import { ProviderCredentialsSection } from './provider-form-sections/provider-credentials-section'
import { ProviderDirectoryFieldsSection } from './provider-form-sections/provider-directory-fields-section'
import { ProviderIntegrationFieldsSection } from './provider-form-sections/provider-integration-fields-section'
import { ProviderTemplateSection } from './provider-form-sections/provider-template-section'

type LogisticsProviderFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: LogisticsProviderDraft
  setFormData: Dispatch<SetStateAction<LogisticsProviderDraft>>
  selectedNote: string
  previewConnected: boolean
  previewVerificationStatus: LogisticsVerificationStatus
  isFormValid: boolean
  isCredentialsComplete: boolean
  savePending: boolean
  onApplyTemplate: (code: string) => void
  onSave: () => void
}

export function LogisticsProviderFormDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  selectedNote,
  previewConnected,
  previewVerificationStatus,
  isFormValid,
  isCredentialsComplete,
  savePending,
  onApplyTemplate,
  onSave,
}: LogisticsProviderFormDialogProps) {
  const { t } = useLanguage()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='6xl'
        className='gap-2 rounded-[32px] border-none bg-white/95 p-4 shadow-2xl backdrop-blur-xl sm:p-5'
      >
        <DialogHeader className='gap-1 pr-10'>
          <DialogTitle className='flex items-center gap-2 text-xl font-black tracking-tighter uppercase italic'>
            <Settings2 className='size-5 text-blue-600' />
            {formData.id
              ? t('logisticsConfig.platforms.dialog.editTitle')
              : t('logisticsConfig.platforms.dialog.createTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-3 py-1 sm:py-2'>
          <ProviderTemplateSection
            selectedNote={selectedNote}
            onApplyTemplate={onApplyTemplate}
          />
          <ProviderBasicFieldsSection
            formData={formData}
            setFormData={setFormData}
          />
          <div className='grid grid-cols-1 gap-3 xl:grid-cols-2'>
            <ProviderDirectoryFieldsSection
              formData={formData}
              setFormData={setFormData}
            />
            <div className='space-y-3'>
              <ProviderIntegrationFieldsSection
                formData={formData}
                setFormData={setFormData}
                previewConnected={previewConnected}
                previewVerificationStatus={previewVerificationStatus}
              />
              <ProviderCredentialsSection
                formData={formData}
                setFormData={setFormData}
              />
            </div>
          </div>
        </div>

        <DialogFooter className='flex-col gap-1 pt-0'>
          {!isCredentialsComplete && isFormValid ? (
            <p className='flex w-full items-center justify-center gap-1 text-[10px] font-bold text-amber-600'>
              <AlertTriangle className='size-3' />
              {t('logisticsConfig.platforms.states.credentialsIncomplete')}
            </p>
          ) : null}
          <Button
            onClick={onSave}
            disabled={!isFormValid || savePending}
            className='h-11 w-full rounded-full bg-blue-600 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40'
          >
            {savePending ? (
              <Loader2 className='mr-2 size-4 animate-spin' />
            ) : (
              <Check className='mr-2 size-4' />
            )}
            {savePending
              ? t('logisticsConfig.platforms.actions.saveReady')
              : isCredentialsComplete
                ? t('logisticsConfig.platforms.actions.saveReady')
                : t('logisticsConfig.platforms.actions.saveIncomplete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
