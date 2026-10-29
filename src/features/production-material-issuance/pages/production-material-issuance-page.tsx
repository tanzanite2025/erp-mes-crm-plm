import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen, MoreHorizontal, PackageOpen } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { ProductionMaterialIssuanceProgressWorkspaceWithDocumentTraceability } from '../components/production-material-issuance-progress-workspace-with-document-traceability'
import { ProductionMaterialIssuanceStartWorkflowLauncher } from '../components/production-material-issuance-start-workflow-launcher'

/** Overall order progress and individual document handling keep distinct scopes. */
export function ProductionMaterialIssuancePage({
  startRequested = false,
  onStartRequestHandled,
}: { startRequested?: boolean; onStartRequestHandled?: () => void } = {}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const hasReferenceLinks = [
    '/mrp/production-material-issuance-guide',
    '/mrp/requirements',
    '/warehouse',
  ].some((path) => matchesPathPermissionProjection(user, path))
  return (
    <div className='@container mx-2 min-w-0 space-y-4 pb-4 md:mx-4'>
      <header className='flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2'>
        <div className='min-w-0 flex-1'>
          <h1 className='flex items-center gap-2 text-lg font-semibold sm:text-xl'>
            <PackageOpen
              aria-hidden='true'
              className='size-5 shrink-0 text-primary'
            />
            {t('mrp.productionMaterialIssuance.title')}
          </h1>
        </div>
        <div className='flex items-start gap-2'>
          <ProductionMaterialIssuanceStartWorkflowLauncher
            compact
            startRequested={startRequested}
            onStartRequestHandled={onStartRequestHandled}
          />
          {hasReferenceLinks && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-8'
                  aria-label={t(
                    'mrp.productionMaterialIssuance.workspace.referenceLinks'
                  )}
                >
                  <MoreHorizontal aria-hidden='true' className='size-4' />
                </Button>
              </PopoverTrigger>
              <PopoverContent align='end' className='w-auto p-2'>
                <nav
                  className='flex flex-col gap-1'
                  aria-label={t(
                    'mrp.productionMaterialIssuance.workspace.referenceLinks'
                  )}
                >
                  {matchesPathPermissionProjection(
                    user,
                    '/mrp/production-material-issuance-guide'
                  ) && (
                    <Link
                      to='/mrp/production-material-issuance-guide'
                      className={buttonVariants({
                        variant: 'outline',
                        size: 'sm',
                      })}
                    >
                      <BookOpen aria-hidden='true' className='size-4' />
                      {t('mrp.productionMaterialIssuanceGuide.openGuide')}
                    </Link>
                  )}
                  {matchesPathPermissionProjection(
                    user,
                    '/mrp/requirements'
                  ) && (
                    <Link
                      to='/mrp/requirements'
                      className={buttonVariants({
                        variant: 'outline',
                        size: 'sm',
                      })}
                    >
                      {t(
                        'mrp.productionMaterialIssuance.referenceActions.requirements'
                      )}
                      <ArrowRight aria-hidden='true' className='size-4' />
                    </Link>
                  )}
                  {matchesPathPermissionProjection(user, '/warehouse') && (
                    <Link
                      to='/warehouse'
                      className={buttonVariants({
                        variant: 'outline',
                        size: 'sm',
                      })}
                    >
                      {t(
                        'mrp.productionMaterialIssuance.referenceActions.inventory'
                      )}
                    </Link>
                  )}
                </nav>
              </PopoverContent>
            </Popover>
          )}
        </div>
        <p className='w-full text-sm leading-5 text-muted-foreground'>
          {t('mrp.productionMaterialIssuance.description')}
        </p>
      </header>
      <ProductionMaterialIssuanceProgressWorkspaceWithDocumentTraceability />
    </div>
  )
}
