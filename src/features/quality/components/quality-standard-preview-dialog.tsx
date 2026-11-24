import { useState } from 'react'
import { useLanguage } from '@/context/language-provider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StandardPreviewPage } from '../pages/standard-preview-page'

interface QualityStandardPreviewDialogProps {
  standardId: string
  onClose: () => void
  onOpenEditor: (standardId: string) => void
  onEditBasicInformation: (standardId: string) => void
  onPreviewStandardChange: (standardId: string) => void
}

export function QualityStandardPreviewDialog({
  standardId,
  onClose,
  onOpenEditor,
  onEditBasicInformation,
  onPreviewStandardChange,
}: QualityStandardPreviewDialogProps) {
  const { t } = useLanguage()
  const [isWorkflowPending, setIsWorkflowPending] = useState(false)

  function closeQualityStandardPreviewUnlessWorkflowIsPending() {
    if (!isWorkflowPending) onClose()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) =>
        !open && closeQualityStandardPreviewUnlessWorkflowIsPending()
      }
    >
      <DialogContent
        size='full'
        data-mobile-floating-surface-layout='column'
        className='flex h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[1600px] flex-col gap-0 overflow-hidden rounded-3xl p-0'
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className='shrink-0 border-b p-5'>
          <DialogTitle>
            {t('quality.standards.workspace.previewTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('quality.standards.workspace.previewDescription')}
          </DialogDescription>
        </DialogHeader>
        <div
          data-mobile-floating-surface-scroll-body
          className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-5'
        >
          <StandardPreviewPage
            standardId={standardId}
            embedded
            onClose={closeQualityStandardPreviewUnlessWorkflowIsPending}
            onOpenEditor={onOpenEditor}
            onEditBasicInformation={onEditBasicInformation}
            onPreviewStandardChange={onPreviewStandardChange}
            onWorkflowPendingChange={setIsWorkflowPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
