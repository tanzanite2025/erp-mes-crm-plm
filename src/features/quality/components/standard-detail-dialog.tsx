import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import { type Standard, type StandardItem, type LevelConfig } from '../data/schema'
import { ClipboardCheck, Hash, Layers, Info, MoveHorizontal, Inbox, ShieldCheck, Plus, Check, User, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as React from 'react'
import { useLanguage } from '@/context/language-provider'
import { formatQualityActorName, formatQualityDateTime, getQualityAuditMeta } from '../utils/quality-utils'

function getTypeLabel(t: ReturnType<typeof useLanguage>['t'], type?: string) {
    const normalized = type?.toUpperCase()
    if (type === '巡检' || normalized === 'IPQC') return t('quality.standards.values.typeProcess')
    if (type === '首检' || normalized === 'FQC') return t('quality.standards.values.typeFinal')
    return t('quality.standards.values.typeQuality')
}

function getStatusLabel(t: ReturnType<typeof useLanguage>['t'], status?: string) {
    const normalized = status?.toUpperCase()
    if (status === '已归档' || normalized === 'ARCHIVED') return t('quality.standards.values.statusArchived')
    if (status === '待审核' || normalized === 'DRAFT' || normalized === 'PENDING') return t('quality.standards.values.statusPending')
    if (status === '已发布' || normalized === 'PUBLISHED') return t('quality.standards.values.statusPublished')
    return status || t('quality.common.unknown')
}

interface StandardDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    standard: Standard | null
}

