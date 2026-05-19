import { cn } from '@/lib/utils'

const hostedQuickActionMobileSheetBase =
  'top-auto bottom-0 h-[90dvh] max-h-[90dvh] w-screen max-w-screen translate-y-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom'

const hostedQuickActionDesktopReset =
  'md:top-[50%] md:bottom-auto md:translate-y-[-50%] md:h-auto md:max-h-[calc(100dvh-2rem)]'

export const hostedQuickActionDialogScrollableBodyClassName = 'min-h-0 flex-1 overflow-y-auto'

export function buildHostedQuickActionDialogContentClassName(desktopClassName?: string) {
  return cn(
    hostedQuickActionMobileSheetBase,
    hostedQuickActionDesktopReset,
    desktopClassName
  )
}
