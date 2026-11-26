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
import type { ProductionProcessStep } from '../data/production-process'
import {
  ProductionProcessLibraryConfigurationContent,
  type ProductionProcessLibraryConfigurationInteractionState,
} from './production-process-library-configuration-content'

export function ProductionProcessLibraryConfigurationDialog({
  open,
  onOpenChange,
  onProcessSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProcessSaved?: (process: ProductionProcessStep) => void
}) {
  const { t } = useLanguage()
  const [interaction, setInteraction] =
    useState<ProductionProcessLibraryConfigurationInteractionState>({
      hasUnsavedChanges: false,
      isSaving: false,
    })

  async function changeProductionProcessLibraryDialogOpen(nextOpen: boolean) {
    if (interaction.isSaving) return
    if (
      !nextOpen &&
      interaction.hasUnsavedChanges &&
      !(await requestApplicationConfirmation(
        t('productionArchitecture.processLibrary.discardChanges')
      ))
    )
      return
    if (!nextOpen) setInteraction({ hasUnsavedChanges: false, isSaving: false })
    onOpenChange(nextOpen)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) =>
        void changeProductionProcessLibraryDialogOpen(nextOpen)
      }
    >
      <DialogContent
        size='6xl'
        data-mobile-floating-surface-layout='column'
        className='flex max-h-[90dvh] flex-col overflow-hidden p-0'
        onEscapeKeyDown={(event) => {
          if (interaction.isSaving) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (interaction.isSaving) event.preventDefault()
        }}
      >
        <DialogHeader className='shrink-0 border-b p-5'>
          <DialogTitle>
            {t('productionArchitecture.processLibrary.title')}
          </DialogTitle>
          <DialogDescription>
            {t('productionArchitecture.processLibrary.descriptionText')}
          </DialogDescription>
        </DialogHeader>
        <div
          data-mobile-floating-surface-scroll-body
          className='min-h-0 overflow-y-auto p-5'
        >
          {open && (
            <ProductionProcessLibraryConfigurationContent
              onInteractionStateChange={setInteraction}
              onProcessSaved={onProcessSaved}
            />
          )}
        </div>
        <div className='flex shrink-0 justify-end border-t p-4'>
          <Button
            type='button'
            variant='outline'
            className='rounded-full'
            disabled={interaction.isSaving}
            onClick={() => void changeProductionProcessLibraryDialogOpen(false)}
          >
            {t('productionArchitecture.processLibrary.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
