'use client'

import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { auditUtils } from '@/lib/audit-utils'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { canOpenRouteEntryNonBlocking } from '@/features/authz/guards/route-entry-access'
import { useAuthStore } from '@/stores/auth-store'
import { createMoldDraft, createMoldSchema, type Mold, type MoldDrawing, type MoldFormInput, type MoldFormOutput } from '../data/schema'
import { ImageUpload } from './image-upload'
import { AssetService } from '../services/asset-service'
import { MoldCoreService } from '../services/mold-core-service'
import { DrawingService } from '../services/drawing-service'
import { Plus, RotateCcw, Save, FileText, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { type DeltaSet } from '@/lib/delta/types'

interface MoldActionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (data: Mold, isPatch?: boolean, delta?: DeltaSet) => void
    editData?: Mold | null
}

export function MoldActionDialog({
    open,
    onOpenChange,
    onConfirm,
    editData,
}: MoldActionDialogProps) {
    const { t } = useLanguage()
    const { allowsAction } = useNonBlockingPermissionActions()
    const user = useAuthStore((state) => state.user)
    const canOpenDrawings = canOpenRouteEntryNonBlocking(user, '/equipment-tooling/drawings')
    const [groupNames, setGroupNames] = useState<string[]>([])
    const [isAddingNewGroup, setIsAddingNewGroup] = useState(false)
    const [linkedDrawings, setLinkedDrawings] = useState<MoldDrawing[]>([])
    const moldFormSchema = useMemo(() => createMoldSchema(t), [t])
    const defaultDraft = useMemo(() => createMoldDraft(editData ?? {}), [editData])

    // SDRTS: 接入增量记录器
    const { tracker, deltaProxy } = useDeltaTracker<Mold>(editData || createMoldDraft())
    const isEdit = !!editData

    const form = useForm<MoldFormInput, unknown, MoldFormOutput>({
        resolver: zodResolver(moldFormSchema),
        defaultValues: defaultDraft,
    })

    const watchedMax = useWatch({ control: form.control, name: 'maxCycles' }) ?? 0
    const watchedCurrent = useWatch({ control: form.control, name: 'currentCycles' }) ?? 0
    // [UI-PREVIEW-INDICATOR]: 对话框内的健康百分比仅用于 UI 反馈预览
    // [BACKEND-AUTHORITY]: 物理资产的权威健康评分属于后端 BRP/Asset-Core 的核算范畴。
    const healthPercent = Math.max(0, Math.min(100, Math.round(((watchedMax - watchedCurrent) / watchedMax) * 100)))

    useEffect(() => {
        const loadInitialData = async () => {
            if (!open) return

            const [groups, drawings] = await Promise.all([
                AssetService.getGroupNames(),
                editData?.sn ? DrawingService.getDrawingsByMold(editData.sn) : Promise.resolve([]),
            ])

            setGroupNames(groups)
            setLinkedDrawings(drawings)
            setIsAddingNewGroup(false)

            if (editData) {
                form.reset(editData)
                tracker.reset(editData)
                return
            }

            const draft = createMoldDraft()
            form.reset(draft)
            tracker.reset(draft)
        }

        loadInitialData()
    }, [editData, form, open, tracker])

    const onSubmit = async (data: MoldFormOutput) => {
        if (!allowsAction('action_equipment_mold_manage')) return

        const isDuplicate = await MoldCoreService.isSnDuplicate(data.sn, editData?.id)
        if (isDuplicate) {
            toast.error(t('equipmentTooling.molds.dialog.validation.duplicateSn', { sn: data.sn }))
            return
        }

        // SDRTS: 同步 RHF 数据到 Proxy 用于增量计算
        Object.assign(deltaProxy, data)
        const delta = tracker.commit()
        const isDirty = Object.keys(delta).length > 0

        if (isEdit && !isDirty) {
            onOpenChange(false)
            return
        }

        if (isEdit && editData?.version === undefined) {
            throw new Error('[CRITICAL] 模具编辑模式下版本号(version)缺失，无法执行 SDRTS 安全 Patch。');
        }

        const stampedData = auditUtils.stamp(data, editData ? 'update' : 'create') as Mold
        
        // SDRTS: 发送 Patch 意图或全量数据
        onConfirm(stampedData, isEdit, isEdit ? delta : undefined)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='w-[95vw] sm:max-w-[550px] max-h-[92vh] flex flex-col p-0 rounded-[32px] border-none shadow-2xl overflow-hidden'>
                <DialogHeader className='pb-4 pt-6 px-6 sm:px-8 relative z-10 shrink-0'>
                    <DialogTitle className='text-lg sm:text-xl font-black tracking-tight uppercase'>
                        {editData ? t('equipmentTooling.molds.dialog.title.edit') : t('equipmentTooling.molds.dialog.title.create')}
                    </DialogTitle>
                    <DialogDescription className='text-[10px] sm:text-xs font-bold text-muted-foreground/60 leading-relaxed mt-2'>
                        {t('equipmentTooling.molds.dialog.description.prefix')}{' '}
                        <span className='text-primary font-black uppercase tracking-widest'>{t('equipmentTooling.molds.dialog.description.alertCode')}</span>{' '}
                        {t('equipmentTooling.molds.dialog.description.suffix')}
                    </DialogDescription>
                </DialogHeader>

                <div className='flex-1 overflow-y-auto px-6 sm:px-8 pb-8 custom-scrollbar'>
                    <div className='mb-6 p-4 rounded-[24px] border border-dashed bg-muted/5 space-y-3 relative z-10'>
                        <div className='flex items-center justify-between text-[9px] font-black uppercase tracking-widest'>
                            <span className='text-muted-foreground/40'>{t('equipmentTooling.molds.dialog.healthIndex')}</span>
                            <span className={healthPercent < 20 ? 'text-rose-600' : 'text-primary'}>{healthPercent}%</span>
                        </div>
                        <div className='h-1 w-full bg-muted/30 rounded-full overflow-hidden'>
                            <div
                                className={cn(
                                    'h-full transition-all duration-1000',
                                    healthPercent < 20 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : healthPercent < 50 ? 'bg-amber-500' : 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                                )}
                                style={{ width: `${healthPercent}%` }}
                            />
                        </div>
                        <div className='flex justify-between items-center gap-4 flex-wrap'>
                            <div className='flex gap-3'>
                                <span className='text-[8px] text-muted-foreground/30 font-black uppercase'>{t('equipmentTooling.molds.dialog.metrics.current', { value: watchedCurrent })}</span>
                                <span className='text-[8px] text-muted-foreground/30 font-black uppercase'>{t('equipmentTooling.molds.dialog.metrics.total', { value: form.getValues('totalLifeCycles') || 0 })}</span>
                            </div>
                            <Badge variant='outline' className='h-4 border-none bg-primary/5 text-primary text-[8px] font-black uppercase whitespace-nowrap'>
                                {t('equipmentTooling.molds.dialog.realtimeSync')}
                            </Badge>
                        </div>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                                <FormField
                                    control={form.control}
                                    name='sn'
                                    render={({ field }) => (
                                        <FormItem className='space-y-3'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 pl-1'>{t('equipmentTooling.molds.dialog.fields.sn')}</FormLabel>
                                            <FormControl>
                                                <Input className='h-12 rounded-2xl border-none bg-muted/50 font-black text-sm tabular-nums focus:ring-2 focus:ring-primary/20 transition-all' placeholder={t('equipmentTooling.molds.dialog.placeholders.sn')} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='name'
                                    render={({ field }) => (
                                        <FormItem className='space-y-3'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 pl-1'>{t('equipmentTooling.molds.dialog.fields.name')}</FormLabel>
                                            <FormControl>
                                                <Input className='h-12 rounded-2xl border-none bg-muted/50 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all' placeholder={t('equipmentTooling.molds.dialog.placeholders.name')} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name='groupName'
                                render={({ field }) => (
                                    <FormItem className='space-y-3'>
                                        <div className='flex items-center justify-between px-1 flex-wrap gap-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-primary/80'>{t('equipmentTooling.molds.dialog.fields.group')}</FormLabel>
                                            {groupNames.length > 0 && (
                                                <Button
                                                    type='button'
                                                    variant='ghost'
                                                    size='sm'
                                                    className='h-5 px-2 text-[9px] gap-1 font-black uppercase tracking-widest hover:bg-primary/5'
                                                    onClick={() => {
                                                        setIsAddingNewGroup(!isAddingNewGroup)
                                                        if (!isAddingNewGroup) field.onChange('')
                                                    }}
                                                >
                                                    {isAddingNewGroup ? <><RotateCcw className='size-2.5' /> {t('equipmentTooling.molds.dialog.actions.useChooser')}</> : <><Plus className='size-2.5' /> {t('equipmentTooling.molds.dialog.actions.newGroup')}</>}
                                                </Button>
                                            )}
                                        </div>
                                        <FormControl>
                                            {isAddingNewGroup || groupNames.length === 0 ? (
                                                <Input className='h-12 rounded-2xl border-none bg-muted/50 font-black text-sm focus:ring-2 focus:ring-primary/20 transition-all' placeholder={t('equipmentTooling.molds.dialog.placeholders.newGroup')} {...field} autoFocus={isAddingNewGroup} />
                                            ) : (
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 font-black text-sm focus:ring-2 focus:ring-primary/20 transition-all'>
                                                            <SelectValue placeholder={t('equipmentTooling.molds.dialog.placeholders.selectRegistry')} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className='rounded-2xl border-none shadow-2xl'>
                                                        {groupNames.map((g) => (
                                                            <SelectItem key={g} value={g} className='font-black uppercase text-[11px] py-3'>{g}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                                <FormField
                                    control={form.control}
                                    name='location'
                                    render={({ field }) => (
                                        <FormItem className='space-y-3'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 pl-1'>{t('equipmentTooling.molds.dialog.fields.location')}</FormLabel>
                                            <FormControl>
                                                <Input className='h-12 rounded-2xl border-none bg-muted/50 font-black text-sm focus:ring-2 focus:ring-primary/20 transition-all uppercase' placeholder={t('equipmentTooling.molds.dialog.placeholders.location')} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='currentCycles'
                                    render={({ field }) => (
                                        <FormItem className='space-y-3'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-primary/80 pl-1'>{t('equipmentTooling.molds.dialog.fields.currentCycles')}</FormLabel>
                                            <FormControl>
                                                <Input type='number' className='h-12 rounded-2xl border-none bg-primary/5 font-black text-sm tabular-nums text-primary focus:ring-2 focus:ring-primary/20 transition-all' placeholder={t('equipmentTooling.molds.dialog.placeholders.currentCycles')} {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                                <FormField
                                    control={form.control}
                                    name='maxCycles'
                                    render={({ field }) => (
                                        <FormItem className='space-y-3'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 pl-1'>{t('equipmentTooling.molds.dialog.fields.maxCycles')}</FormLabel>
                                            <FormControl>
                                                <Input type='number' className='h-12 rounded-2xl border-none bg-muted/50 font-black text-sm tabular-nums' {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='maintenanceThreshold'
                                    render={({ field }) => (
                                        <FormItem className='space-y-3'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-rose-500/60 pl-1'>{t('equipmentTooling.molds.dialog.fields.maintenanceThreshold')}</FormLabel>
                                            <FormControl>
                                                <Input type='number' className='h-12 rounded-2xl border-none bg-rose-500/5 font-black text-sm tabular-nums text-rose-600 focus:ring-rose-200' {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name='imageUrl'
                                render={({ field }) => (
                                    <FormItem className='space-y-3'>
                                        <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 pl-1'>{t('equipmentTooling.molds.dialog.fields.image')}</Label>
                                        <FormControl>
                                            <ImageUpload value={field.value} onChange={field.onChange} label={t('equipmentTooling.molds.dialog.labels.image')} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {editData && (
                                <div className='p-4 rounded-[24px] border border-dashed bg-primary/2 space-y-3'>
                                    <div className='flex items-center justify-between px-1 flex-wrap gap-2'>
                                        <span className='text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest flex items-center gap-2'>
                                            <FileText className='size-3' /> {t('equipmentTooling.molds.dialog.labels.linkedDrawings', { count: linkedDrawings.length })}
                                        </span>
                                        {canOpenDrawings ? (
                                            <Button variant='ghost' size='sm' className='h-5 px-2 text-[9px] text-primary font-black uppercase tracking-widest gap-1' asChild>
                                                <Link to='/equipment-tooling/drawings'>
                                                    {t('equipmentTooling.molds.dialog.actions.archive')} <ExternalLink className='size-2.5' />
                                                </Link>
                                            </Button>
                                        ) : null}
                                    </div>
                                    <div className='flex flex-wrap gap-2 px-1'>
                                        {linkedDrawings.length > 0 ? (
                                            linkedDrawings.slice(0, 4).map((d) => (
                                                <Badge key={d.id} variant='outline' className='bg-white text-[9px] border-muted/50 font-black h-5 px-2 rounded-md uppercase'>
                                                    {d.name.length > 12 ? `${d.name.substring(0, 12)}..` : d.name}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className='text-[9px] text-muted-foreground/20 font-black italic tracking-widest uppercase'>{t('equipmentTooling.molds.dialog.emptyLinkedDrawings')}</span>
                                        )}
                                        {linkedDrawings.length > 4 && <span className='text-[9px] text-muted-foreground/30 font-black'>+{linkedDrawings.length - 4}</span>}
                                    </div>
                                </div>
                            )}

                            <FormField
                                control={form.control}
                                name='description'
                                render={({ field }) => (
                                    <FormItem className='space-y-3'>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 pl-1'>{t('equipmentTooling.molds.dialog.fields.description')}</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder={t('equipmentTooling.molds.dialog.placeholders.description')} className='resize-none h-20 rounded-2xl border-none bg-muted/50 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all p-4' {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </div>

                <DialogFooter className='p-6 sm:px-8 bg-muted/5 border-t border-dashed border-muted-foreground/10 flex flex-row sm:justify-end gap-3 shrink-0'>
                    <Button type='button' variant='ghost' className='flex-1 sm:flex-none rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest' onClick={() => onOpenChange(false)}>
                        {t('equipmentTooling.molds.dialog.actions.cancel')}
                    </Button>
                    <Button onClick={form.handleSubmit(onSubmit)} className='flex-1 sm:flex-none rounded-full h-11 px-10 bg-primary hover:bg-primary/90 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 gap-2'>
                        <Save className='size-3.5' /> {t('equipmentTooling.molds.dialog.actions.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
