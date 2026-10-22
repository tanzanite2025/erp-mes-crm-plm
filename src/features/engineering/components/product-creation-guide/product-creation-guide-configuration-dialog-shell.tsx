import { type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { productCreationGuideDialogContentClassName } from '../product-creation-dialog-layout.styles'
import type { ProductCreationGuideOperationDialogProps } from './product-creation-guide-step-dialog-contracts'

export function ProductCreationGuideConfigurationDialog({
  step,
  onClose,
  wizardHeader,
  children,
  onConfirm,
  disabled,
  isConfirming = false,
  showConfirm = true,
}: Pick<
  ProductCreationGuideOperationDialogProps,
  'step' | 'onClose' | 'wizardHeader'
> & {
  children: ReactNode
  onConfirm: () => void
  disabled: boolean
  isConfirming?: boolean
  showConfirm?: boolean
}) {
  const { t } = useLanguage()
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isConfirming) onClose()
      }}
    >
      <DialogContent
        className={productCreationGuideDialogContentClassName}
        closeButtonClassName='flex size-7 items-center justify-center rounded-full'
      >
        {wizardHeader}
        <DialogHeader className='shrink-0 px-5 pt-5 text-start'>
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription className='leading-relaxed'>
            {step.action}
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 flex-1 space-y-4 overflow-y-auto p-5'>
          {children}
        </div>
        <DialogFooter className='shrink-0 border-t p-4'>
          <Button
            variant='outline'
            className='rounded-full border-dashed px-6 shadow-none'
            disabled={isConfirming}
            onClick={onClose}
          >
            {t('engineering.productCreationGuide.close')}
          </Button>
          {showConfirm && (
            <Button
              className='rounded-full px-6'
              disabled={disabled || isConfirming}
              onClick={onConfirm}
            >
              {isConfirming && (
                <RefreshCw aria-hidden='true' className='size-4 animate-spin' />
              )}
              {t('engineering.productCreationGuide.confirmAndContinue')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
