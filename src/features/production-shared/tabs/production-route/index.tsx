import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  GitBranch,
  History,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { productionResourceQueryKeys } from '../../data/production-resource-query-keys'
import type { ProductionRoute } from '../../data/production-route'
import { useProductionRoutesQuery } from '../../hooks/use-production-resources'
import { productionRoutesService } from '../../services/production-routes-service'
import { ProductionRouteDialog } from './production-route-dialog'
import { ProductionRouteRevisionHistoryDialog } from './production-route-revision-history-dialog'

const logger = createLogger('ProductionRoute')

function statusTone(status: ProductionRoute['status']) {
  return status === 'PUBLISHED'
    ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700'
    : 'border-amber-500/30 bg-amber-500/10 text-amber-600'
}

export function ProductionRouteMgmt() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { allowsAction, isChecking } = usePermissionActions()
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState<ProductionRoute | null>(null)
  const [historyFamilyId, setHistoryFamilyId] = useState<string | null>(null)
  const [isCreatingRevision, setIsCreatingRevision] = useState(false)
  const routesQuery = useProductionRoutesQuery()
  const bomBranchesQuery = useQuery({
    queryKey: productionResourceQueryKeys.routeBOMBranches(),
    queryFn: productionRoutesService.getBOMBranches,
    enabled: dialogOpen,
  })
  const canManage = allowsAction('action_production_route_manage')
  const routes = routesQuery.data ?? []
  const historyRoutes = historyFamilyId
    ? routes.filter((route) => route.routeFamilyId === historyFamilyId)
    : []

  const filteredRoutes = routes.filter((route) => {
    const search = searchTerm.trim().toLowerCase()
    if (!search) {
      return true
    }
    return `${route.code} ${route.name} ${route.productSKU || ''} ${route.productName} ${route.bomVersionLevel || ''} ${route.salesOrderNo || ''} ${route.salesOrderLineNo || ''}`
      .toLowerCase()
      .includes(search)
  })

  const openCreate = () => {
    setEditingRoute(null)
    setDialogOpen(true)
  }

  const openEdit = (route: ProductionRoute) => {
    setEditingRoute(route)
    setDialogOpen(true)
  }

  const handleSave = async (route: ProductionRoute) => {
    if (!canManage) {
      return
    }
    try {
      await productionRoutesService.saveRoute(route)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: productionResourceQueryKeys.routes(),
        }),
        queryClient.invalidateQueries({
          queryKey:
            productionResourceQueryKeys.routeSalesOrderLineCandidates(''),
        }),
      ])
      toast.success(t('productionArchitecture.routes.toasts.saved'))
    } catch (error) {
      logger.error('Failed to save production route', error)
      toast.error(t('productionArchitecture.routes.toasts.saveFailed'))
      throw error
    }
  }

  const handleRestoreBranchDefault = async (salesOrderLineID: number) => {
    if (!canManage) {
      return
    }
    try {
      await productionRoutesService.resetSalesOrderLineRouteToBranchDefault(
        salesOrderLineID
      )
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: productionResourceQueryKeys.routes(),
        }),
        queryClient.invalidateQueries({
          queryKey:
            productionResourceQueryKeys.routeSalesOrderLineCandidates(''),
        }),
      ])
      toast.success(t('productionArchitecture.routes.toasts.defaultRestored'))
    } catch (error) {
      logger.error(
        'Failed to restore branch default production operations',
        error
      )
      toast.error(
        t('productionArchitecture.routes.toasts.defaultRestoreFailed')
      )
      throw error
    }
  }

  const handleDelete = async (route: ProductionRoute) => {
    if (
      !canManage ||
      !(await requestApplicationConfirmation(
        t('productionArchitecture.routes.deleteConfirm', { name: route.name })
      ))
    ) {
      return
    }
    try {
      await productionRoutesService.deleteRoute(route.id)
      await queryClient.invalidateQueries({
        queryKey: productionResourceQueryKeys.routes(),
      })
      toast.success(t('productionArchitecture.routes.toasts.deleted'))
    } catch (error) {
      logger.error('Failed to delete production route', error)
      toast.error(t('productionArchitecture.routes.toasts.deleteFailed'))
    }
  }

  const handlePublish = async (route: ProductionRoute) => {
    if (
      !canManage ||
      !(await requestApplicationConfirmation(
        t('productionArchitecture.routes.publishConfirm', { name: route.name })
      ))
    ) {
      return
    }
    try {
      await productionRoutesService.publishRoute(route.id, route.version)
      await queryClient.invalidateQueries({
        queryKey: productionResourceQueryKeys.routes(),
      })
      toast.success(t('productionArchitecture.routes.toasts.published'))
    } catch (error) {
      logger.error('Failed to publish production route', error)
      toast.error(t('productionArchitecture.routes.toasts.publishFailed'))
    }
  }

  const handleCreateRevision = async (route: ProductionRoute) => {
    if (!canManage || isCreatingRevision) {
      return
    }
    setIsCreatingRevision(true)
    try {
      const draft = await productionRoutesService.createRevision(route.id)
      await queryClient.invalidateQueries({
        queryKey: productionResourceQueryKeys.routes(),
      })
      setHistoryFamilyId(null)
      setEditingRoute(draft)
      setDialogOpen(true)
      toast.success(t('productionArchitecture.routes.toasts.revisionCreated'))
    } catch (error) {
      logger.error('Failed to create production route revision', error)
      toast.error(
        t('productionArchitecture.routes.toasts.revisionCreateFailed')
      )
    } finally {
      setIsCreatingRevision(false)
    }
  }

  if (isForbiddenError(routesQuery.error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex animate-in flex-col gap-8 pb-10 duration-700 fade-in'>
      <IndustrialHeader
        icon={GitBranch}
        title={t('productionArchitecture.routes.title')}
        description={t('productionArchitecture.routes.description')}
      />

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='relative max-w-sm min-w-[240px] flex-1'>
          <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t('productionArchitecture.routes.searchPlaceholder')}
            className='h-12 rounded-full border-primary/15 bg-background pl-11'
          />
        </div>
        <Button
          onClick={openCreate}
          disabled={!canManage || isChecking}
          title={
            canManage
              ? undefined
              : t('productionArchitecture.routes.noManagePermission')
          }
          className='h-11 rounded-full px-5'
        >
          <Plus className='mr-2 size-4' />
          {t('productionArchitecture.routes.add')}
        </Button>
      </div>

      {routesQuery.isLoading ? (
        <div className='grid gap-4 lg:grid-cols-2'>
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className='h-52 rounded-2xl' />
          ))}
        </div>
      ) : filteredRoutes.length === 0 ? (
        <Card className='rounded-2xl border-dashed bg-muted/5 shadow-none'>
          <CardContent className='flex flex-col items-center gap-3 py-20 text-center'>
            <GitBranch className='size-12 text-muted-foreground/20' />
            <p className='text-sm font-black text-muted-foreground'>
              {t('productionArchitecture.routes.empty')}
            </p>
            <Button
              onClick={openCreate}
              disabled={!canManage || isChecking}
              variant='outline'
              className='rounded-full'
            >
              {t('productionArchitecture.routes.add')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 lg:grid-cols-2'>
          {filteredRoutes.map((route) => (
            <Card key={route.id} className='rounded-2xl shadow-none'>
              <CardHeader className='gap-3 pb-3'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <CardTitle className='text-base font-black tracking-tight'>
                      {route.salesOrderNo && route.salesOrderLineNo
                        ? t('productionArchitecture.routes.orderLineTitle', {
                            orderNo: route.salesOrderNo,
                            lineNo: route.salesOrderLineNo,
                          })
                        : route.name}
                    </CardTitle>
                    <p className='mt-1 font-maple-ui text-[10px] font-bold text-muted-foreground'>
                      R{route.revisionNo} · v{route.version}
                    </p>
                  </div>
                  <div className='flex shrink-0 flex-wrap gap-2'>
                    <Badge
                      variant='outline'
                      className={statusTone(route.status)}
                    >
                      {t(
                        `productionArchitecture.routes.statuses.${route.status}`
                      )}
                    </Badge>
                    {route.isCurrentRevision ? (
                      <Badge variant='secondary'>
                        {t('productionArchitecture.routes.history.current')}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <p className='line-clamp-2 text-xs font-medium text-muted-foreground'>
                  {route.description ||
                    t('productionArchitecture.routes.noDescription')}
                </p>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex items-center justify-between text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                  <span>
                    {t('productionArchitecture.routes.stepCount', {
                      count: route.steps.length,
                    })}
                  </span>
                  <span>
                    {[
                      route.productSKU,
                      route.productName,
                      route.bomVersionLevel ||
                        t(
                          'productionArchitecture.routes.bomBranch.unspecifiedVersion'
                        ),
                      route.bomOwnerType === 'CUSTOMER'
                        ? `${t('productionArchitecture.routes.bomBranch.customer')}: ${route.bomOwnerCustomerName || route.bomOwnerCustomerId}`
                        : t('productionArchitecture.routes.bomBranch.internal'),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                <div className='space-y-1.5'>
                  {route.steps.slice(0, 4).map((step) => (
                    <div
                      key={step.id}
                      className='flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs'
                    >
                      <span className='flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary'>
                        {step.sequence}
                      </span>
                      <span className='min-w-0 flex-1 truncate font-bold'>
                        {step.processName || step.processStepId}
                      </span>
                    </div>
                  ))}
                  {route.steps.length > 4 && (
                    <p className='px-3 text-[10px] font-bold text-muted-foreground'>
                      {t('productionArchitecture.routes.moreSteps', {
                        count: route.steps.length - 4,
                      })}
                    </p>
                  )}
                </div>
                <div className='flex justify-end gap-2 border-t pt-3'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='rounded-full'
                    onClick={() => setHistoryFamilyId(route.routeFamilyId)}
                    title={t('productionArchitecture.routes.history.view')}
                  >
                    <History className='mr-2 size-4' />
                    {t('productionArchitecture.routes.history.view')}
                  </Button>
                  {route.status === 'DRAFT' && (
                    <Button
                      variant='default'
                      size='sm'
                      className='rounded-full'
                      onClick={() => void handlePublish(route)}
                      disabled={
                        !canManage || isChecking || route.steps.length === 0
                      }
                      title={
                        canManage
                          ? t('productionArchitecture.routes.publish')
                          : t(
                              'productionArchitecture.routes.noManagePermission'
                            )
                      }
                    >
                      <BadgeCheck className='mr-2 size-4' />
                      {t('productionArchitecture.routes.publish')}
                    </Button>
                  )}
                  <Button
                    variant='outline'
                    size='sm'
                    className='rounded-full'
                    onClick={() => openEdit(route)}
                    disabled={
                      !canManage || isChecking || route.status !== 'DRAFT'
                    }
                    title={
                      canManage
                        ? undefined
                        : t('productionArchitecture.routes.noManagePermission')
                    }
                  >
                    {t('common.actions.edit')}
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='rounded-full'
                    onClick={() => void handleDelete(route)}
                    disabled={
                      !canManage || isChecking || route.status !== 'DRAFT'
                    }
                    title={
                      canManage
                        ? t('common.actions.delete')
                        : t('productionArchitecture.routes.noManagePermission')
                    }
                  >
                    <Trash2 className='size-4 text-destructive' />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductionRouteDialog
        open={dialogOpen}
        route={editingRoute}
        bomBranches={bomBranchesQuery.data ?? []}
        bomBranchesLoading={bomBranchesQuery.isLoading}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        onRestoreBranchDefault={handleRestoreBranchDefault}
      />
      <ProductionRouteRevisionHistoryDialog
        open={historyFamilyId !== null}
        routes={historyRoutes}
        canManage={canManage}
        isCheckingPermission={isChecking}
        isCreatingRevision={isCreatingRevision}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryFamilyId(null)
          }
        }}
        onCreateRevision={(route) => void handleCreateRevision(route)}
      />
    </div>
  )
}