export function StandardDetailDialog({
    open,
    onOpenChange,
    standard,
}: StandardDetailDialogProps) {
    const { t, locale } = useLanguage()
    if (!standard) return null

    const hasItems = standard.items && standard.items.length > 0
    const operatorName = formatQualityActorName(standard.operator)
    const auditorName = formatQualityActorName(standard.auditor)
    const operateTimeText = formatQualityDateTime(standard.operateTime)
    const auditTimeText = formatQualityDateTime(standard.auditTime)
    const auditMeta = getQualityAuditMeta(locale, standard.status, standard.auditor)
    const auditTitle = locale === 'zh-CN' ? '审核履历' : 'Audit Trail'
    const auditHint =
        locale === 'zh-CN'
            ? '展示当前标准的制单、更新时间与审核确认信息，便于质量追溯与版本核对。'
            : 'Shows the current standard owner, last update, and review confirmation for quality traceability.'
    const operatorLabel = locale === 'zh-CN' ? '制单人' : 'Owner'
    const operateTimeLabel = locale === 'zh-CN' ? '更新时间' : 'Updated At'
    const auditorLabel = locale === 'zh-CN' ? '审核人' : 'Reviewer'
    const auditTimeLabel = locale === 'zh-CN' ? '审核时间' : 'Reviewed At'
    const auditPendingText = locale === 'zh-CN' ? '待审核' : 'Pending Review'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-none w-[96vw] max-w-[96vw] h-[85vh] lg:h-[78vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl lg:rounded-[2.5rem] bg-background/95 backdrop-blur-3xl transition-all duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20 z-50 transition-opacity" />

                <div className="p-4 lg:p-6 pt-6 lg:pt-8 bg-muted/20 border-b border-white/5 space-y-4 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 lg:gap-4">
                            <div className="p-2.5 lg:p-3.5 bg-primary/10 rounded-xl lg:rounded-2xl border border-primary/20 shadow-inner shrink-0 scale-90 lg:scale-100">
                                <ClipboardCheck className="size-5 lg:size-8 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="text-lg lg:text-2xl font-black tracking-tighter uppercase flex items-center gap-2 lg:gap-3 truncate">
                                    {t('quality.standards.dialog.detail.title')} <span className="text-muted-foreground/30 font-thin">|</span> <span className="text-primary truncate">{standard.code}</span>
                                </DialogTitle>
                                <DialogDescription className="text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-40 truncate">
                                    {t('quality.standards.dialog.detail.subtitle')}
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 bg-background/40 p-1.5 rounded-xl border border-white/5">
                            <Badge className="px-3 lg:px-4 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border-none font-black uppercase text-[9px] lg:text-[10px] tracking-widest">
                                {getStatusLabel(t, standard.status)}
                            </Badge>
                            <div className="w-px h-3 bg-white/10" />
                            <span className="text-[9px] lg:text-[10px] text-muted-foreground font-black px-2 uppercase opacity-60">VERSION {standard.version.toFixed(1)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                        <InfoCard icon={Hash} label={t('quality.standards.dialog.detail.fields.code')} value={standard.code} />
                        <InfoCard icon={Layers} label={t('quality.standards.dialog.detail.fields.name')} value={standard.name} className="sm:col-span-2" />
                        <InfoCard icon={Info} label={t('quality.standards.dialog.detail.fields.type')} value={getTypeLabel(t, standard.type)} highlight />
                    </div>

                    <div className="rounded-2xl border border-dashed border-white/10 bg-background/50 p-4 lg:p-5 shadow-inner">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">
                                    {auditTitle}
                                </p>
                                <p className="mt-1 text-[10px] font-medium leading-5 text-muted-foreground/60">
                                    {auditHint}
                                </p>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0 sm:justify-end">
                                <Badge variant="outline" className="w-fit rounded-full border-dashed bg-muted/20 px-3 py-1 text-[9px] font-black uppercase tracking-widest">
                                    {getStatusLabel(t, standard.status)}
                                </Badge>
                                <AuditStatusDisplay meta={auditMeta} />
                            </div>
                        </div>

                        <AuditStatusDisplay meta={auditMeta} showNote className="mt-3" />

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <InfoCard
                                icon={User}
                                label={operatorLabel}
                                value={operatorName || t('quality.common.system')}
                            />
                            <InfoCard
                                icon={Clock3}
                                label={operateTimeLabel}
                                value={operateTimeText || '-'}
                            />
                            <InfoCard
                                icon={ShieldCheck}
                                label={auditorLabel}
                                value={auditorName || auditPendingText}
                            />
                            <InfoCard
                                icon={Clock3}
                                label={auditTimeLabel}
                                value={auditTimeText || '-'}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col relative bg-muted/5">
                    {hasItems ? (
                        <>
                            <div className="absolute right-6 bottom-6 z-40 animate-bounce bg-primary/40 p-2.5 rounded-full backdrop-blur-md shadow-2xl border border-primary/50 pointer-events-none lg:opacity-0 group-hover:lg:opacity-100 transition-opacity">
                                <MoveHorizontal className="size-4 text-white" />
                            </div>

                            <div className="flex-1 overflow-auto p-4 lg:p-6 lg:pt-4 scrollbar-thin">
                                <Table className="border-separate border-spacing-0 min-w-[1650px]">
                                    <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-xl z-30">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[180px] h-12 lg:h-14 bg-muted/40 font-black text-[9px] lg:text-[10px] uppercase tracking-widest border border-white/10 text-center sticky left-0 z-40 backdrop-blur-xl shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                                {t('quality.standards.dialog.detail.table.item')}
                                                <div className="absolute bottom-0 right-0 w-px h-full bg-white/10" />
                                            </TableHead>
                                            <TableHead className="w-[80px] bg-muted/40 font-black text-[9px] lg:text-[10px] uppercase tracking-widest text-center border border-white/10 border-l-0 whitespace-nowrap">{t('quality.standards.dialog.detail.table.order')}</TableHead>
                                            <TableHead className="w-[100px] bg-muted/40 font-black text-[9px] lg:text-[10px] uppercase tracking-widest text-center border border-white/10 border-l-0 whitespace-nowrap">{t('quality.standards.dialog.detail.table.centerValue')}</TableHead>
                                            <TableHead className="w-[90px] bg-primary/5 text-primary font-black text-[9px] lg:text-[10px] uppercase tracking-widest text-center border border-white/10 border-l-0 whitespace-nowrap">{t('quality.standards.dialog.detail.table.level')}</TableHead>
                                            <TableHead className="w-[110px] bg-primary/5 text-primary font-black text-[9px] lg:text-[10px] uppercase tracking-widest text-center border border-white/10 border-l-0 whitespace-nowrap">{t('quality.standards.dialog.detail.table.tolerance')}</TableHead>
                                            <TableHead className="w-[110px] bg-primary/5 text-primary font-black text-[9px] lg:text-[10px] uppercase tracking-widest text-center border border-white/10 border-l-0 whitespace-nowrap">{t('quality.standards.dialog.detail.table.min')}</TableHead>
                                            <TableHead className="w-[110px] bg-primary/5 text-primary font-black text-[9px] lg:text-[10px] uppercase tracking-widest text-center border border-white/10 border-l-0 whitespace-nowrap">{t('quality.standards.dialog.detail.table.max')}</TableHead>
                                            <TableHead className="w-[130px] bg-red-500/5 text-red-500 font-black text-[9px] lg:text-[10px] uppercase tracking-widest text-center border border-white/10 border-l-0 whitespace-nowrap">{t('quality.standards.dialog.detail.table.errorCodeLower')}</TableHead>
                                            <TableHead className="w-[130px] bg-red-500/5 text-red-500 font-black text-[9px] lg:text-[10px] uppercase tracking-widest text-center border border-white/10 border-l-0 whitespace-nowrap">{t('quality.standards.dialog.detail.table.errorCodeUpper')}</TableHead>
                                            <TableHead className="w-[80px] bg-muted/40 font-black text-[9px] lg:text-[10px] uppercase tracking-widest text-center border border-white/10 border-l-0 whitespace-nowrap">{t('quality.standards.dialog.detail.table.unit')}</TableHead>
                                            <TableHead className="w-[90px] bg-muted/40 font-black text-[9px] lg:text-[10px] uppercase tracking-widest text-center border border-white/10 border-l-0 whitespace-nowrap">{t('quality.standards.dialog.detail.table.required')}</TableHead>
                                            <TableHead className="bg-muted/40 font-black text-[9px] lg:text-[10px] uppercase tracking-widest border border-white/10 border-l-0 text-center uppercase tracking-[0.2em] whitespace-nowrap">{t('quality.standards.dialog.detail.table.remarks')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {standard.items.map((item: StandardItem) => (
                                            <React.Fragment key={item.id}>
                                                <TableRow className="group transition-colors h-14">
                                                    <TableCell rowSpan={item.levels.length} className="font-black text-center border border-white/10 border-t-0 bg-muted/10 group-hover:bg-muted/20 text-[11px] lg:text-xs px-4 sticky left-0 z-20 backdrop-blur shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                                        {item.name}
                                                        <div className="absolute bottom-0 right-0 w-px h-full bg-white/20 shadow-[2px_0_8px_rgba(0,0,0,0.2)]" />
                                                    </TableCell>
                                                    <TableCell rowSpan={item.levels.length} className="text-center font-mono text-[9px] lg:text-[10px] opacity-40 border border-white/10 border-t-0 border-l-0 whitespace-nowrap">{item.order}</TableCell>
                                                    <TableCell rowSpan={item.levels.length} className="text-center font-black text-[11px] lg:text-xs border border-white/10 border-t-0 border-l-0 bg-muted/5 whitespace-nowrap">{item.centerValue?.toFixed(2)}</TableCell>
                                                    <LevelRow level={item.levels[0]} remarks={item.remarks} unit={item.unit} isRequired={item.isRequired} t={t} rowSpan={item.levels.length} />
                                                </TableRow>
                                                {item.levels.slice(1).map((level: LevelConfig) => (
                                                    <TableRow key={`${item.id}-${level.level}`} className="group transition-colors h-10">
                                                        <LevelCells level={level} />
                                                    </TableRow>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in-95 duration-500">
                            <div className="p-6 bg-background/50 rounded-[2.5rem] border border-dashed border-white/10 shadow-2xl mb-6 relative group">
                                <Inbox className="size-16 lg:size-24 text-muted-foreground/10 group-hover:text-primary/10 transition-colors duration-500" />
                                <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 lg:size-10 text-primary/20" />
                            </div>
                            <h3 className="text-base lg:text-xl font-black tracking-tight uppercase mb-2">{t('quality.standards.dialog.detail.emptyTitle')}</h3>
                            <p className="max-w-xs text-[10px] lg:text-xs text-muted-foreground font-medium leading-relaxed opacity-50">
                                {t('quality.standards.dialog.detail.emptyDescription', { code: standard.code })}
                            </p>
                            <div className="mt-8">
                                <Button className="rounded-xl h-9 px-6 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-black text-[10px] uppercase transition-all shadow-xl">
                                    <Plus className="mr-2 size-3.5" /> {t('quality.standards.dialog.detail.startEditing')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 lg:p-6 bg-muted/40 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 rounded-b-2xl lg:rounded-b-[2.5rem]">
                    <div className="flex items-center gap-3">
                        <div className="size-1.5 rounded-full bg-primary/40 animate-pulse" />
                        <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 italic">{t('quality.standards.dialog.detail.footerHint')}</span>
                    </div>
                    <div className="flex w-full sm:w-auto gap-2 lg:gap-3">
                        <Button variant="ghost" className="flex-1 sm:flex-none rounded-xl h-10 lg:h-11 px-6 font-black text-[10px] lg:text-xs uppercase hover:bg-white/5 opacity-50 transition-opacity" onClick={() => onOpenChange(false)}>
                            {t('quality.standards.dialog.detail.close')}
                        </Button>
                        <Button className="flex-1 sm:flex-none rounded-xl h-10 lg:h-11 px-8 lg:px-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[10px] lg:text-xs shadow-xl shadow-primary/20 transition-all active:scale-95" onClick={() => onOpenChange(false)}>
                            <Check className="mr-2 size-3.5 lg:size-4" /> {t('quality.standards.dialog.detail.confirm')}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function InfoCard({
    icon: Icon,
    label,
    value,
    className,
    highlight = false,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value?: string
    className?: string
    highlight?: boolean
}) {
    return (
        <div className={cn("flex items-center gap-3 p-2.5 lg:p-3 bg-background/60 rounded-xl lg:rounded-2xl border border-white/5 shadow-sm", className)}>
            <div className="size-8 lg:size-10 rounded-lg lg:rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                <Icon className="size-3 lg:size-4 text-primary/40" />
            </div>
            <div className="min-w-0">
                <p className="text-[8px] lg:text-[9px] font-black uppercase text-muted-foreground/50 tracking-widest">{label}</p>
                <p className={cn("font-bold text-xs lg:text-sm truncate tracking-tight", highlight && "uppercase tracking-wider text-primary")}>{value}</p>
            </div>
        </div>
    )
}

function LevelRow({
    level,
    remarks,
    unit,
    isRequired,
    t,
    rowSpan,
}: {
    level: LevelConfig
    remarks?: string
    unit?: string
    isRequired?: boolean
    t: ReturnType<typeof useLanguage>['t']
    rowSpan: number
}) {
    return (
        <>
            <LevelCells level={level} />
            <TableCell rowSpan={rowSpan} className="text-center font-black text-[9px] lg:text-[10px] opacity-50 border border-white/10 border-t-0 border-l-0 px-1 whitespace-nowrap">{unit}</TableCell>
            <TableCell rowSpan={rowSpan} className="text-center border border-white/10 border-t-0 border-l-0 whitespace-nowrap">
                <Badge variant={isRequired ? 'default' : 'outline'} className="text-[8px] lg:text-[9px] font-black px-1.5 py-0 rounded-md">
                    {isRequired ? t('quality.standards.dialog.detail.yes') : t('quality.standards.dialog.detail.no')}
                </Badge>
            </TableCell>
            <TableCell rowSpan={rowSpan} className="text-[9px] lg:text-[10px] text-muted-foreground font-medium border border-white/10 border-t-0 border-l-0 p-3 leading-relaxed opacity-70 italic whitespace-nowrap">
                {remarks || t('quality.standards.dialog.detail.noRemarks')}
            </TableCell>
        </>
    )
}

function LevelCells({ level }: { level: LevelConfig }) {
    return (
        <>
            <TableCell className={cn("text-center font-black text-[10px] lg:text-[11px] border border-white/10 border-t-0 border-l-0 px-2 whitespace-nowrap", level.level === 'B' && "bg-primary/20 text-primary border-primary/30")}>{level.level}</TableCell>
            <TableCell className={cn("text-center font-bold text-[10px] lg:text-[11px] border border-white/10 border-t-0 border-l-0 whitespace-nowrap", level.level === 'B' && "bg-primary/5")}>{level.tolerance?.toFixed(3)}</TableCell>
            <TableCell className="text-center font-black text-[10px] lg:text-[11px] border border-white/10 border-t-0 border-l-0 whitespace-nowrap">{level.min?.toFixed(3)}</TableCell>
            <TableCell className="text-center font-black text-[10px] lg:text-[11px] border border-white/10 border-t-0 border-l-0 whitespace-nowrap">{level.max?.toFixed(3)}</TableCell>
            <TableCell className="text-center text-[9px] font-black text-red-500/80 border border-white/10 border-t-0 border-l-0 px-1 whitespace-nowrap">{level.errorCodeLower || '-'}</TableCell>
            <TableCell className="text-center text-[9px] font-black text-red-500/80 border border-white/10 border-t-0 border-l-0 px-1 whitespace-nowrap">{level.errorCodeUpper || '-'}</TableCell>
        </>
    )
}
