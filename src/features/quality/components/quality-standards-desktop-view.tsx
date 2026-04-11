import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Layers, Eye, MoreHorizontal } from 'lucide-react'
import { type Standard } from '../data/schema'
import { useLanguage } from '@/context/language-provider'
import { formatQualityActorName, getTypeLabel, getStatusMeta } from '../utils/quality-utils'

interface QualityStandardsDesktopViewProps {
    standards: Standard[]
    onViewDetail: (standard: Standard) => void
    onEdit: (standard: Standard) => void
}

export function QualityStandardsDesktopView({ 
    standards, 
    onViewDetail, 
    onEdit 
}: QualityStandardsDesktopViewProps) {
    const { t } = useLanguage()

    return (
        <div className="relative rounded-[32px] border border-dashed border-muted/50 bg-muted/5 overflow-hidden shadow-inner flex flex-col">
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none" />
            <div className='overflow-x-auto'>
                <Table className="min-w-[1000px] border-separate border-spacing-y-0">
                    <TableHeader className="bg-muted/40 sticky top-0 z-10 box-decoration-clone">
                        <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="w-[180px] text-[9px] font-black uppercase tracking-[0.2em] pl-8 py-5">{t('quality.standards.table.protocolId')}</TableHead>
                            <TableHead className="w-[100px] text-[9px] font-black uppercase tracking-[0.2em] text-center">{t('quality.standards.table.version')}</TableHead>
                            <TableHead className="text-[9px] font-black uppercase tracking-[0.2em]">{t('quality.standards.table.schemaName')}</TableHead>
                            <TableHead className="w-[120px] text-[9px] font-black uppercase tracking-[0.2em] text-center">{t('quality.standards.table.category')}</TableHead>
                            <TableHead className="w-[150px] text-[9px] font-black uppercase tracking-[0.2em] text-center">{t('quality.standards.table.status')}</TableHead>
                            <TableHead className="w-[140px] text-[9px] font-black uppercase tracking-[0.2em]">{t('quality.standards.table.operatorHistory')}</TableHead>
                            <TableHead className="w-[120px] text-[9px] font-black uppercase tracking-[0.2em] pr-8 text-right">{t('quality.standards.table.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {standards.map((standard: Standard) => {
                            const statusMeta = getStatusMeta(t, standard.status)
                            const operatorName = formatQualityActorName(standard.operator)

                            return (
                                <TableRow
                                    key={standard.id}
                                    className="group border-b border-dashed border-muted/50 hover:bg-white/80 cursor-pointer transition-all h-16"
                                    onClick={() => onViewDetail(standard)}
                                >
                                    <TableCell className="font-mono font-black text-[11px] text-secondary/60 pl-8">{standard.code}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="inline-flex h-5 px-2 items-center justify-center rounded-lg bg-primary/5 font-black text-[9px] text-primary border border-primary/10 font-mono tracking-tighter">
                                            VER {standard.version?.toFixed(1) || '1.0'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className='size-8 rounded-xl bg-muted/20 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors'>
                                                <Layers className="size-4 opacity-40 group-hover:opacity-100" />
                                            </div>
                                            <div className='flex flex-col'>
                                                <span className='font-bold text-sm tracking-tight text-slate-700'>{standard.name}</span>
                                                <span className='text-[8px] font-black text-muted-foreground/30 uppercase tracking-widest'>
                                                    {getTypeLabel(t, standard.type)}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest bg-muted/20 px-2 py-1 rounded-md">
                                            {getTypeLabel(t, standard.type)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center">
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusMeta.className}`}>
                                                <div className={`size-1.5 rounded-full ${statusMeta.dotClassName}`} />
                                                <span className="text-[8px] font-black uppercase tracking-widest">{statusMeta.label}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-black text-slate-600 uppercase whitespace-nowrap">{operatorName || t('quality.common.system')}</span>
                                            <span className="text-[8px] font-mono text-muted-foreground/40 tabular-nums">{standard.operateTime ? new Date(standard.operateTime).toLocaleString() : '-'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onEdit(standard)
                                                }}
                                            >
                                                <MoreHorizontal className="size-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-9 rounded-xl hover:bg-blue-500/10 hover:text-blue-500 transition-all active:scale-95"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onViewDetail(standard)
                                                }}
                                            >
                                                <Eye className="size-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
