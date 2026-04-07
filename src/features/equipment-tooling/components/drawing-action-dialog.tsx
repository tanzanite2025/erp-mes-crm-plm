'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FilePlus, Save, FileText, Upload } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { type MoldDrawing, type Mold, moldDrawingSchema } from '../data/schema'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { AssetService as GlobalAssetService } from '@/services/asset-service'
import { type DeltaSet } from '@/lib/delta/types'
import { useMemo, useEffect, useState } from 'react'
import { toast } from 'sonner'

interface DrawingActionDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    currentRow?: MoldDrawing | null
    molds: Mold[]
    onSubmit: (data: MoldDrawing, isPatch?: boolean, delta?: DeltaSet) => Promise<void>
}

const EMPTY_MOLD_VALUE = '__NONE__'

export function DrawingActionDialog({
    isOpen,
    onOpenChange,
    currentRow,
    molds,
    onSubmit
}: DrawingActionDialogProps) {
    const { t } = useLanguage()
    const [pendingFile, setPendingFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    
    // SDRTS: 状态初始化
    const isEdit = !!currentRow
    
    const initialValues = useMemo(() => {
        if (currentRow) return currentRow
        return {
            id: `DRAWING-${Math.floor(Math.random() * 90000) + 10000}`,
            moldId: '',
            moldSn: '',
            name: '',
            type: '2D' as const,
            fileUrl: '',
            version: 'V1.0',
            sysVersion: 1,
            status: 'ACTIVE' as const,
            uploadedAt: new Date().toISOString(),
            remarks: '',
        }
    }, [currentRow])

    const { tracker, deltaProxy } = useDeltaTracker<MoldDrawing>(initialValues, isOpen)

    const form = useForm<MoldDrawing>({
        resolver: zodResolver(moldDrawingSchema) as any,
        defaultValues: initialValues as any,
    })

    useEffect(() => {
        if (isOpen) {
            form.reset(initialValues as any)
            setPendingFile(null)
        }
    }, [isOpen, initialValues, form])

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        setPendingFile(file)
        if (!form.getValues('name')) {
            form.setValue('name', file.name)
        }
    }

    const handleFormSubmit = async (values: MoldDrawing) => {
        try {
            // 安全校验：资产解绑完整性检查
            if (isEdit && initialValues.moldSn && !values.moldSn) {
                const confirmed = window.confirm(t('equipmentTooling.drawings.dialog.warnings.unbindConfirm'))
                if (!confirmed) return
            }

            let finalFileUrl = values.fileUrl

            // 如果有新文件待上传
            if (pendingFile) {
                setIsUploading(true)
                toast.loading(t('equipmentTooling.drawings.toast.uploading'), { id: 'upload' })
                const uploadResult = await GlobalAssetService.uploadFile(pendingFile)
                finalFileUrl = uploadResult.url
                form.setValue('fileUrl', finalFileUrl)
                toast.success(t('equipmentTooling.drawings.toast.uploaded'), { id: 'upload' })
            }

            if (!finalFileUrl) {
                toast.error(t('equipmentTooling.drawings.toast.fileRequired'))
                return
            }

            const submissionData = { ...values, fileUrl: finalFileUrl }
            
            // SDRTS: 同步到代理并获取差量
            Object.assign(deltaProxy, submissionData)
            const delta = tracker.commit()
            const isDirty = Object.keys(delta).length > 0

            if (isEdit && !isDirty) {
                onOpenChange(false)
                return
            }

            await onSubmit(submissionData, isEdit, isEdit ? delta : undefined)
            onOpenChange(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '文件上传或保存失败', { id: 'upload' })
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className='w-[95vw] sm:max-w-lg max-h-[92vh] flex flex-col p-0 rounded-[32px] shadow-2xl border-none overflow-hidden'>
                <DialogHeader className='p-6 sm:p-8 shrink-0 pb-4 bg-primary/5 border-b border-dashed'>
                    <DialogTitle className='text-xl font-black tracking-tighter flex items-center gap-3 italic uppercase'>
                        <FilePlus className='size-6 text-blue-600' />
                        {isEdit ? t('equipmentTooling.drawings.dialog.title.edit') : t('equipmentTooling.drawings.dialog.title.create')}
                    </DialogTitle>
                </DialogHeader>
                
                <div className='flex-1 overflow-y-auto px-6 sm:p-8 pt-6 custom-scrollbar pb-8'>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleFormSubmit)} className='space-y-6'>
                            <FormField
                                control={form.control}
                                name='name'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1 italic'>{t('equipmentTooling.drawings.dialog.fields.name')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                className='h-12 rounded-2xl border-none bg-muted/50 font-bold focus:ring-blue-500/20'
                                                placeholder={t('equipmentTooling.drawings.dialog.placeholders.name')}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className='text-[10px] font-bold' />
                                    </FormItem>
                                )}
                            />

                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                <FormField
                                    control={form.control}
                                    name='type'
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1 italic'>{t('equipmentTooling.drawings.dialog.fields.type')}</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 font-bold'>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className='rounded-2xl border-none shadow-2xl'>
                                                    <SelectItem value='2D' className='rounded-xl font-bold'>{t('equipmentTooling.drawings.types.twoD')}</SelectItem>
                                                    <SelectItem value='3D' className='rounded-xl font-bold'>{t('equipmentTooling.drawings.types.threeD')}</SelectItem>
                                                    <SelectItem value='TECH_SPEC' className='rounded-xl font-bold'>{t('equipmentTooling.drawings.types.techSpec')}</SelectItem>
                                                    <SelectItem value='OTHER' className='rounded-xl font-bold'>{t('equipmentTooling.drawings.types.other')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className='text-[10px] font-bold' />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='version'
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1 italic'>{t('equipmentTooling.drawings.dialog.fields.version')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className='h-12 rounded-2xl border-none bg-muted/50 font-mono font-bold'
                                                    placeholder={t('equipmentTooling.drawings.dialog.placeholders.version')}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className='text-[10px] font-bold' />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name='moldSn'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-primary/40 ml-1 italic'>{t('equipmentTooling.drawings.dialog.fields.mold')}</FormLabel>
                                        <Select
                                            value={field.value || EMPTY_MOLD_VALUE}
                                            onValueChange={(val) => {
                                                const selected = molds.find(m => m.sn === val)
                                                field.onChange(val === EMPTY_MOLD_VALUE ? '' : val)
                                                if (selected) {
                                                    form.setValue('moldId', selected.id)
                                                }
                                            }}
                                        >
                                            <FormControl>
                                                <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 font-bold'>
                                                    <SelectValue placeholder={t('equipmentTooling.drawings.dialog.placeholders.selectMold')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className='rounded-2xl border-none shadow-2xl'>
                                                <SelectItem value={EMPTY_MOLD_VALUE} className='rounded-xl italic text-muted-foreground'>
                                                    {t('equipmentTooling.drawings.options.independent')}
                                                </SelectItem>
                                                {molds.map((mold) => (
                                                    <SelectItem key={mold.id} value={mold.sn} className='rounded-xl font-bold'>
                                                        {mold.sn} - {mold.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className='text-[10px] font-bold' />
                                    </FormItem>
                                )}
                            />

                            <div className='space-y-2'>
                                <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1 italic'>{t('equipmentTooling.drawings.dialog.fields.source')}</FormLabel>
                                {(form.watch('fileUrl') || pendingFile) ? (
                                    <div className='p-4 bg-emerald-500/5 rounded-2xl border border-dashed border-emerald-500/20 flex items-center justify-between'>
                                        <div className='flex items-center gap-3'>
                                            <div className='size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0'>
                                                <FileText className='size-5 text-emerald-600' />
                                            </div>
                                            <div className='min-w-0'>
                                                <span className='text-[10px] font-black text-emerald-600 uppercase tracking-widest block'>
                                                    {t('equipmentTooling.drawings.source.ready')}
                                                </span>
                                                <span className='text-[9px] text-emerald-600/60 font-mono italic truncate block max-w-[200px]'>
                                                    {pendingFile?.name || t('equipmentTooling.drawings.source.archived')}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            type='button'
                                            variant='ghost'
                                            size='sm'
                                            className='rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-500'
                                            onClick={() => {
                                                form.setValue('fileUrl', '')
                                                setPendingFile(null)
                                            }}
                                        >
                                            {t('equipmentTooling.drawings.source.reupload')}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className='border-2 border-dashed border-muted-foreground/10 rounded-[24px] p-8 sm:p-10 bg-muted/5 flex flex-col items-center justify-center gap-3 hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer relative group'>
                                        <div className='size-14 rounded-full bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform'>
                                            <Upload className='size-6 text-primary' />
                                        </div>
                                        <p className='text-[10px] font-black text-muted-foreground uppercase tracking-widest'>{t('equipmentTooling.drawings.source.clickUpload')}</p>
                                        <input type='file' className='absolute inset-0 opacity-0 cursor-pointer' onChange={handleFileUpload} />
                                    </div>
                                )}
                            </div>

                            <FormField
                                control={form.control}
                                name='remarks'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1 italic'>{t('equipmentTooling.drawings.dialog.fields.remarks')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                className='h-12 rounded-2xl border-none bg-muted/50 font-bold'
                                                placeholder={t('equipmentTooling.drawings.dialog.placeholders.remarks')}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className='text-[10px] font-bold' />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </div>

                <DialogFooter className='p-6 sm:p-8 bg-muted/5 border-t border-dashed border-muted-foreground/10 flex flex-row sm:justify-end gap-3 shrink-0'>
                    <Button
                        variant='ghost'
                        onClick={() => onOpenChange(false)}
                        className='flex-1 sm:flex-none rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest'
                    >
                        {t('equipmentTooling.drawings.dialog.actions.cancel')}
                    </Button>
                    <Button
                        onClick={form.handleSubmit(handleFormSubmit)}
                        disabled={isUploading}
                        className='flex-1 sm:flex-none rounded-full shadow-lg h-11 px-10 font-black text-[10px] uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 active:scale-95 transition-all'
                    >
                        <Save className='size-3.5 mr-2' />
                        {isEdit ? t('common.actions.save') : (t as any)('common.actions.create') || t('common.actions.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
