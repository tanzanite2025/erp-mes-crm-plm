import type { Standard } from '../data/schema'
import { StandardPreviewAuditPanel } from './standard-preview-audit-panel'
import { StandardPreviewFooter } from './standard-preview-footer'
import { StandardPreviewHero } from './standard-preview-hero'
import { StandardPreviewMatrixTable } from './standard-preview-matrix-table'

interface StandardPreviewContentProps {
  standard: Standard
  onClose: () => void
  closeLabel: string
  primaryActionLabel: string
  onPrimaryAction: () => void
  showPrimaryAction?: boolean
}

export function StandardPreviewContent({
  standard,
  onClose,
  closeLabel,
  primaryActionLabel,
  onPrimaryAction,
  showPrimaryAction = true,
}: StandardPreviewContentProps) {
  return (
    <>
      <div className='absolute top-0 left-0 z-50 h-1 w-full bg-linear-to-r from-primary/20 via-primary/60 to-primary/20 transition-opacity' />

      <div className='shrink-0 space-y-4 border-b border-white/5 bg-muted/20 p-4 pt-6 lg:p-6 lg:pt-8'>
        <StandardPreviewHero standard={standard} />
        <StandardPreviewAuditPanel standard={standard} />
      </div>

      <StandardPreviewMatrixTable
        standard={standard}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={onPrimaryAction}
        showPrimaryAction={showPrimaryAction}
      />

      <StandardPreviewFooter
        onClose={onClose}
        closeLabel={closeLabel}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={onPrimaryAction}
        showPrimaryAction={showPrimaryAction}
      />
    </>
  )
}
