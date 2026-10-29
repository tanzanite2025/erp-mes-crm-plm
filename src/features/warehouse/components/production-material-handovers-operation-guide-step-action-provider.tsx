import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { ClipboardList } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { ProductionMaterialIssuanceStartWorkflowLauncher } from '@/features/production-material-issuance/components/production-material-issuance-start-workflow-launcher'
import {
  type ProductionMaterialIssuanceWarehouseHandlingIntent,
  productionMaterialIssuanceWarehouseConfirmationPermissions,
} from '@/features/production-material-issuance/data/production-material-issuance-warehouse-handling-intent'
import {
  type ProductionMaterialHandoversOperationGuideStep,
  productionMaterialHandoversOperationGuideStepIntents,
} from '../data/production-material-handovers-operation-guide-chapter-definitions'

const ProductionMaterialIssuanceWarehouseOriginalDocumentHandlingDialog = lazy(
  () =>
    import('@/features/production-material-issuance/components/production-material-issuance-warehouse-original-document-handling-dialog').then(
      (module) => ({
        default:
          module.ProductionMaterialIssuanceWarehouseOriginalDocumentHandlingDialog,
      })
    )
)

type ProductionMaterialHandoversGuideDialogRequest = {
  intent: ProductionMaterialIssuanceWarehouseHandlingIntent
  step: ProductionMaterialHandoversOperationGuideStep
}

const ProductionMaterialHandoversGuideStepActionContext = createContext<{
  canStartIssuance: boolean
  canOpenIntent: (
    intent: ProductionMaterialIssuanceWarehouseHandlingIntent
  ) => boolean
  openStep: (request: ProductionMaterialHandoversGuideDialogRequest) => void
} | null>(null)

export function ProductionMaterialHandoversOperationGuideStepActionProvider({
  children,
}: {
  children: ReactNode
}) {
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  return (
    <ProductionMaterialHandoversOperationGuideAccountScopedStepActions
      key={actorId}
    >
      {children}
    </ProductionMaterialHandoversOperationGuideAccountScopedStepActions>
  )
}

function ProductionMaterialHandoversOperationGuideAccountScopedStepActions({
  children,
}: {
  children: ReactNode
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const { allowsAction } = usePermissionActions()
  const [request, setRequest] =
    useState<ProductionMaterialHandoversGuideDialogRequest | null>(null)
  const [selectedDocumentId, setSelectedDocumentId] = useState<
    string | undefined
  >()
  const canReadDocuments =
    Boolean(user?.id) &&
    allowsAction('action_production_material_issuance_view') &&
    matchesPathPermissionProjection(
      user,
      '/warehouse/production-material-handovers'
    )
  const canStartIssuance =
    Boolean(user?.id) &&
    allowsAction('action_production_material_issuance_view') &&
    allowsAction('action_production_material_issuance_dispatch') &&
    allowsAction([
      'menu_mrp',
      'tab_mrp_requirements',
      'tab_mrp_production_material_issuance',
    ])

  function canOpenProductionMaterialHandoversGuideIntent(
    intent: ProductionMaterialIssuanceWarehouseHandlingIntent
  ) {
    if (!canReadDocuments) return false
    if (intent === 'review' || intent === 'recovery') return true
    return (
      allowsAction('menu_warehouse') &&
      allowsAction(
        productionMaterialIssuanceWarehouseConfirmationPermissions[intent]
      )
    )
  }

  function openProductionMaterialHandoversGuideStep(
    next: ProductionMaterialHandoversGuideDialogRequest
  ) {
    if (canOpenProductionMaterialHandoversGuideIntent(next.intent))
      setRequest(next)
  }

  return (
    <ProductionMaterialHandoversGuideStepActionContext.Provider
      value={{
        canStartIssuance,
        canOpenIntent: canOpenProductionMaterialHandoversGuideIntent,
        openStep: openProductionMaterialHandoversGuideStep,
      }}
    >
      {children}
      {request &&
        canOpenProductionMaterialHandoversGuideIntent(request.intent) && (
          <Suspense
            fallback={
              <p role='status'>
                {t(
                  'warehouse.productionMaterialHandoversGuide.actions.loading'
                )}
              </p>
            }
          >
            <ProductionMaterialIssuanceWarehouseOriginalDocumentHandlingDialog
              intent={request.intent}
              initialDocumentId={selectedDocumentId}
              stepDescription={t(
                `warehouse.productionMaterialHandoversGuide.steps.${request.step}.title`
              )}
              onDocumentSelected={(documentId) =>
                setSelectedDocumentId(documentId ?? undefined)
              }
              onOpenChange={(open) => {
                if (!open) setRequest(null)
              }}
            />
          </Suspense>
        )}
    </ProductionMaterialHandoversGuideStepActionContext.Provider>
  )
}

export function ProductionMaterialHandoversOperationGuideStepActions({
  step,
}: {
  step: ProductionMaterialHandoversOperationGuideStep
}) {
  const { t } = useLanguage()
  const actions = useContext(ProductionMaterialHandoversGuideStepActionContext)
  const intent = productionMaterialHandoversOperationGuideStepIntents[step]
  if (!actions) return null

  return (
    <div className='space-y-2'>
      {intent &&
        (actions.canOpenIntent(intent) ? (
          <Button
            type='button'
            variant='outline'
            className='h-auto min-h-10 max-w-full justify-start rounded-xl px-3 py-2 text-left whitespace-normal'
            onClick={() => actions.openStep({ intent, step })}
          >
            <ClipboardList aria-hidden='true' className='size-4 shrink-0' />
            {t(`warehouse.productionMaterialHandoversGuide.actions.${intent}`)}
          </Button>
        ) : (
          <p className='text-xs leading-6 text-muted-foreground'>
            {t(
              'warehouse.productionMaterialHandoversGuide.actions.permissionRequired'
            )}
          </p>
        ))}
      {step === 'findDocument' && actions.canStartIssuance && (
        <ProductionMaterialIssuanceStartWorkflowLauncher compact />
      )}
    </div>
  )
}
