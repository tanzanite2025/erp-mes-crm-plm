import React, { useMemo } from 'react'
import { format } from 'date-fns'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  History,
  User,
  Clock,
  ArrowRight,
  Minus,
  Plus,
  Hash,
} from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { getDefaultPermissions } from '@/features/authz/data/default-permission-queries'
import { formatPermissionLabel } from '@/features/authz/utils/permission-tree-utils'
import { type Product } from '@/features/engineering/data/schema'
import {
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
  PRODUCT_TEMPLATES_QUERY_KEY,
  PRODUCT_TYPES_QUERY_KEY,
  productOptionsQueryKey,
} from '@/features/engineering/query-keys'
import { ProductAttributeCategoryService } from '@/features/engineering/services/product-attribute-category-service'
import { ProductAttributeOptionService } from '@/features/engineering/services/product-attribute-option-service'
import { ProductCoreService } from '@/features/engineering/services/product-core-service'
import { productTemplateService } from '@/features/engineering/services/product-template-service'
import { ProductTypeService } from '@/features/engineering/services/product-type-service'
import { type MaterialOption } from '@/features/material-archive/data/schema'
import { MATERIAL_OPTIONS_QUERY_KEY } from '@/features/material-archive/query-keys'
import { MaterialCoreService } from '@/features/material-archive/services/material-core-service'
import { AUDIT_MODULES, type AuditModuleValue } from '../data/audit-modules'
import { useAuditTimeline } from '../hooks/use-audit-timeline'
import { buildPermissionLabelMap } from '../utils/permission-audit'
import { BomAuditEntry } from './bom-audit-entry'
import { ProductAuditEntry } from './product-audit-entry'
import { UserPermissionAuditEntry } from './user-permission-audit-entry'

interface DataTimelineProps {
  module: AuditModuleValue
  targetId?: string
  targetName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function normalizeAuditDisplayText(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || '—'
  }
  if (Array.isArray(value)) {
    const items = value
      .map((item) => normalizeAuditDisplayText(item))
      .filter((item) => item !== '—')
    return items.length > 0 ? items.join(', ') : '—'
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '—'
    }
  }
  return String(value)
}

function formatAuditActionLabel(
  action: string,
  t: ReturnType<typeof useLanguage>['t']
) {
  switch (action.trim().toLowerCase()) {
    case 'create':
      return t('common.audit.actionLabels.create')
    case 'save':
      return t('common.audit.actionLabels.save')
    case 'update':
      return t('common.audit.actionLabels.update')
    case 'patch':
      return t('common.audit.actionLabels.patch')
    case 'replace':
      return t('common.audit.actionLabels.replace')
    case 'delete':
      return t('common.audit.actionLabels.delete')
    case 'added':
      return t('common.audit.actionLabels.added')
    case 'removed':
      return t('common.audit.actionLabels.removed')
    case 'bulk_sync':
    case 'bulksync':
      return t('common.audit.actionLabels.bulkSync')
    default:
      return action.replace(/_/g, ' ').trim() || action
  }
}

