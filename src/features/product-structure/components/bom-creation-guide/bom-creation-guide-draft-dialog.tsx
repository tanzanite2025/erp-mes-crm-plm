import { useRef } from 'react'
import { createLogger } from '@/lib/logger'
import { type BOM } from '../../data/schema'
import { useBOMWriteActions } from '../../hooks/use-bom-write-actions'
import { type SaveBOMInput } from '../../mutation-types'
import { BOMActionDialog } from '../bom-action-dialog'

const logger = createLogger('BOMCreationGuideDraftDialog')

/** Draft creation adapter; validation, sidecars, concurrency and caches use the existing BOM path. */
export function BOMCreationGuideDraftDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (bom: BOM) => void
}) {
  const { saveBOM } = useBOMWriteActions()
  const isSavingDraftRef = useRef(false)

  async function saveBOMCreationGuideDraft(data: SaveBOMInput) {
    if (isSavingDraftRef.current) return null
    isSavingDraftRef.current = true
    try {
      const savedBOM = await saveBOM({ data })
      onSaved(savedBOM)
      return savedBOM
    } catch (error) {
      // The shared mutation reports the error; preserve this editor and its draft for retry.
      logger.error('Could not save BOM draft from operation guide', error)
      return null
    } finally {
      isSavingDraftRef.current = false
    }
  }

  return (
    <BOMActionDialog
      open
      onOpenChange={(open) => {
        if (!open && !isSavingDraftRef.current) onClose()
      }}
      onSubmit={saveBOMCreationGuideDraft}
    />
  )
}
