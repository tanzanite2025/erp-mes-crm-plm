import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import * as React from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { type Standard } from '../data/schema'
import { ShieldCheck, Save, Info, History, Loader2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { type DeltaSet } from '@/lib/delta/types'

interface StandardActionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    standard?: Standard | null
    onSave?: (payload: { data: Partial<Standard>; isPatch: boolean; delta?: DeltaSet }) => void
    isLoading?: boolean
}

const DEFAULT_STANDARD: Partial<Standard> = {
    code: '',
    name: '',
    type: 'IQC',
    version: 1.0,
    status: 'PUBLISHED',
    remarks: '',
}

function normalizeType(type?: string): 'IQC' | 'IPQC' | 'FQC' {
    const normalized = type?.toUpperCase()
    if (type === '巡检' || normalized === 'IPQC') return 'IPQC'
    if (type === '首检' || normalized === 'FQC') return 'FQC'
    return 'IQC'
}

function normalizeStatus(status?: string): 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' {
    const normalized = status?.toUpperCase()
    if (status === '已归档' || normalized === 'ARCHIVED') return 'ARCHIVED'
    if (status === '待审核' || normalized === 'DRAFT' || normalized === 'PENDING') return 'DRAFT'
    return 'PUBLISHED'
}

function getTypeLabel(t: ReturnType<typeof useLanguage>['t'], type?: string) {
    const normalized = normalizeType(type)
    if (normalized === 'IPQC') return t('quality.standards.values.typeProcess')
    if (normalized === 'FQC') return t('quality.standards.values.typeFinal')
    return t('quality.standards.values.typeQuality')
}

function getStatusLabel(t: ReturnType<typeof useLanguage>['t'], status?: string) {
    const normalized = normalizeStatus(status)
    if (normalized === 'ARCHIVED') return t('quality.standards.values.statusArchived')
    if (normalized === 'DRAFT') return t('quality.standards.values.statusPending')
    return t('quality.standards.values.statusPublished')
}

