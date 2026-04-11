import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/language-provider'
import { auditUtils } from '@/lib/audit-utils'
import { cn } from '@/lib/utils'
import { type InboundRecord, type MasterDataSearchResult } from '../inventory'
import { type ShipmentRecord } from '../shipment'

interface InboundTableProps {
    data: InboundRecord[]
    masterDataMap: Record<string, MasterDataSearchResult>
}

export function InboundReportTable({ data, masterDataMap }: InboundTableProps) {
    const { t } = useLanguage()

    return (
        <div className='rounded-2xl md:rounded-[24px] border border-dashed border-muted overflow-x-auto bg-white/50 shadow-inner scrollbar-hide'>
            <table className='w-full text-left border-collapse min-w-[700px] md:min-w-0'>
                <thead className='bg-muted/30 border-b border-dashed border-muted'>
                    <tr>
                        <th className='px-4 md:px-6 py-3 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{t('warehouse.reports.inboundTable.timestamp')}</th>
                        <th className='px-4 md:px-6 py-3 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{t('warehouse.reports.inboundTable.masterNode')}</th>
                        <th className='px-4 md:px-6 py-3 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{t('warehouse.reports.inboundTable.batchId')}</th>
                        <th className='px-4 md:px-6 py-3 text-right text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{t('warehouse.reports.inboundTable.quantity')}</th>
                        <th className='px-4 md:px-6 py-3 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{t('warehouse.reports.inboundTable.area')}</th>
                        <th className='px-4 md:px-6 py-3 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{t('warehouse.reports.inboundTable.operator')}</th>
                    </tr>
                </thead>
                <tbody className='divide-y divide-dashed divide-muted text-[11px]'>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={6} className='px-6 py-12 text-center text-muted-foreground/20 font-black uppercase tracking-widest italic'>{t('warehouse.reports.inboundTable.empty')}</td>
                        </tr>
                    ) : (
                        data.map(item => {
                            const master = masterDataMap[item.materialId]
                            const operatorName = auditUtils.formatOperatorName(item.operator) || item.operator
                            return (
                                <tr key={item.id} className='hover:bg-blue-500/5 transition-all group border-b border-dashed border-muted/30 last:border-none'>
                                    <td className='px-4 md:px-6 py-2 md:py-2.5 font-mono text-[9px] md:text-[10px] text-muted-foreground/40 tracking-tighter whitespace-nowrap'>{item.entryDate}</td>
                                    <td className='px-4 md:px-6 py-2 md:py-2.5'>
                                        <div className='font-bold text-slate-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors truncate max-w-[150px] md:max-w-none'>{master?.name || 'UNKNOWN'}</div>
                                        <div className='text-[7px] md:text-[9px] font-mono text-muted-foreground/30 uppercase tracking-widest truncate'>{master?.code || 'VOID'}</div>
                                    </td>
                                    <td className='px-4 md:px-6 py-2 md:py-2.5'>
                                        <span className='font-mono text-[9px] md:text-[10px] text-muted-foreground/60 uppercase whitespace-nowrap'>{item.batchNo || '-'}</span>
                                    </td>
                                    <td className='px-4 md:px-6 py-2 md:py-2.5 text-right whitespace-nowrap'>
                                        <span className='font-black font-mono text-blue-600 text-xs md:text-sm'>+{item.quantity}</span>
                                        <span className='ml-1 text-[7px] md:text-[8px] font-black text-muted-foreground/40 uppercase tracking-tighter'>{master?.uom}</span>
                                    </td>
                                    <td className='px-4 md:px-6 py-2 md:py-2.5'>
                                        <Badge variant='outline' className='bg-white border-none shadow-sm text-slate-500 text-[7px] md:text-[8px] font-black uppercase tracking-widest h-3.5 md:h-4 px-1.5 md:px-2 rounded-full'>{item.targetCategory}</Badge>
                                    </td>
                                    <td className='px-4 md:px-6 py-2 md:py-2.5 font-bold text-slate-500 uppercase tracking-tighter whitespace-nowrap'>{operatorName}</td>
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

export function ShipmentReportTable({ data, masterDataMap }: ShipmentTableProps) {
    const { t } = useLanguage()
    const statusConfig: Record<string, { label: string; className: string }> = {
        DRAFT: { label: t('warehouse.reports.shipmentTable.statusDraft'), className: 'bg-amber-500/10 text-amber-600' },
        COMMITTED: { label: t('warehouse.reports.shipmentTable.statusCommitted'), className: 'bg-blue-500/10 text-blue-600' },
        VOID: { label: t('warehouse.reports.shipmentTable.statusVoid'), className: 'bg-rose-500/10 text-rose-500 line-through' }
    }

    return (
        <div className='rounded-2xl md:rounded-[24px] border border-dashed border-muted overflow-x-auto bg-white/50 shadow-inner scrollbar-hide'>
            <table className='w-full text-left border-collapse min-w-[800px] md:min-w-0'>
                <thead className='bg-muted/30 border-b border-dashed border-muted'>
                    <tr>
                        <th className='px-4 md:px-6 py-3 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{t('warehouse.reports.shipmentTable.timestamp')}</th>
                        <th className='px-4 md:px-6 py-3 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{t('warehouse.reports.shipmentTable.orderBind')}</th>
                        <th className='px-4 md:px-6 py-3 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{t('warehouse.reports.shipmentTable.masterNode')}</th>
                        <th className='px-4 md:px-6 py-3 text-right text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{t('warehouse.reports.shipmentTable.outQty')}</th>
                        <th className='px-4 md:px-6 py-3 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{t('warehouse.reports.shipmentTable.source')}</th>
                        <th className='px-4 md:px-6 py-3 text-center text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{t('warehouse.reports.shipmentTable.state')}</th>
                        <th className='px-4 md:px-6 py-3 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>{t('warehouse.reports.shipmentTable.operator')}</th>
                    </tr>
                </thead>
                <tbody className='divide-y divide-dashed divide-muted text-[11px]'>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={7} className='px-6 py-12 text-center text-muted-foreground/20 font-black uppercase tracking-widest italic'>{t('warehouse.reports.shipmentTable.empty')}</td>
                        </tr>
                    ) : (
                        data.map(item => {
                            const master = masterDataMap[item.materialId]
                            const operatorName = auditUtils.formatOperatorName(item.operator) || item.operator
                            const status = statusConfig[item.status] || {
                                label: t('warehouse.reports.shipmentTable.statusFallback', { status: item.status }),
                                className: 'bg-slate-100 text-slate-600'
                            }
                            return (
                                <tr key={item.id} className='hover:bg-blue-500/5 transition-all group border-b border-dashed border-muted/30 last:border-none'>
                                    <td className='px-4 md:px-6 py-2 md:py-2.5 font-mono text-[9px] md:text-[10px] text-muted-foreground/40 tracking-tighter whitespace-nowrap'>{item.shipmentDate}</td>
                                    <td className='px-4 md:px-6 py-2 md:py-2.5'>
                                        <span className='font-mono font-bold text-[10px] md:text-sm text-slate-800 uppercase tracking-tighter whitespace-nowrap'>{item.orderNo || '-'}</span>
                                    </td>
                                    <td className='px-4 md:px-6 py-2 md:py-2.5'>
                                        <div className='font-bold text-slate-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors text-ellipsis overflow-hidden max-w-[120px] whitespace-nowrap'>{master?.name || 'UNKNOWN'}</div>
                                        <div className='text-[7px] md:text-[8px] font-mono text-muted-foreground/20 uppercase tracking-widest truncate'>{master?.code || 'VOID'}</div>
                                    </td>
                                    <td className='px-4 md:px-6 py-2 md:py-2.5 text-right whitespace-nowrap'>
                                        <span className='font-black font-mono text-orange-600 text-xs md:text-sm'>-{item.quantity}</span>
                                        <span className='ml-1 text-[7px] md:text-[8px] font-black text-muted-foreground/40 uppercase tracking-tighter'>{master?.uom}</span>
                                    </td>
                                    <td className='px-4 md:px-6 py-2 md:py-2.5'>
                                        <Badge variant='outline' className='bg-white border-none shadow-sm text-slate-500 text-[7px] md:text-[8px] font-black uppercase tracking-widest h-3.5 md:h-4 px-1.5 md:px-2 rounded-full'>{item.sourceCategory}</Badge>
                                    </td>
                                    <td className='px-4 md:px-6 py-2 md:py-2.5 text-center'>
                                        <Badge className={cn(
                                            'text-[7px] md:text-[8px] font-black uppercase tracking-widest px-1 md:px-1.5 h-3 md:h-3.5 border-none rounded-full',
                                            status.className
                                        )}>
                                            {status.label}
                                        </Badge>
                                    </td>
                                    <td className='px-4 md:px-6 py-2 md:py-2.5 font-bold text-slate-500 uppercase tracking-tighter whitespace-nowrap'>{operatorName}</td>
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>
        </div>
    )
}
