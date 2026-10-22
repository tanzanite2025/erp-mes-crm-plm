import { cn } from '@/lib/utils'
import { buildHostedQuickActionDialogContentClassName } from '@/components/hosted-quick-action-dialog.styles'

export const productCreationDialogViewportClassName =
  buildHostedQuickActionDialogContentClassName(
    'md:h-[90vh] md:max-h-[90vh] md:w-[85vw] md:max-w-[85vw]'
  )

export const productCreationGuideDialogContentClassName = cn(
  productCreationDialogViewportClassName,
  'flex min-h-0 flex-col gap-0 overflow-hidden rounded-2xl p-0'
)
