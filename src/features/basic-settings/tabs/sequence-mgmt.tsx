'use client'

import { useState } from 'react'
import {
    Plus,
    RefreshCw,
    Settings2,
    Hash,
    ShieldCheck,
    AlertCircle,
    Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { isConflictError } from '@/lib/handle-server-error'
import { type NumberingRule } from '../data/schema'
import { useNumberingRules } from '../hooks/use-numbering-rules'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface SequenceMgmtProps {
    hideHeader?: boolean
}

export function SequenceMgmt({ hideHeader = false }: SequenceMgmtProps) {
    const { t } = useLanguage()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingRule, setEditingRule] = useState<Partial<NumberingRule> | null>(null)
    const { rules, isLoading, error, refreshRules, saveRule, isSaving } = useNumberingRules()

    const getResetPeriodLabel = (period: NumberingRule['resetPeriod']) => {
        if (period === 'MONTHLY') return t('basicSettings.sequences.table.resetPeriod.monthly')
        if (period === 'YEARLY') return t('basicSettings.sequences.table.resetPeriod.yearly')
        return t('basicSettings.sequences.table.resetPeriod.never')
    }

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    const handleSaveRule = async () => {
        if (!editingRule?.ruleKey || !editingRule?.pattern) {
            toast.error(t('basicSettings.sequences.toast.requiredMissing'))
            return
        }

        if (!editingRule.pattern.includes('{SEQ}')) {
            toast.error(t('basicSettings.sequences.toast.patternMissingSeq'))
            return
        }

        try {
            await saveRule(editingRule)
            toast.success(t('basicSettings.sequences.toast.saveSuccess'))
            setIsDialogOpen(false)
        } catch (error: unknown) {
            if (isConflictError(error)) {
                toast.error(t('basicSettings.sequences.toast.conflict'))
                return
            }

            const message = error instanceof Error
                ? error.message
                : t('basicSettings.sequences.toast.unknown')
            toast.error(t('basicSettings.sequences.toast.saveFailed', { message }))
        }
    }

    const openEditDialog = (rule: Partial<NumberingRule> = {
        ruleKey: '',
        prefix: '',
        pattern: '{PREFIX}{YYMM}{SEQ}',
        padding: 4,
        resetPeriod: 'MONTHLY'
    }) => {
        setEditingRule(rule)
        setIsDialogOpen(true)
    }

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            {!hideHeader && (
                <div className='flex flex-col gap-1 bg-muted/5 p-4 md:p-6 rounded-[32px] border border-dashed border-muted/50'>
                    <div className='flex items-center gap-2 text-primary'>
                        <Hash className='size-4 text-primary' />
                        <h3 className='text-lg font-black tracking-tighter italic uppercase'>{t('basicSettings.sequences.page.title')}</h3>
                    </div>
                    <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
                        {t('basicSettings.sequences.page.subtitle')}
                    </p>
                </div>
            )}

            <div className='flex flex-col sm:flex-row gap-4 sm:gap-6 justify-between items-start sm:items-center bg-muted/5 p-4 md:p-6 rounded-[24px] border border-dashed border-muted/50'>
                <Alert className='bg-blue-500/5 border-blue-500/20 rounded-[24px] border-dashed shadow-none max-w-2xl py-4'>
                    <ShieldCheck className='size-4 text-blue-600 mt-1' />
                    <div className='flex-1 ml-3'>
                        <AlertTitle className='text-blue-700 text-[10px] font-black uppercase tracking-widest italic'>
                            {t('basicSettings.sequences.syncGuard.title')}
                        </AlertTitle>
                        <AlertDescription className='text-blue-800/60 mt-1 text-[11px] font-bold leading-relaxed'>
                            {t('basicSettings.sequences.syncGuard.description')}
                        </AlertDescription>
                    </div>
                </Alert>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Button
                        variant='ghost'
                        onClick={() => void refreshRules()}
                        disabled={isLoading}
                        className='w-full sm:w-auto rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest hover:bg-muted transition-all'
                    >
                        <RefreshCw className={`size-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> {t('basicSettings.sequences.actions.refresh')}
                    </Button>
                    <Button 
                        onClick={() => openEditDialog()} 
                        className='w-full sm:w-auto rounded-full bg-primary h-11 px-6 md:px-10 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95'
                    >
                        <Plus className='size-4 mr-2' /> {t('basicSettings.sequences.actions.addRule')}
                    </Button>
                </div>
            </div>

            <div className='rounded-[24px] border border-dashed bg-muted/5 overflow-x-auto no-scrollbar'>
                <Table>
                    <TableHeader className='bg-muted/30 h-14'>
                        <TableRow className='hover:bg-transparent border-b border-dashed border-muted/50'>
                            <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 pl-8'>{t('basicSettings.sequences.table.headers.ruleKey')}</TableHead>
                            <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('basicSettings.sequences.table.headers.prefix')}</TableHead>
                            <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('basicSettings.sequences.table.headers.pattern')}</TableHead>
                            <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 text-center'>{t('basicSettings.sequences.table.headers.seq')}</TableHead>
                            <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('basicSettings.sequences.table.headers.reset')}</TableHead>
                            <TableHead className='text-right pr-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 min-w-[100px]'>{t('basicSettings.sequences.table.headers.action')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rules.length > 0 ? (
                            rules.map((rule) => (
                                <TableRow key={rule.ruleKey} className='hover:bg-muted/5 transition-colors border-b last:border-0 h-16'>
                                    <TableCell className='font-mono font-black text-xs text-primary/80 pl-8'>{rule.ruleKey}</TableCell>
                                    <TableCell className='font-black text-xs'>{rule.prefix || '-'}</TableCell>
                                    <TableCell>
                                        <code className='bg-background px-2 py-0.5 rounded border border-dashed font-mono text-[10px] font-black text-muted-foreground uppercase'>
                                            {rule.pattern}
                                        </code>
                                    </TableCell>
                                    <TableCell className='text-center font-black text-sm text-primary tabular-nums'>
                                        {rule.currentSeq}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant='secondary' className='font-black text-[9px] px-3 h-5 rounded-full bg-muted/50 text-muted-foreground border-none uppercase tracking-tighter'>
                                            {getResetPeriodLabel(rule.resetPeriod)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className='text-right pr-8'>
                                        <Button variant='ghost' size='icon' onClick={() => openEditDialog(rule)} className='size-9 rounded-full hover:bg-muted'>
                                            <Settings2 className='size-4 text-muted-foreground' />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className='h-64 text-center'>
                                    <div className='flex flex-col items-center justify-center opacity-20'>
                                        <AlertCircle className='size-12 mb-4' />
                                        <p className='text-[11px] font-black uppercase tracking-widest'>
                                            {isLoading
                                                ? t('basicSettings.sequences.table.emptyLoading')
                                                : t('basicSettings.sequences.table.emptyNoRules')}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className='sm:max-w-[500px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden'>
                    <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent pointer-events-none' />
                    <DialogHeader className='p-8 pb-4 relative z-10'>
                        <DialogTitle className='text-xl font-black tracking-tight uppercase italic'>{editingRule?.id ? t('basicSettings.sequences.dialog.editTitle') : t('basicSettings.sequences.dialog.createTitle')}</DialogTitle>
                        <DialogDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-relaxed mt-2'>
                            {t('basicSettings.sequences.dialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className='p-8 pt-4 space-y-6 relative z-10'>
                        <div className='space-y-3'>
                            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1 italic'>{t('basicSettings.sequences.dialog.labels.ruleKey')}</Label>
                            <Input
                                className='h-12 rounded-2xl border-none bg-muted/50 font-black text-sm tabular-nums focus:ring-1 focus:ring-primary/20 transition-all'
                                value={editingRule?.ruleKey}
                                onChange={(e) => setEditingRule({ ...editingRule, ruleKey: e.target.value })}
                                disabled={!!editingRule?.id}
                                placeholder={t('basicSettings.sequences.dialog.placeholders.ruleKey')}
                            />
                        </div>

                        <div className='grid grid-cols-2 gap-6'>
                            <div className='space-y-3'>
                                <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1 italic'>{t('basicSettings.sequences.dialog.labels.prefix')}</Label>
                                <Input
                                    className='h-12 rounded-2xl border-none bg-muted/50 font-bold text-sm focus:ring-1 focus:ring-primary/20'
                                    value={editingRule?.prefix}
                                    onChange={(e) => setEditingRule({ ...editingRule, prefix: e.target.value })}
                                    placeholder={t('basicSettings.sequences.dialog.placeholders.prefix')}
                                />
                            </div>
                            <div className='space-y-3'>
                                <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1 italic'>{t('basicSettings.sequences.dialog.labels.padding')}</Label>
                                <Input
                                    type='number'
                                    className='h-12 rounded-2xl border-none bg-muted/50 font-black text-sm focus:ring-1 focus:ring-primary/20'
                                    value={editingRule?.padding}
                                    onChange={(e) => setEditingRule({ ...editingRule, padding: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className='space-y-3'>
                            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1 italic'>{t('basicSettings.sequences.dialog.labels.pattern')}</Label>
                            <Input
                                className='h-12 rounded-2xl border-none bg-muted/50 font-mono text-xs tabular-nums focus:ring-1 focus:ring-primary/20'
                                value={editingRule?.pattern}
                                onChange={(e) => setEditingRule({ ...editingRule, pattern: e.target.value })}
                                placeholder={t('basicSettings.sequences.dialog.placeholders.pattern')}
                            />
                        </div>

                        <div className='space-y-3'>
                            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1 italic'>{t('basicSettings.sequences.dialog.labels.resetStrategy')}</Label>
                            <Select
                                value={editingRule?.resetPeriod}
                                onValueChange={(val) => setEditingRule({ ...editingRule, resetPeriod: val as NumberingRule['resetPeriod'] })}
                            >
                                <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 font-bold text-sm focus:ring-1 focus:ring-primary/20'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className='rounded-[24px] border-none shadow-2xl p-2'>
                                    <SelectItem value='MONTHLY' className='font-bold py-3 rounded-xl italic'>{t('basicSettings.sequences.dialog.resetOptions.monthly')}</SelectItem>
                                    <SelectItem value='YEARLY' className='font-bold py-3 rounded-xl italic'>{t('basicSettings.sequences.dialog.resetOptions.yearly')}</SelectItem>
                                    <SelectItem value='NEVER' className='font-bold py-3 rounded-xl italic'>{t('basicSettings.sequences.dialog.resetOptions.never')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className='p-8 pt-0 bg-transparent flex sm:justify-between gap-4'>
                        <Button variant='ghost' className='flex-1 rounded-full h-11 font-black text-[10px] uppercase tracking-widest transition-colors hover:bg-muted' onClick={() => setIsDialogOpen(false)}>{t('basicSettings.sequences.dialog.actions.cancel')}</Button>
                        <Button 
                            className='flex-1 rounded-full h-11 bg-primary hover:bg-primary/90 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 gap-2 transition-all active:scale-95' 
                            onClick={handleSaveRule}
                            disabled={isSaving}
                        >
                            <Save className='size-4' /> {isSaving ? t('basicSettings.sequences.dialog.actions.syncing') : t('basicSettings.sequences.dialog.actions.commit')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
