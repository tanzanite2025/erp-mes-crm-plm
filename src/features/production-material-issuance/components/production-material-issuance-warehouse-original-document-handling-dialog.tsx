import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import type { ProductionMaterialIssuanceWarehouseHandlingIntent } from '../data/production-material-issuance-warehouse-handling-intent'
import { ProductionMaterialIssuanceFrozenDocumentTraceability } from './production-material-issuance-frozen-document-traceability'

/** Uses the same original documents, form, commands and retry cache as warehouse handling. */
export function ProductionMaterialIssuanceWarehouseOriginalDocumentHandlingDialog({
  intent,
  initialDocumentId,
  stepDescription,
  onDocumentSelected,
  onOpenChange,
}: {
  intent: ProductionMaterialIssuanceWarehouseHandlingIntent
  initialDocumentId?: string
  stepDescription: string
  onDocumentSelected: (documentId: string | null) => void
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const { allowsAction } = usePermissionActions()
  const [documentIdOnOpen] = useState(initialDocumentId)
  const canReadDocument =
    Boolean(user?.id) &&
    allowsAction('action_production_material_issuance_view') &&
    matchesPathPermissionProjection(
      user,
      '/warehouse/production-material-handovers'
    )

  if (!canReadDocument || !user) return null

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        size='full'
        className='flex h-[90dvh] w-[calc(100%-1rem)] max-w-6xl min-w-0 flex-col overflow-hidden rounded-2xl p-3 sm:p-6'
      >
        <DialogHeader className='shrink-0 text-left'>
          <DialogTitle className='text-base leading-6'>
            {t(
              `mrp.productionMaterialIssuance.warehouseHandling.dialog.titles.${intent}`
            )}
          </DialogTitle>
          <DialogDescription className='text-xs leading-6'>
            {stepDescription}
          </DialogDescription>
        </DialogHeader>
        <p className='shrink-0 rounded-lg bg-sky-50 px-3 py-2 text-xs leading-6 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100'>
          {t(
            intent === 'review'
              ? 'mrp.productionMaterialIssuance.warehouseHandling.dialog.reviewHint'
              : 'mrp.productionMaterialIssuance.warehouseHandling.dialog.continueReadingHint'
          )}
        </p>
        <div className='min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]'>
          <ProductionMaterialIssuanceFrozenDocumentTraceability
            key={user.id}
            initialDocumentId={documentIdOnOpen}
            allowWithdrawalCommands={false}
            warehouseHandlingIntent={intent}
            onDocumentSelected={onDocumentSelected}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
