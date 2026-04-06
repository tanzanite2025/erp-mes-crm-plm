import { useState } from 'react'
import {
    ClipboardCheck,
    Search,
    Activity,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Package,
    ArrowRight,
} from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGetQualityTasks, useQualityMutations, type QualityTask } from '../hooks/use-quality'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'

export function QualityInspection() {
    const { t } = useLanguage()
    const [searchTerm, setSearchTerm] = useState('')
    const { data, error, isLoading } = useGetQualityTasks(1, 100, searchTerm)
    const tasks = data?.items || []
    const { executeInspectionMutation } = useQualityMutations()

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    const handleQuickPass = (taskId: string) => {
        executeInspectionMutation.mutate({
            id: taskId,
            result: 'PASS',
            remarks: t('quality.inspection.page.quickPassRemark'),
        })
    }

    if (isLoading && tasks.length === 0) {
        return (
            <div className='flex flex-col gap-8 animate-pulse'>
                <div className='h-32 rounded-[32px] bg-muted/20' />
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                        <div key={item} className='h-48 rounded-[32px] bg-muted/10' />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-700">
            <PageHeader
                icon={ClipboardCheck}
                title={t('quality.inspection.page.title')}
                description={t('quality.inspection.page.description')}
            />

            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1'>
                <div className="relative group flex-1 max-w-none sm:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder={t('quality.inspection.page.searchPlaceholder')}
                        className="h-12 w-full pl-11 rounded-2xl bg-muted/50 border-none shadow-inner text-[11px] font-bold uppercase tracking-tight focus:bg-background transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className='flex items-center gap-3 shrink-0'>
                    <div className='px-4 py-2 bg-muted/10 rounded-full border border-dashed border-muted/50 flex items-center gap-3 w-full sm:w-auto justify-center'>
                        <span className='text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest leading-none'>{t('quality.inspection.page.pendingLoad')}</span>
                        <span className='text-sm font-black italic text-primary tabular-nums'>{tasks.filter((task: QualityTask) => task.result === 'PENDING').length}</span>
                    </div>
                </div>
            </div>

            {tasks.length === 0 ? (
                <div className='relative rounded-[40px] border border-dashed border-muted/50 bg-muted/5 h-[400px] flex flex-col items-center justify-center overflow-hidden shadow-inner'>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none" />
                    <Activity className="size-16 mb-6 opacity-5 stroke-[1.5px] text-primary animate-pulse" />
                    <p className='text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground/20 italic'>
                        {t('quality.inspection.page.empty')}
                    </p>
                </div>
            ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {tasks.map((task: QualityTask) => (
                        <Card
                            key={task.id}
                            className={cn(
                                'group relative rounded-[32px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] cursor-pointer active:scale-95',
                                task.result === 'PASS' ? 'bg-emerald-500/[0.02]' : task.result === 'FAIL' ? 'bg-rose-500/[0.02]' : 'bg-background hover:bg-white'
                            )}
                        >
                            <div
                                className={cn(
                                    'absolute top-0 left-0 bottom-0 w-1.5',
                                    task.result === 'PASS' ? 'bg-emerald-500' : task.result === 'FAIL' ? 'bg-rose-500' : 'bg-blue-500/20'
                                )}
                            />

                            <CardContent className='p-6 flex flex-col gap-5'>
                                <div className='flex items-center justify-between gap-4'>
                                    <div className='flex flex-col gap-0.5 min-w-0'>
                                        <div className='flex items-center gap-2'>
                                            <span className='text-[8px] font-mono font-black text-muted-foreground/40 uppercase tracking-widest leading-none'>{t('quality.inspection.page.lotId')}</span>
                                            <Badge variant='outline' className='h-4 text-[9px] font-black font-mono border-dashed bg-muted/10 px-1.5 leading-none'>{task.batchNo}</Badge>
                                        </div>
                                        <h3 className='text-sm font-black italic uppercase tracking-tighter text-slate-700 mt-1 truncate'>
                                            {task.productName || t('quality.inspection.page.unidentified')}
                                        </h3>
                                    </div>
                                    <div className='size-10 rounded-xl bg-muted/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shrink-0'>
                                        <Package className='size-5 opacity-40 group-hover:opacity-100' />
                                    </div>
                                </div>

                                <div className='space-y-3'>
                                    <div className='flex items-center justify-between text-[10px] font-black uppercase tracking-widest'>
                                        <span className='text-muted-foreground/30'>{t('quality.inspection.page.status')}</span>
                                        <div className='flex items-center gap-1.5'>
                                            {task.result === 'PASS' ? (
                                                <span className='text-emerald-500 flex items-center gap-1'><CheckCircle2 className='size-3' /> {t('quality.inspection.page.pass')}</span>
                                            ) : task.result === 'FAIL' ? (
                                                <span className='text-rose-500 flex items-center gap-1'><XCircle className='size-3' /> {t('quality.inspection.page.failed')}</span>
                                            ) : (
                                                <span className='text-blue-500 flex items-center gap-1'><Clock className='size-3 animate-pulse' /> {t('quality.inspection.page.inQueue')}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className='h-1.5 w-full bg-muted/20 rounded-full overflow-hidden'>
                                        <div
                                            className={cn(
                                                'h-full transition-all duration-1000',
                                                task.result === 'PASS' ? 'w-full bg-emerald-500' : task.result === 'FAIL' ? 'w-full bg-rose-500' : 'w-1/3 bg-blue-500 animate-pulse'
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className='flex flex-col xs:flex-row xs:items-center justify-between border-t border-dashed border-muted/50 pt-4 gap-4'>
                                    <div className='flex flex-col gap-0.5'>
                                        <span className='text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest'>{t('quality.inspection.page.executor')}</span>
                                        <div className='flex items-center gap-1.5'>
                                            <User className='size-3 text-muted-foreground/30' />
                                            <span className='text-[10px] font-black uppercase'>{task.inspector || t('quality.inspection.page.unassigned')}</span>
                                        </div>
                                    </div>
                                    {task.result === 'PENDING' && (
                                        <Button
                                            size='sm'
                                            className='h-9 rounded-xl bg-primary font-black text-[9px] uppercase tracking-widest gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all w-full xs:w-auto truncate'
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleQuickPass(task.id)
                                            }}
                                        >
                                            {t('quality.inspection.page.quickPass')} <ArrowRight className='size-3 shrink-0' />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
