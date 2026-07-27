import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { GitBranch, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
import type { ProductionLine } from '../../data/production-line'
import { productionResourceQueryKeys } from '../../data/production-resource-query-keys'
import type { ProductionRoute } from '../../data/production-route'
import {
  useProductionLinesQuery,
  useProductionRoutesQuery,
} from '../../hooks/use-production-resources'
import { productionRoutesService } from '../../services/production-routes-service'
import {
  ProductionRouteDialog,
  type ProductionRouteSegmentOption,
} from './production-route-dialog'

const logger = createLogger('ProductionRoute')

function buildSegmentOptions(lines: ProductionLine[]) {
  const options: ProductionRouteSegmentOption[] = []
  for (const line of lines) {
    for (const segment of line.segments) {
      options.push({
        id: segment.id,
        label: `${line.name} / ${segment.name}`,
        processes: segment.processes.filter((process) => process.isActive),
      })
    }
  }
  return options
}

function statusTone(status: ProductionRoute['status']) {
  if (status === 'PUBLISHED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
  }
  if (status === 'ARCHIVED') {
    return 'border-slate-500/30 bg-slate-500/10 text-slate-500'
  }
  return 'border-amber-500/30 bg-amber-500/10 text-amber-600'
}

export function ProductionRouteMgmt() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { allowsAction, isChecking } = usePermissionActions()
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState<ProductionRoute | null>(null)
  const routesQuery = useProductionRoutesQuery()
  const linesQuery = useProductionLinesQuery()
  const canManage = allowsAction('action_production_route_manage')
  const routes = routesQuery.data ?? []
  const segmentOptions = useMemo(
    () => buildSegmentOptions(linesQuery.data ?? []),
    [linesQuery.data]
  )

  const filteredRoutes = routes.filter((route) => {
    const search = searchTerm.trim().toLowerCase()
    if (!search) {
      return true
    }
    return `${route.code} ${route.name} ${route.productName}`
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
      await queryClient.invalidateQueries({
        queryKey: productionResourceQueryKeys.routes(),
      })
      toast.success(t('productionArchitecture.routes.toasts.saved'))
    } catch (error) {
      logger.error('Failed to save production route', error)
      toast.error(t('productionArchitecture.routes.toasts.saveFailed'))
      throw error
    }
  }

  const handleDelete = async (route: ProductionRoute) => {
    if (
      !canManage ||
      !window.confirm(
        t('productionArchitecture.routes.deleteConfirm', { name: route.name })
      )
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
            className='h-12 rounded-full border-primary/15 bg-background pl-11 font-semibold'
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
          className='h-11 rounded-full px-5 text-xs font-bold'
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
                      {route.name}
                    </CardTitle>
                    <p className='mt-1 font-mono text-[10px] font-bold text-muted-foreground'>
                      {route.code} · v{route.version}
                    </p>
                  </div>
                  <Badge variant='outline' className={statusTone(route.status)}>
                    {t(
                      `productionArchitecture.routes.statuses.${route.status}`
                    )}
                  </Badge>
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
                    {route.productName ||
                      t('productionArchitecture.routes.productUnbound')}
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
                        {step.processName ||
                          step.processCode ||
                          step.processStepId}
                      </span>
                      <span className='shrink-0 text-[10px] font-bold text-muted-foreground'>
                        {step.segmentName}
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
                    onClick={() => openEdit(route)}
                    disabled={!canManage || isChecking}
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
                    onClick={() => void handleDelete(route)}
                    disabled={!canManage || isChecking}
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
        routes={routes}
        segments={segmentOptions}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
      />
    </div>
  )
}
