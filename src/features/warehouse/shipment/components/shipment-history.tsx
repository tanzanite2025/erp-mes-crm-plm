'use client'

import { useRouter } from '@tanstack/react-router'
import {
  History as HistoryIcon,
  Send,
  Trash2,
  RotateCcw,
  Link as LinkIcon,
  Database,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { ApprovalGuard } from '@/features/approval/components/approval-guard'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { canOpenRouteEntry } from '@/features/authz/guards/route-entry-access'
import type { WarehouseCategoryOption } from '../../category/data/schema'
import type { MasterDataSearchResult } from '../../inventory'
import type { ShipmentRecord } from '../data/schema'

interface ShipmentHistoryProps {
  history: ShipmentRecord[]
  activeTab: string
  setActiveTab: (tab: string) => void
  masterDataMap: Record<string, MasterDataSearchResult>
  warehouseCategories: WarehouseCategoryOption[]
  onCommit: (id: string, name: string) => void
  onRemove: (
    id: string,
    name: string,
    quantity: number,
    status: string,
    token?: string
  ) => void
  highlightId?: string
}

export function ShipmentHistory({
  history,
  activeTab,
  setActiveTab,
  masterDataMap,
  warehouseCategories,
  onCommit,
  onRemove,
  highlightId,
}: ShipmentHistoryProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const canOpenShippingLogistics = canOpenRouteEntry(
    user,
    '/shipping-management/logistics'
  )
  const filteredHistory =
    activeTab === 'all'
      ? history
      : history.filter((h) => h.status === activeTab)

  return (
    <div className='flex animate-in flex-col gap-6 duration-700 fade-in'>
      <div className='flex flex-col items-stretch justify-between gap-4 px-1 sm:flex-row sm:items-center md:px-4'>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='w-full sm:w-auto'
        >
          <TabsList className='scrollbar-hide flex h-10 w-full justify-start overflow-x-auto rounded-xl border border-dashed border-muted/50 bg-muted/30 p-1 sm:justify-center md:h-11 md:rounded-2xl'>
            <TabsTrigger
              value='all'
              className='rounded-lg px-4 text-[9px] font-black tracking-widest uppercase italic data-[state=active]:bg-background data-[state=active]:shadow-md md:rounded-xl md:px-6 md:text-[10px]'
            >
              {t('warehouse.shipment.history.all')}
            </TabsTrigger>
            <TabsTrigger
              value='DRAFT'
              className='gap-2 rounded-lg px-4 text-[9px] font-black tracking-widest uppercase italic data-[state=active]:bg-background data-[state=active]:text-amber-600 data-[state=active]:shadow-md md:rounded-xl md:px-6 md:text-[10px]'
            >
              {t('warehouse.shipment.history.draft')}
              <Badge className='h-3.5 border-none bg-amber-500/10 px-1 text-[7px] font-black text-amber-600 md:h-4 md:text-[8px]'>
                {history.filter((h) => h.status === 'DRAFT').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value='COMMITTED'
              className='shrink-0 rounded-lg px-4 text-[9px] font-black tracking-widest uppercase italic data-[state=active]:bg-background data-[state=active]:text-emerald-600 data-[state=active]:shadow-md md:rounded-xl md:px-6 md:text-[10px]'
            >
              {t('warehouse.shipment.history.committed')}
            </TabsTrigger>
            <TabsTrigger
              value='VOID'
              className='shrink-0 rounded-lg px-4 text-[9px] font-black tracking-widest uppercase italic data-[state=active]:bg-background data-[state=active]:text-rose-500 data-[state=active]:shadow-md md:rounded-xl md:px-6 md:text-[10px]'
            >
              {t('warehouse.shipment.history.void')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className='flex items-center gap-3 self-end sm:self-auto'>
          <div className='flex flex-col items-end rounded-xl border border-dashed border-muted/50 bg-muted/20 px-3 py-1.5 md:px-4 md:py-2'>
            <span className='text-[7px] font-black tracking-widest text-muted-foreground/40 uppercase md:text-[8px]'>
              {t('warehouse.shipment.history.traceNodes')}
            </span>
            <span className='text-[10px] font-black tabular-nums md:text-[12px]'>
              {t('warehouse.shipment.history.itemCount', {
                count: history.length,
              })}
            </span>
          </div>
        </div>
      </div>

      <div className='scrollbar-hide overflow-x-auto'>
        <table className='min-w-[900px] border-separate border-spacing-y-2 px-1 text-sm md:min-w-full'>
          <thead>
            <tr className='bg-muted/5'>
              <th className='px-4 py-3 text-left text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase md:px-6 md:py-4 md:text-[10px]'>
                {t('warehouse.shipment.history.columns.idStatus')}
              </th>
              <th className='px-4 py-3 text-left text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase md:px-6 md:py-4 md:text-[10px]'>
                {t('warehouse.shipment.history.columns.nodeContext')}
              </th>
              <th className='px-4 py-3 text-left text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase md:px-6 md:py-4 md:text-[10px]'>
                {t('warehouse.shipment.history.columns.quantity')}
              </th>
              <th className='px-4 py-3 text-left text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase md:px-6 md:py-4 md:text-[10px]'>
                {t('warehouse.shipment.history.columns.sourceArea')}
              </th>
              <th className='px-4 py-3 text-left text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase md:px-6 md:py-4 md:text-[10px]'>
                {t('warehouse.shipment.history.columns.timestamp')}
              </th>
              <th className='px-4 py-3 text-right text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase md:px-6 md:py-4 md:text-[10px]'>
                {t('warehouse.shipment.history.columns.control')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.length > 0 ? (
              filteredHistory.map((record) => {
                const item = masterDataMap[record.materialId]
                const isHighlighted = record.id === highlightId
                return (
                  <tr
                    key={record.id}
                    className={cn(
                      'group cursor-default transition-all duration-300 hover:translate-x-1',
                      isHighlighted
                        ? 'bg-card shadow-xl ring-2 ring-primary/20'
                        : 'border-y border-dashed border-muted/50 bg-card/50 hover:bg-card'
                    )}
                  >
                    <td className='rounded-l-xl border-l-[3px] border-l-transparent px-4 py-3 transition-colors group-hover:border-l-primary/30 md:rounded-l-2xl md:border-l-4 md:px-6 md:py-4'>
                      <div className='flex flex-col gap-1 md:gap-1.5'>
                        <div className='flex items-center gap-2'>
                          <span className='font-mono text-[8px] font-black tracking-widest text-muted-foreground/60 uppercase md:text-[9px]'>
                            #{record.id.slice(-6)}
                          </span>
                          {isHighlighted && (
                            <div className='size-1 animate-ping rounded-full bg-primary md:size-1.5' />
                          )}
                        </div>
                        <div className='flex'>
                          {record.status === 'DRAFT' && (
                            <Badge className='h-3.5 rounded-full border-none bg-amber-500/10 px-1.5 text-[7px] font-black text-amber-600 uppercase md:h-4 md:text-[8px]'>
                              {t('warehouse.shipment.history.draft')}
                            </Badge>
                          )}
                          {record.status === 'COMMITTED' && (
                            <Badge className='h-3.5 shrink-0 rounded-full border-none bg-blue-500/10 px-1.5 text-[7px] font-black tracking-tighter text-blue-600 uppercase md:h-4 md:text-[8px]'>
                              {t('warehouse.shipment.history.committed')}
                            </Badge>
                          )}
                          {record.status === 'VOID' && (
                            <Badge className='h-3.5 rounded-full border-none bg-rose-500/10 px-1.5 text-[7px] font-black text-rose-400 uppercase line-through md:h-4 md:text-[8px]'>
                              {t('warehouse.shipment.history.void')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className='px-4 py-3 md:px-6 md:py-4'>
                      <div className='flex max-w-[150px] flex-col overflow-hidden md:max-w-none'>
                        <span className='truncate text-[12px] font-black tracking-tight text-foreground/90 uppercase transition-colors group-hover:text-primary md:text-[13px]'>
                          {item?.name ||
                            t('warehouse.shipment.history.masterRecord')}
                        </span>
                        <span className='truncate font-mono text-[8px] tracking-widest text-muted-foreground/30 uppercase md:text-[9px]'>
                          {item?.code || 'SKU'}
                        </span>
                      </div>
                    </td>
                    <td className='px-4 py-3 md:px-6 md:py-4'>
                      <div className='flex items-center gap-2 md:gap-3'>
                        <div
                          className={cn(
                            'h-3 w-1 shrink-0 rounded-full',
                            record.status === 'VOID'
                              ? 'bg-muted'
                              : 'bg-primary/40 transition-colors group-hover:bg-primary'
                          )}
                        />
                        <span
                          className={cn(
                            'shrink-0 font-mono text-sm font-black tracking-tighter tabular-nums md:text-[16px]',
                            record.status === 'VOID'
                              ? 'text-muted-foreground/40'
                              : 'text-primary'
                          )}
                        >
                          -{record.quantity.toLocaleString()}{' '}
                          <span className='text-[8px] font-black tracking-widest uppercase opacity-40 md:text-[9px]'>
                            {item?.uom || t('warehouse.shipment.history.units')}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className='px-4 py-3 md:px-6 md:py-4'>
                      <Badge
                        variant='outline'
                        className='h-4 rounded-lg border-none bg-muted/20 px-2 text-[7px] font-black tracking-widest whitespace-nowrap text-muted-foreground uppercase md:h-5 md:rounded-xl md:px-3 md:text-[8px]'
                      >
                        {warehouseCategories.find(
                          (c) => c.value === record.sourceCategory
                        )?.label || record.sourceCategory}
                      </Badge>
                    </td>
                    <td className='px-4 py-3 font-mono text-[8px] font-bold whitespace-nowrap text-muted-foreground/40 md:px-6 md:py-4 md:text-[9px]'>
                      {record.shipmentDate}
                    </td>
                    <td className='rounded-r-xl px-4 py-3 text-right md:rounded-r-2xl md:px-6 md:py-4'>
                      <div className='flex scale-95 justify-end gap-1.5 transition-all group-hover:scale-100 group-hover:opacity-100'>
                        <AuditTimelineTriggerButton
                          module={AUDIT_MODULES.shipment}
                          targetId={record.id}
                          targetName={
                            item?.name ||
                            record.materialName ||
                            t('warehouse.shipment.history.masterRecord')
                          }
                          iconOnly
                          className='size-7 rounded-full border-dashed px-0 text-muted-foreground hover:text-foreground md:size-8'
                        />
                        {record.status === 'DRAFT' && (
                          <>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-7 rounded-full bg-primary/10 px-3 text-[8px] font-black tracking-widest text-primary uppercase shadow-lg shadow-primary/10 transition-all hover:bg-primary hover:text-white md:h-8 md:px-4 md:text-[9px]'
                              onClick={() =>
                                onCommit(
                                  record.id,
                                  item?.name ||
                                    t('warehouse.shipment.history.draft')
                                )
                              }
                            >
                              <Send className='mr-1 size-2 md:mr-2 md:size-2.5' />{' '}
                              {t('warehouse.shipment.history.submit')}
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-7 rounded-full px-2 text-muted-foreground/40 transition-colors hover:bg-rose-500/5 hover:text-rose-500 md:h-8'
                              onClick={() =>
                                onRemove(
                                  record.id,
                                  item?.name ||
                                    t('warehouse.shipment.history.draft'),
                                  record.quantity,
                                  record.status
                                )
                              }
                            >
                              <Trash2 className='size-3 md:size-3.5' />
                            </Button>
                          </>
                        )}
                        {record.status === 'COMMITTED' && (
                          <div className='flex gap-1.5'>
                            {canOpenShippingLogistics ? (
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-7 rounded-full bg-blue-500/10 px-3 text-[8px] font-black tracking-widest text-blue-600 uppercase shadow-lg shadow-blue-500/10 transition-all hover:bg-blue-600 hover:text-white md:h-8 md:px-4 md:text-[9px]'
                                onClick={() =>
                                  router.navigate({
                                    to: '/shipping-management/logistics',
                                    search: {
                                      bindOrderNo: record.orderNo,
                                      bindShipmentId: record.id,
                                    },
                                  })
                                }
                              >
                                <LinkIcon className='mr-1 size-2 md:mr-2 md:size-2.5' />{' '}
                                {t('warehouse.shipment.history.trace')}
                              </Button>
                            ) : null}
                            <ApprovalGuard
                              module='Inventory'
                              action='VOID'
                              targetId={record.id}
                              onApproved={(token) =>
                                onRemove(
                                  record.id,
                                  item?.name ||
                                    t(
                                      'warehouse.shipment.history.masterRecord'
                                    ),
                                  record.quantity,
                                  record.status,
                                  token
                                )
                              }
                            >
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-7 rounded-full bg-rose-500/10 px-3 text-[8px] font-black tracking-widest text-rose-500 uppercase shadow-lg shadow-red-500/10 transition-all hover:bg-rose-600 hover:text-white md:h-8 md:px-4 md:text-[9px]'
                              >
                                <RotateCcw className='mr-1 size-2 md:mr-2 md:size-2.5' />{' '}
                                {t('warehouse.shipment.history.markVoid')}
                              </Button>
                            </ApprovalGuard>
                          </div>
                        )}
                        {record.status === 'VOID' && (
                          <span className='flex items-center gap-1 pr-2 text-[8px] font-black tracking-widest text-muted-foreground/20 uppercase md:gap-2 md:pr-4 md:text-[9px]'>
                            <Database className='size-2.5 md:size-3' />{' '}
                            {t('warehouse.shipment.history.locked')}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className='mt-4 h-48 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 text-center'
                >
                  <div className='flex flex-col items-center justify-center gap-4 opacity-20'>
                    <HistoryIcon className='size-16' />
                    <p className='text-[11px] font-black tracking-[0.3em] text-muted-foreground uppercase italic'>
                      {t('warehouse.shipment.history.empty')}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
