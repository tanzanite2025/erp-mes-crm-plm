import { useState } from 'react'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { QualityDefectConfigurationInteractionState } from '../hooks/use-quality-defect-type-configuration'
import { QualityDefectTypeConfigurationContent } from './quality-defect-type-configuration-content'

export function QualityDefectTypeConfigurationDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLanguage()
  const [interaction, setInteraction] =
    useState<QualityDefectConfigurationInteractionState>({
      hasUnsavedChanges: false,
      isSaving: false,
    })

  async function changeQualityDefectConfigurationDialogOpen(nextOpen: boolean) {
    if (
      interaction.isSaving ||
      (!nextOpen &&
        interaction.hasUnsavedChanges &&
        !(await requestApplicationConfirmation(
          t('quality.defectConfiguration.discardChanges')
        )))
    )
      return
    if (!nextOpen) setInteraction({ hasUnsavedChanges: false, isSaving: false })
    onOpenChange(nextOpen)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) =>
        void changeQualityDefectConfigurationDialogOpen(nextOpen)
      }
    >
      <DialogContent
        size='6xl'
        data-mobile-floating-surface-layout='column'
        className='flex max-h-[90dvh] flex-col overflow-hidden rounded-3xl p-0'
        onEscapeKeyDown={(event) => {
          if (interaction.isSaving) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (interaction.isSaving) event.preventDefault()
        }}
      >
        <DialogHeader className='shrink-0 border-b p-5 pr-12'>
          <DialogTitle className='text-sm font-semibold'>
            {t('quality.defectConfiguration.title')}
          </DialogTitle>
          <DialogDescription className='text-[13px] leading-5'>
            {t('quality.defectConfiguration.description')}
          </DialogDescription>
        </DialogHeader>
        <div
          data-mobile-floating-surface-scroll-body
          className='min-h-0 overflow-y-auto p-5'
        >
          {open ? (
            <QualityDefectTypeConfigurationContent
              onInteractionStateChange={setInteraction}
            />
          ) : null}
        </div>
        <div className='flex shrink-0 justify-end border-t p-4'>
          <Button
            type='button'
            variant='outline'
            className='rounded-full'
            disabled={interaction.isSaving}
            onClick={() =>
              void changeQualityDefectConfigurationDialogOpen(false)
            }
          >
            {t('quality.defectConfiguration.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
