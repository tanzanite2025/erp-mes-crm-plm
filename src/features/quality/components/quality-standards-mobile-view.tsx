import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Layers, User, Clock, MoreHorizontal } from 'lucide-react'
import { type Standard } from '../data/schema'
import { useLanguage } from '@/context/language-provider'
import { formatQualityActorName, getTypeLabel, getStatusMeta } from '../utils/quality-utils'

interface QualityStandardsMobileViewProps {
    standards: Standard[]
    onViewDetail: (standard: Standard) => void
    onEdit: (standard: Standard) => void
}

export function QualityStandardsMobileView({ 
    standards, 
    onViewDetail, 
    onEdit 
}: QualityStandardsMobileViewProps) {
    const { t } = useLanguage()

    return (
        <div className="grid grid-cols-1 gap-4">
            {standards.map((standard: Standard) => {
                const statusMeta = getStatusMeta(t, standard.status)
                const operatorName = formatQualityActorName(standard.operator)

                return (
                    <Card
                        key={standard.id}
                        className="group relative rounded-[24px] border border-dashed border-muted/50 bg-muted/5 overflow-hidden transition-all active:scale-[0.98]"
                        onClick={() => onViewDetail(standard)}
                    >
                        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none" />
                        <CardContent className="p-5 flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-10 rounded-xl bg-muted/20 flex items-center justify-center shrink-0">
                                        <Layers className="size-5 opacity-40" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <h3 className="font-bold text-sm tracking-tight text-slate-700 truncate">{standard.name}</h3>
                                        <span className="font-mono text-[10px] text-muted-foreground/40">{standard.code}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <div className="inline-flex h-5 px-1.5 items-center justify-center rounded-lg bg-primary/5 font-black text-[8px] text-primary border border-primary/10 font-mono tracking-tighter uppercase">
                                        VER {standard.version?.toFixed(1) || '1.0'}
                                    </div>
                                    <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest bg-muted/20 px-2 py-0.5 rounded-md">
                                        {getTypeLabel(t, standard.type)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-dashed border-muted/20">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${statusMeta.className}`}>
                                            <div className={`size-1 rounded-full ${statusMeta.dotClassName}`} />
                                            <span className="text-[8px] font-black uppercase tracking-widest italic">{statusMeta.label}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1">
                                            <User className="size-2.5 text-muted-foreground/40" />
                                            <span className="text-[9px] font-black text-slate-500 uppercase">{operatorName || t('quality.common.system')}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="size-2.5 text-muted-foreground/40" />
                                            <span className="text-[9px] font-mono text-muted-foreground/40 tabular-nums">
                                                {standard.operateTime ? new Date(standard.operateTime).toLocaleDateString() : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-9 rounded-xl hover:bg-primary/10 hover:text-primary active:scale-95"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onEdit(standard)
                                    }}
                                >
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
