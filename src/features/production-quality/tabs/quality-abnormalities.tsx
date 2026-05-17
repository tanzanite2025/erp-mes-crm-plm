import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    FileText,
    ShieldAlert,
    UserCircle,
    ArrowRight,
} from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useGetAbnormalities, type QualityAbnormality } from '@/features/quality/hooks/use-quality'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'

function normalizeSeverity(severity?: string) {
    const normalized = severity?.toUpperCase()
    if (normalized === 'CRITICAL') return 'CRITICAL'
    if (normalized === 'MAJOR') return 'MAJOR'
    if (normalized === 'HIGH') return 'HIGH'
    if (normalized === 'MEDIUM') return 'MEDIUM'
    if (normalized === 'MINOR') return 'MINOR'
    if (normalized === 'LOW') return 'LOW'
    return 'UNKNOWN'
}

function normalizeStatus(status?: string) {
    const normalized = status?.toUpperCase()
    if (normalized === 'CLOSED') return 'CLOSED'
    if (normalized === 'REJECTED') return 'REJECTED'
    if (normalized === 'OPEN') return 'OPEN'
    return 'UNKNOWN'
}

function getSeverityLabel(t: ReturnType<typeof useLanguage>['t'], severity?: string) {
    switch (normalizeSeverity(severity)) {
        case 'CRITICAL':
            return t('quality.abnormalities.card.severityCritical')
        case 'MAJOR':
            return t('quality.abnormalities.card.severityMajor')
        case 'HIGH':
            return t('quality.abnormalities.card.severityHigh')
        case 'MEDIUM':
            return t('quality.abnormalities.card.severityMedium')
        case 'MINOR':
            return t('quality.abnormalities.card.severityMinor')
        case 'LOW':
            return t('quality.abnormalities.card.severityLow')
        default:
            return severity || t('quality.common.unknown')
    }
}

function getStatusLabel(t: ReturnType<typeof useLanguage>['t'], status?: string) {
    switch (normalizeStatus(status)) {
        case 'CLOSED':
            return t('quality.abnormalities.card.closedLoop')
        case 'REJECTED':
            return t('quality.abnormalities.card.rejected')
        case 'OPEN':
            return t('quality.abnormalities.card.inProgress')
        default:
            return status || t('quality.common.unknown')
    }
}

function getDisposalLabel(t: ReturnType<typeof useLanguage>['t'], disposalMethod?: string) {
    const normalized = disposalMethod?.toUpperCase()
    if (normalized === 'SCRAP') return t('quality.abnormalities.card.disposalScrap')
    if (normalized === 'REWORK') return t('quality.abnormalities.card.disposalRework')
    if (normalized === 'CONCESSION') return t('quality.abnormalities.card.disposalConcession')
    return disposalMethod || t('quality.abnormalities.card.underAnalysis')
}