export function StandardActionDialog({
    open,
    onOpenChange,
    standard,
    onSave,
    isLoading,
}: StandardActionDialogProps) {
    const { t } = useLanguage()
    const isEdit = !!standard
    const shellClasses = buildActionDialogShellClasses({
        content: 'max-h-[92vh] flex flex-col sm:max-w-[560px] p-0 overflow-hidden rounded-[1.5rem] lg:rounded-[2rem] bg-background/95 backdrop-blur-2xl transition-all',
        header: 'p-6 lg:p-8 pb-0 shrink-0 border-none',
        title: 'text-xl lg:text-2xl font-black tracking-tight uppercase not-italic',
        description: 'text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50',
        body: 'flex-1 overflow-y-auto p-6 lg:p-8 pt-4 space-y-6 scrollbar-thin',
        footer: 'p-6 lg:p-8 bg-muted/20 border-t border-white/5 shrink-0 flex items-center justify-between gap-4',
    })
    const initialFormData = React.useMemo(() => (standard ? standard : (DEFAULT_STANDARD as Standard)), [standard])
    const { data: formData, tracker } = useDeltaTracker(initialFormData, open)

    const handleOpenChange = (nextOpen: boolean) => {
        onOpenChange(nextOpen)
    }

    const handleSave = () => {
        if (!formData.code || !formData.name) {
            toast.error(t('quality.standards.dialog.action.validationRequired'))
            return
        }

        const isPatch = !!standard
        const delta = tracker.commit()

        if (isPatch && Object.keys(delta).length === 0) {
            onOpenChange(false)
            return
        }

        onSave?.({
            data: formData as Partial<Standard>,
            isPatch,
            delta: isPatch ? delta : undefined
        })
        
        const nextVersion = isPatch ? (Number(formData.version || 1) + 0.1).toFixed(1) : '1.0'
        toast.success(
            isPatch
                ? t('quality.standards.dialog.action.toastUpdated', { version: nextVersion })
                : t('quality.standards.dialog.action.toastCreated')
        )
        onOpenChange(false)
    }

    return (
        <ActionDialogShell
            open={open}
            onOpenChange={handleOpenChange}
            title={(
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 shadow-inner">
                        <ShieldCheck className="size-6 text-primary" />
                    </div>
                    <div>
                        {isEdit ? t('quality.standards.dialog.action.titleEdit') : t('quality.standards.dialog.action.titleCreate')}
                    </div>
                </div>
            )}
            description={isEdit ? t('quality.standards.dialog.action.subtitleEdit') : t('quality.standards.dialog.action.subtitleCreate')}
            contentClassName={shellClasses.content}
            headerClassName={shellClasses.header}
            bodyClassName={shellClasses.body}
            footerClassName={shellClasses.footer}
            titleClassName={shellClasses.title}
            descriptionClassName={shellClasses.description}
            footer={(
                <>
                    <Button
                        variant="ghost"
                        className="rounded-xl h-11 px-6 font-black text-[11px] uppercase hover:bg-white/5 opacity-50 transition-opacity"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('quality.standards.dialog.action.cancel')}
                    </Button>
                    <Button
                        disabled={isLoading}
                        className="rounded-xl h-11 px-10 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[11px] shadow-xl shadow-primary/20 transition-all active:scale-95 gap-2"
                        onClick={handleSave}
                    >
                        {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        {t('quality.standards.dialog.action.save')}
                    </Button>
                </>
            )}
        >
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1 space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                                {t('quality.standards.dialog.action.fields.code')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                placeholder={t('quality.standards.dialog.action.placeholders.code')}
                                className="h-11 rounded-xl bg-muted/30 border-none shadow-inner focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                value={formData.code || ''}
                                onChange={(e) => { formData.code = e.target.value }}
                            />
                        </div>
                        <div className="col-span-1 space-y-2 flex flex-col justify-end">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1 mb-1.5 flex items-center gap-1.5 leading-none">
                                <History className="size-3" /> {t('quality.standards.dialog.action.fields.systemVersion')}
                            </Label>
                            <div className="h-11 flex items-center px-4 rounded-xl bg-muted/20 border border-white/5 shadow-inner">
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-mono font-black text-[10px] py-0.5">
                                    VER {isEdit ? Number(formData.version || 1).toFixed(1) : '1.0'}
                                </Badge>
                                <span className="ml-2 text-[9px] font-black text-muted-foreground uppercase tracking-tighter opacity-30">
                                    {isEdit ? t('quality.standards.dialog.action.versionCurrent') : t('quality.standards.dialog.action.versionInitial')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                            {t('quality.standards.dialog.action.fields.name')} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            placeholder={t('quality.standards.dialog.action.placeholders.name')}
                            className="h-11 rounded-xl bg-muted/30 border-none shadow-inner focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                            value={formData.name || ''}
                            onChange={(e) => { formData.name = e.target.value }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                                {t('quality.standards.dialog.action.fields.type')}
                            </Label>
                            <Select
                                value={normalizeType(formData.type)}
                                onValueChange={(value: Standard['type']) => { formData.type = value }}
                            >
                                <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-none shadow-inner focus:ring-2 focus:ring-primary/20 transition-all">
                                    <SelectValue placeholder={t('quality.standards.dialog.action.placeholders.type')} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-white/5 bg-background font-black text-[11px]">
                                    <SelectItem value="IQC">{getTypeLabel(t, 'IQC')} (IQC)</SelectItem>
                                    <SelectItem value="IPQC">{getTypeLabel(t, 'IPQC')} (IPQC)</SelectItem>
                                    <SelectItem value="FQC">{getTypeLabel(t, 'FQC')} (FQC)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                                {t('quality.standards.dialog.action.fields.status')}
                            </Label>
                            <Select
                                value={normalizeStatus(formData.status)}
                                onValueChange={(value: Standard['status']) => { formData.status = value }}
                            >
                                <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-none shadow-inner focus:ring-2 focus:ring-primary/20 transition-all">
                                    <SelectValue placeholder={t('quality.standards.dialog.action.placeholders.status')} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-white/5 bg-background font-black text-[11px]">
                                    <SelectItem value="DRAFT">{getStatusLabel(t, 'DRAFT')} (DRAFT)</SelectItem>
                                    <SelectItem value="PUBLISHED">{getStatusLabel(t, 'PUBLISHED')} (PUBLISHED)</SelectItem>
                                    <SelectItem value="ARCHIVED">{getStatusLabel(t, 'ARCHIVED')} (ARCHIVED)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                            {t('quality.standards.dialog.action.fields.remarks')}
                        </Label>
                        <textarea
                            rows={3}
                            placeholder={t('quality.standards.dialog.action.placeholders.remarks')}
                            className="w-full p-4 rounded-xl bg-muted/30 border-none shadow-inner focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
                            value={formData.remarks || ''}
                            onChange={(e) => { formData.remarks = e.target.value }}
                        />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <Info className="size-4 text-primary shrink-0" />
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">{t('quality.standards.dialog.action.versionNoticeTitle')}</p>
                            <p className="text-[10px] font-medium leading-relaxed text-primary/70">
                                {isEdit
                                    ? t('quality.standards.dialog.action.versionNoticeEdit', { version: (Number(formData.version || 1) + 0.1).toFixed(1) })
                                    : t('quality.standards.dialog.action.versionNoticeCreate')}
                            </p>
                        </div>
                    </div>
        </ActionDialogShell>
    )
}
