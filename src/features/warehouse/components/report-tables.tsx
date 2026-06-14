import { auditUtils } from '@/lib/audit-utils'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { type InboundRecord, type MasterDataSearchResult } from '../inventory'
import { type ShipmentRecord } from '../shipment'

interface InboundTableProps {
  data: InboundRecord[]
  masterDataMap: Record<string, MasterDataSearchResult>
}

export function InboundReportTable({ data, masterDataMap }: InboundTableProps) {
  const { t } = useLanguage()

  return (
    <div className='scrollbar-hide overflow-x-auto rounded-2xl border border-dashed border-muted bg-card/50 shadow-inner md:rounded-[24px]'>
      <table className='w-full min-w-[700px] border-collapse text-left md:min-w-0'>
        <thead className='border-b border-dashed border-muted bg-muted/30'>
          <tr>
            <th className='px-4 py-3 text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:px-6 md:text-[9px]'>
              {t('warehouse.reports.inboundTable.timestamp')}
            </th>
            <th className='px-4 py-3 text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:px-6 md:text-[9px]'>
              {t('warehouse.reports.inboundTable.masterNode')}
            </th>
            <th className='px-4 py-3 text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:px-6 md:text-[9px]'>
              {t('warehouse.reports.inboundTable.batchId')}
            </th>
            <th className='px-4 py-3 text-right text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:px-6 md:text-[9px]'>
              {t('warehouse.reports.inboundTable.quantity')}
            </th>
            <th className='px-4 py-3 text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:px-6 md:text-[9px]'>
              {t('warehouse.reports.inboundTable.area')}
            </th>
            <th className='px-4 py-3 text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:px-6 md:text-[9px]'>
              {t('warehouse.reports.inboundTable.operator')}
            </th>
          </tr>
        </thead>
        <tbody className='divide-y divide-dashed divide-muted text-[11px]'>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className='px-6 py-12 text-center font-black tracking-widest text-muted-foreground/20 uppercase italic'
              >
                {t('warehouse.reports.inboundTable.empty')}
              </td>
            </tr>
          ) : (
            data.map((item) => {
              const master = masterDataMap[item.materialId]
              const operatorName =
                auditUtils.formatOperatorName(item.operator) || item.operator
              return (
                <tr
                  key={item.id}
                  className='group border-b border-dashed border-muted/30 transition-all last:border-none hover:bg-blue-500/5'
                >
                  <td className='px-4 py-2 font-mono text-[9px] tracking-tighter whitespace-nowrap text-muted-foreground/40 md:px-6 md:py-2.5 md:text-[10px]'>
                    {item.entryDate}
                  </td>
                  <td className='px-4 py-2 md:px-6 md:py-2.5'>
                    <div className='max-w-[150px] truncate font-bold tracking-tight text-foreground/90 uppercase transition-colors group-hover:text-blue-600 md:max-w-none'>
                      {master?.name || 'UNKNOWN'}
                    </div>
                    <div className='truncate font-mono text-[7px] tracking-widest text-muted-foreground/30 uppercase md:text-[9px]'>
                      {master?.code || 'VOID'}
                    </div>
                  </td>
                  <td className='px-4 py-2 md:px-6 md:py-2.5'>
                    <span className='font-mono text-[9px] whitespace-nowrap text-muted-foreground/60 uppercase md:text-[10px]'>
                      {item.batchNo || '-'}
                    </span>
                  </td>
                  <td className='px-4 py-2 text-right whitespace-nowrap md:px-6 md:py-2.5'>
                    <span className='font-mono text-xs font-black text-blue-600 md:text-sm'>
                      +{item.quantity}
                    </span>
                    <span className='ml-1 text-[7px] font-black tracking-tighter text-muted-foreground/40 uppercase md:text-[8px]'>
                      {master?.uom}
                    </span>
                  </td>
                  <td className='px-4 py-2 md:px-6 md:py-2.5'>
                    <Badge
                      variant='outline'
                      className='h-3.5 rounded-full border-none bg-muted px-1.5 text-[7px] font-black tracking-widest text-muted-foreground uppercase shadow-sm md:h-4 md:px-2 md:text-[8px]'
                    >
                      {item.targetCategory}
                    </Badge>
                  </td>
                  <td className='px-4 py-2 font-bold tracking-tighter whitespace-nowrap text-muted-foreground uppercase md:px-6 md:py-2.5'>
                    {operatorName}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

interface ShipmentTableProps {
  data: ShipmentRecord[]
  masterDataMap: Record<string, MasterDataSearchResult>
}

export function ShipmentReportTable({
  data,
  masterDataMap,
}: ShipmentTableProps) {
  const { t } = useLanguage()
  const statusConfig: Record<string, { label: string; className: string }> = {
    DRAFT: {
      label: t('warehouse.reports.shipmentTable.statusDraft'),
      className: 'bg-amber-500/10 text-amber-600',
    },
    COMMITTED: {
      label: t('warehouse.reports.shipmentTable.statusCommitted'),
      className: 'bg-blue-500/10 text-blue-600',
    },
    VOID: {
      label: t('warehouse.reports.shipmentTable.statusVoid'),
      className: 'bg-rose-500/10 text-rose-500 line-through',
    },
  }

  return (
    <div className='scrollbar-hide overflow-x-auto rounded-2xl border border-dashed border-muted bg-card/50 shadow-inner md:rounded-[24px]'>
      <table className='w-full min-w-[800px] border-collapse text-left md:min-w-0'>
        <thead className='border-b border-dashed border-muted bg-muted/30'>
          <tr>
            <th className='px-4 py-3 text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:px-6 md:text-[9px]'>
              {t('warehouse.reports.shipmentTable.timestamp')}
            </th>
            <th className='px-4 py-3 text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:px-6 md:text-[9px]'>
              {t('warehouse.reports.shipmentTable.orderBind')}
            </th>
            <th className='px-4 py-3 text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:px-6 md:text-[9px]'>
              {t('warehouse.reports.shipmentTable.masterNode')}
            </th>
            <th className='px-4 py-3 text-right text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:px-6 md:text-[9px]'>
              {t('warehouse.reports.shipmentTable.outQty')}
            </th>
            <th className='px-4 py-3 text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:px-6 md:text-[9px]'>
              {t('warehouse.reports.shipmentTable.source')}
            </th>
            <th className='px-4 py-3 text-center text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:px-6 md:text-[9px]'>
              {t('warehouse.reports.shipmentTable.state')}
            </th>
            <th className='px-4 py-3 text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:px-6 md:text-[9px]'>
              {t('warehouse.reports.shipmentTable.operator')}
            </th>
          </tr>
        </thead>
        <tbody className='divide-y divide-dashed divide-muted text-[11px]'>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className='px-6 py-12 text-center font-black tracking-widest text-muted-foreground/20 uppercase italic'
              >
                {t('warehouse.reports.shipmentTable.empty')}
              </td>
            </tr>
          ) : (
            data.map((item) => {
              const master = masterDataMap[item.materialId]
              const operatorName =
                auditUtils.formatOperatorName(item.operator) || item.operator
              const status = statusConfig[item.status] || {
                label: t('warehouse.reports.shipmentTable.statusFallback', {
                  status: item.status,
                }),
                className: 'bg-slate-100 text-slate-600',
              }
              return (
                <tr
                  key={item.id}
                  className='group border-b border-dashed border-muted/30 transition-all last:border-none hover:bg-blue-500/5'
                >
                  <td className='px-4 py-2 font-mono text-[9px] tracking-tighter whitespace-nowrap text-muted-foreground/40 md:px-6 md:py-2.5 md:text-[10px]'>
                    {item.shipmentDate}
                  </td>
                  <td className='px-4 py-2 md:px-6 md:py-2.5'>
                    <span className='font-mono text-[10px] font-bold tracking-tighter whitespace-nowrap text-foreground uppercase md:text-sm'>
                      {item.orderNo || '-'}
                    </span>
                  </td>
                  <td className='px-4 py-2 md:px-6 md:py-2.5'>
                    <div className='max-w-[120px] overflow-hidden font-bold tracking-tight text-ellipsis whitespace-nowrap text-foreground/90 uppercase transition-colors group-hover:text-blue-600'>
                      {master?.name || 'UNKNOWN'}
                    </div>
                    <div className='truncate font-mono text-[7px] tracking-widest text-muted-foreground/20 uppercase md:text-[8px]'>
                      {master?.code || 'VOID'}
                    </div>
                  </td>
                  <td className='px-4 py-2 text-right whitespace-nowrap md:px-6 md:py-2.5'>
                    <span className='font-mono text-xs font-black text-orange-600 md:text-sm'>
                      -{item.quantity}
                    </span>
                    <span className='ml-1 text-[7px] font-black tracking-tighter text-muted-foreground/40 uppercase md:text-[8px]'>
                      {master?.uom}
                    </span>
                  </td>
                  <td className='px-4 py-2 md:px-6 md:py-2.5'>
                    <Badge
                      variant='outline'
                      className='h-3.5 rounded-full border-none bg-muted px-1.5 text-[7px] font-black tracking-widest text-muted-foreground uppercase shadow-sm md:h-4 md:px-2 md:text-[8px]'
                    >
                      {item.sourceCategory}
                    </Badge>
                  </td>
                  <td className='px-4 py-2 text-center md:px-6 md:py-2.5'>
                    <Badge
                      className={cn(
                        'h-3 rounded-full border-none px-1 text-[7px] font-black tracking-widest uppercase md:h-3.5 md:px-1.5 md:text-[8px]',
                        status.className
                      )}
                    >
                      {status.label}
                    </Badge>
                  </td>
                  <td className='px-4 py-2 font-bold tracking-tighter whitespace-nowrap text-muted-foreground uppercase md:px-6 md:py-2.5'>
                    {operatorName}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