export const DataTimeline: React.FC<DataTimelineProps> = ({
  module,
  targetId,
  targetName,
  open,
  onOpenChange,
}) => {
  const { t } = useLanguage()
  const { data: logs, isLoading } = useAuditTimeline(module, targetId)
  const permissionLabelMap = useMemo(() => {
    if (module !== AUDIT_MODULES.userPermission) {
      return new Map<string, string>()
    }

    return buildPermissionLabelMap(
      getDefaultPermissions(),
      formatPermissionLabel
    )
  }, [module])
  const materialsQuery = useQuery({
    queryKey: MATERIAL_OPTIONS_QUERY_KEY,
    queryFn: (): Promise<MaterialOption[]> =>
      MaterialCoreService.getMaterialOptions(),
    enabled: module === AUDIT_MODULES.bom && open,
  })
  const materialOptionMap = useMemo(() => {
    if (module !== AUDIT_MODULES.bom) {
      return new Map<string, MaterialOption>()
    }

    return new Map(
      (materialsQuery.data ?? []).map((material) => [material.id, material])
    )
  }, [materialsQuery.data, module])
  const productAttributeCategoriesQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
    queryFn: () =>
      ProductAttributeCategoryService.getProductAttributeCategories(),
    enabled: module === AUDIT_MODULES.product && open,
  })
  const productAttributeOptionsQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
    queryFn: () => ProductAttributeOptionService.getProductAttributeOptions(),
    enabled: module === AUDIT_MODULES.product && open,
  })
  const productTemplatesQuery = useQuery({
    queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
    queryFn: () => productTemplateService.getTemplates(),
    enabled: module === AUDIT_MODULES.product && open,
  })
  const productTypesQuery = useQuery({
    queryKey: PRODUCT_TYPES_QUERY_KEY,
    queryFn: () => ProductTypeService.getProductTypes(),
    enabled: module === AUDIT_MODULES.product && open,
  })
  const productOptionsQuery = useQuery({
    queryKey: productOptionsQueryKey(),
    queryFn: () => ProductCoreService.getProducts({ isOptions: true }),
    enabled: module === AUDIT_MODULES.product && open,
  })
  const unresolvedProductIds = useMemo(() => {
    if (module !== AUDIT_MODULES.product) {
      return [] as string[]
    }

    const loadedProductIds = new Set(
      (productOptionsQuery.data ?? []).map((product) => product.id)
    )
    const uniqueIds = new Set<string>()

    ;(logs ?? []).forEach((log) => {
      const targetIdValue = String(log.target_id || '').trim()
      if (!targetIdValue || loadedProductIds.has(targetIdValue)) {
        return
      }

      uniqueIds.add(targetIdValue)
    })

    return Array.from(uniqueIds)
  }, [logs, module, productOptionsQuery.data])
  const productDetailQueries = useQueries({
    queries: unresolvedProductIds.map((productId) => ({
      queryKey: ['engineering', 'products', 'audit-detail', productId] as const,
      queryFn: () => ProductCoreService.getProductById(productId),
      enabled:
        module === AUDIT_MODULES.product && open && productId.trim().length > 0,
      retry: false,
    })),
  })
  const resolvedProducts = (() => {
    const mergedProductMap = new Map<string, Product>()

    ;(productOptionsQuery.data ?? []).forEach((product) => {
      mergedProductMap.set(product.id, product)
    })

    productDetailQueries.forEach((query, index) => {
      const productId = unresolvedProductIds[index]
      if (!productId || !query.data) {
        return
      }

      mergedProductMap.set(productId, query.data)
    })

    return Array.from(mergedProductMap.values())
  })()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='bottom'
        className='h-[72vh] w-full gap-0 rounded-t-[32px] border-t border-dashed border-primary/20 bg-background/95 p-0 pt-0 shadow-2xl backdrop-blur-sm'
      >
        {/* Header - UDS 1.0 Style */}
        <SheetHeader className='border-b border-dashed bg-muted/5 p-6 pb-4'>
          <div className='flex items-center gap-3'>
            <div className='rounded-xl bg-primary/10 p-2'>
              <History className='h-5 w-5 text-primary' />
            </div>
            <div>
              <SheetTitle className='text-lg font-black tracking-tighter uppercase italic'>
                {t('common.audit.title')}
              </SheetTitle>
              <SheetDescription className='text-[9px] font-black tracking-widest uppercase opacity-60'>
                {targetId
                  ? t('common.audit.objectDescription', {
                      target: targetName || targetId,
                    })
                  : t('common.audit.moduleDescription', {
                      target: targetName || module,
                    })}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className='flex-1 px-6'>
          <div className='animate-in space-y-8 py-8 duration-700 fade-in slide-in-from-right-4'>
            {isLoading ? (
              <div className='flex flex-col items-center justify-center gap-4 py-20 opacity-20'>
                <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent' />
                <span className='text-[10px] font-black tracking-widest uppercase'>
                  {t('common.audit.loading')}
                </span>
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className='flex flex-col items-center justify-center gap-4 rounded-[32px] border border-dashed py-20 opacity-20'>
                <Hash className='h-8 w-8' />
                <span className='text-[10px] font-black tracking-widest uppercase'>
                  {t('common.audit.empty')}
                </span>
              </div>
            ) : (
              <div className='relative ml-3 space-y-6 border-l border-dashed border-muted-foreground/30 pl-8'>
                {logs.map((log) => (
                  <div key={log.id} className='group relative'>
                    {/* Timeline Node */}
                    <div className='absolute top-0 -left-[37px] h-4 w-4 rounded-full border-2 border-background bg-muted-foreground/20 transition-colors group-hover:bg-primary' />

                    {/* Diff Cards */}
                    {module === AUDIT_MODULES.bom ? (
                      <BomAuditEntry
                        log={log}
                        actionLabel={formatAuditActionLabel(log.action, t)}
                        materialOptionMap={materialOptionMap}
                      />
                    ) : module === AUDIT_MODULES.product ? (
                      <ProductAuditEntry
                        log={log}
                        actionLabel={formatAuditActionLabel(log.action, t)}
                        attributeCategories={
                          productAttributeCategoriesQuery.data ?? []
                        }
                        attributeOptions={
                          productAttributeOptionsQuery.data ?? []
                        }
                        productTemplates={productTemplatesQuery.data ?? []}
                        productTypes={productTypesQuery.data ?? []}
                        products={resolvedProducts}
                      />
                    ) : module === AUDIT_MODULES.userPermission ? (
                      <UserPermissionAuditEntry
                        log={log}
                        actionLabel={formatAuditActionLabel(log.action, t)}
                        permissionLabelMap={permissionLabelMap}
                      />
                    ) : (
                      <div className='space-y-3'>
                        <div className='mb-4 flex flex-col gap-1'>
                          <div className='flex items-center gap-3'>
                            <span className='text-[10px] font-black tracking-tighter text-primary uppercase italic'>
                              {formatAuditActionLabel(log.action, t)}
                            </span>
                            <div className='flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5'>
                              <User className='h-2.5 w-2.5 opacity-50' />
                              <span className='font-mono text-[8px] font-bold uppercase'>
                                {log.operator}
                              </span>
                            </div>
                          </div>
                          <div className='flex items-center gap-2 opacity-50'>
                            <Clock className='h-2.5 w-2.5' />
                            <span className='font-mono text-[8px]'>
                              {format(
                                new Date(log.created_at),
                                'yyyy-MM-dd HH:mm:ss'
                              )}
                            </span>
                            <span className='font-mono text-[8px] opacity-50'>
                              {t('common.audit.ipLabel')}: {log.ip}
                            </span>
                          </div>
                        </div>
                        {log.diff?.map((item, idx) => (
                          <div
                            key={idx}
                            className='overflow-hidden rounded-2xl border border-dashed bg-muted/5'
                          >
                            <div className='flex items-center justify-between border-b border-dashed bg-muted/20 px-3 py-1.5'>
                              <span className='text-[9px] font-black tracking-widest uppercase opacity-70'>
                                {item.a || item.f}
                              </span>
                              <span className='font-mono text-[7px] uppercase opacity-30'>
                                {item.f}
                              </span>
                            </div>
                            <div className='grid grid-cols-[1fr,auto,1fr] items-center gap-3 p-3'>
                              <div className='flex flex-col gap-1'>
                                <span className='text-[7px] font-black tracking-widest uppercase opacity-40'>
                                  {t('common.audit.before')}
                                </span>
                                <div className='rounded-xl border border-destructive/10 bg-destructive/5 p-2 font-mono text-[10px] break-all text-destructive'>
                                  <Minus className='mr-1 inline h-2 w-2' />
                                  {normalizeAuditDisplayText(item.o)}
                                </div>
                              </div>
                              <ArrowRight className='h-3 w-3 opacity-20' />
                              <div className='flex flex-col gap-1'>
                                <span className='text-[7px] font-black tracking-widest uppercase opacity-40'>
                                  {t('common.audit.after')}
                                </span>
                                <div className='rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-2 font-mono text-[10px] break-all text-emerald-600'>
                                  <Plus className='mr-1 inline h-2 w-2' />
                                  {normalizeAuditDisplayText(item.n)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer - UDS 1.0 */}
        <div className='border-t border-dashed bg-muted/5 p-6'>
          <div className='flex items-center justify-between'>
            <span className='font-mono text-[8px] uppercase opacity-40'>
              {t('common.audit.archivalPolicy')}
            </span>
            <div className='flex gap-2'>
              <div className='h-1 w-1 animate-pulse rounded-full bg-emerald-500' />
              <span className='text-[8px] font-black tracking-widest text-emerald-600 uppercase'>
                {t('common.audit.engineActive')}
              </span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