export function QualityAbnormalities() {
    const { t } = useLanguage()
    const { data: abnormalities, error, isLoading } = useGetAbnormalities()

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    if (isLoading) {
        return (
            <div className='flex flex-col gap-8 animate-pulse'>
                <div className='h-32 rounded-[32px] bg-muted/20' />
                <div className='space-y-4'>
                    {[1, 2, 3].map((item) => (
                        <div key={item} className='h-24 rounded-[24px] bg-muted/10' />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-700">
            <IndustrialHeader
                icon={ShieldAlert}
                title={t('quality.abnormalities.page.title')}
                description={t('quality.abnormalities.page.description')}
            />

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6'>
                <Card className='rounded-[32px] border-none bg-rose-500/5 shadow-none overflow-hidden relative group'>
                    <div className='absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform'>
                        <ShieldAlert className='size-12' />
                    </div>
                    <CardContent className='p-6'>
                        <span className='text-[10px] font-black text-rose-600/40 uppercase tracking-widest'>{t('quality.abnormalities.page.activeCriticals')}</span>
                        <div className='text-3xl font-black italic tracking-tighter text-rose-600 tabular-nums mt-1 font-mono'>
                            {abnormalities?.filter((item) => item.severity === 'CRITICAL').length || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card className='rounded-[32px] border-none bg-amber-500/5 shadow-none overflow-hidden relative group'>
                    <div className='absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform'>
                        <AlertTriangle className='size-12' />
                    </div>
                    <CardContent className='p-6'>
                        <span className='text-[10px] font-black text-amber-600/40 uppercase tracking-widest'>{t('quality.abnormalities.page.openReports')}</span>
                        <div className='text-3xl font-black italic tracking-tighter text-amber-600 tabular-nums mt-1 font-mono'>
                            {abnormalities?.filter((item) => item.status === 'OPEN').length || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card className='rounded-[32px] border-none bg-emerald-500/5 shadow-none overflow-hidden relative group'>
                    <div className='absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform'>
                        <CheckCircle2 className='size-12' />
                    </div>
                    <CardContent className='p-6'>
                        <span className='text-[10px] font-black text-emerald-600/40 uppercase tracking-widest'>{t('quality.abnormalities.page.closedLooped')}</span>
                        <div className='text-3xl font-black italic tracking-tighter text-emerald-600 tabular-nums mt-1 font-mono'>
                            {abnormalities?.filter((item) => item.status === 'CLOSED').length || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className='flex flex-col gap-4'>
                {abnormalities?.length === 0 ? (
                    <div className='py-32 flex flex-col items-center justify-center border-2 border-dashed border-muted/50 rounded-[40px] bg-muted/5'>
                        <Activity className='size-12 mb-4 opacity-10 animate-pulse text-primary' />
                        <p className='text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30'>{t('quality.abnormalities.page.empty')}</p>
                    </div>
                ) : (
                    abnormalities?.map((ab: QualityAbnormality) => (
                        <Card key={ab.id} className='group relative rounded-[24px] border border-dashed border-muted/50 bg-background hover:bg-muted/5 transition-all overflow-hidden cursor-pointer active:scale-[0.99]'>
                            <div
                                className={cn(
                                    'absolute top-0 left-0 bottom-0 w-1.5',
                                    normalizeSeverity(ab.severity) === 'CRITICAL' ? 'bg-rose-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.4)]' : 'bg-amber-500'
                                )}
                            />
                            <CardContent className='p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6'>
                                <div className='flex items-center gap-4 lg:gap-6 flex-1 min-w-0'>
                                    <div className='size-10 lg:size-12 rounded-2xl bg-muted/10 flex items-center justify-center shrink-0 group-hover:bg-white transition-colors border border-transparent group-hover:border-muted-foreground/10'>
                                        <FileText className='size-5 opacity-40' />
                                    </div>
                                    <div className='flex flex-col gap-1 min-w-0'>
                                        <div className='flex items-center gap-3'>
                                            <span className='text-[9px] font-mono font-black text-muted-foreground/30 leading-none'>ID: {ab.id.slice(0, 8).toUpperCase()}</span>
                                            <Badge
                                                className={cn(
                                                    'text-[8px] font-black py-0 h-4 rounded-md shadow-none border-none tracking-widest uppercase',
                                                    normalizeSeverity(ab.severity) === 'CRITICAL' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
                                                )}
                                            >
                                                {getSeverityLabel(t, ab.severity)}
                                            </Badge>
                                        </div>
                                        <h4 className='text-sm font-black italic tracking-tight uppercase text-slate-700 truncate'>
                                            {ab.description}
                                        </h4>
                                    </div>
                                </div>

                                <div className='flex items-center justify-between lg:justify-end gap-0 lg:gap-12 border-t lg:border-t-0 border-dashed border-muted/20 pt-4 lg:pt-0'>
                                    <div className='flex items-center gap-8 lg:gap-12'>
                                        <div className='flex flex-col gap-0.5'>
                                            <span className='text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest'>{t('quality.abnormalities.card.disposal')}</span>
                                            <span className='text-[10px] font-black uppercase text-secondary/60 leading-none truncate max-w-[100px] sm:max-w-none'>
                                                {getDisposalLabel(t, ab.disposalMethod)}
                                            </span>
                                        </div>
                                        <div className='flex flex-col gap-0.5 w-[110px] lg:w-[140px]'>
                                            <span className='text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest'>{t('quality.abnormalities.card.status')}</span>
                                            <div className='flex items-center gap-2'>
                                                {normalizeStatus(ab.status) === 'CLOSED' ? (
                                                    <>
                                                        <CheckCircle2 className='size-3 text-emerald-500' />
                                                        <span className='text-[10px] font-black text-emerald-600 uppercase italic'>{getStatusLabel(t, ab.status)}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock className='size-3 text-amber-500 animate-pulse' />
                                                        <span className='text-[10px] font-black text-amber-600 uppercase italic'>{getStatusLabel(t, ab.status)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className='flex items-center gap-3 pl-2 sm:pl-0'>
                                        <UserCircle className='size-5 opacity-10 hidden sm:block group-hover:opacity-40 transition-opacity shrink-0' />
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            className='size-9 rounded-full hover:bg-primary/10 hover:text-primary transition-all active:scale-95 border border-dashed border-transparent hover:border-primary/20 shrink-0'
                                        >
                                            <ArrowRight className='size-4' />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
