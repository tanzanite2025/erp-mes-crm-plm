import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ActionDialogShellProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  contentDecoration?: ReactNode
  contentClassName?: string
  headerClassName?: string
  bodyClassName?: string
  footerClassName?: string
  titleClassName?: string
  descriptionClassName?: string
}

export function ActionDialogShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentDecoration,
  contentClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  titleClassName,
  descriptionClassName,
}: ActionDialogShellProps) {
  const viewportAnchoredContentClassName = cn(contentClassName, 'fixed')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={viewportAnchoredContentClassName}>
        {contentDecoration}
        <DialogHeader className={headerClassName}>
          <DialogTitle className={titleClassName}>{title}</DialogTitle>
          {description ? (
            <DialogDescription className={descriptionClassName}>
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className={bodyClassName}>{children}</div>
        {footer ? (
          <DialogFooter className={footerClassName}>{footer}</DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
