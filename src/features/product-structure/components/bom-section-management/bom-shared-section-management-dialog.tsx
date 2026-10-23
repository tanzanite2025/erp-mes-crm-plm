import { useLanguage } from '@/context/language-provider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BOMSharedSectionManagementPanel } from './bom-shared-section-management-panel'

export function BOMSharedSectionManagementDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLanguage()
  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[min(760px,92dvh)] min-h-0 flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-5xl'>
        <DialogHeader className='shrink-0 space-y-1 px-4 pt-4 pr-12 pb-3 text-left'>
          <DialogTitle>
            {t('engineering.bomSectionConfig.managementTitle')}
          </DialogTitle>
          <DialogDescription className='text-xs leading-relaxed'>
            {t('engineering.bomSectionConfig.sharedScopeHint')}
          </DialogDescription>
        </DialogHeader>
        <div className='flex min-h-0 flex-1 px-3 pb-3 sm:px-4 sm:pb-4'>
          <BOMSharedSectionManagementPanel />
        </div>
      </DialogContent>
    </Dialog>
  )
}
