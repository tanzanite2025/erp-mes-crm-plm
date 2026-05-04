'use client'

import { useEffect, useMemo } from 'react'
import { Thermometer } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActionDialogShell } from '@/components/action-dialog-shell'
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
import { Textarea } from '@/components/ui/textarea'
import { createFurnaceDraft, createFurnaceSchema, type Furnace, type FurnaceFormInput, type FurnaceFormOutput } from '../data/schema'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { type DeltaSet } from '@/lib/delta/types'
import { prepareTrackedDialogSubmit } from '../utils/tracked-dialog-submit'

interface FurnaceActionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (data: Furnace, isPatch?: boolean, delta?: DeltaSet) => void
    editData?: Furnace | null
}

export function FurnaceActionDialog({
    open,
    onOpenChange,
    onConfirm,
    editData,
}: FurnaceActionDialogProps) {
    const { t } = useLanguage()
    const { allowsAction } = useNonBlockingPermissionActions()
    const defaultFurnaceType = t('equipmentTooling.furnaces.dialog.defaults.type')
    const furnaceFormSchema = useMemo(() => createFurnaceSchema(t), [t])
    const defaultDraft = useMemo(() => createFurnaceDraft(defaultFurnaceType, editData ?? {}), [defaultFurnaceType, editData])

    const { commit, deltaProxy, reset } = useDeltaTracker<Furnace>(editData || createFurnaceDraft(defaultFurnaceType))
    const isEdit = !!editData

    const form = useForm<FurnaceFormInput, unknown, FurnaceFormOutput>({
        resolver: zodResolver(furnaceFormSchema),
        defaultValues: defaultDraft,
    })

    useEffect(() => {
        if (!open) return

        const draft = editData ? createFurnaceDraft(defaultFurnaceType, editData) : createFurnaceDraft(defaultFurnaceType)
        form.reset(draft)
        reset(draft)
    }, [defaultFurnaceType, editData, form, open, reset])

    const onSubmit = (data: FurnaceFormOutput) => {
        if (!allowsAction('action_equipment_furnace_manage')) return

        const { delta, isDirty, patchDelta } = prepareTrackedDialogSubmit({
            values: data,
            deltaProxy,
            commit,
            isEdit,
        })

        if (isEdit && !isDirty) {
            onOpenChange(false)
            return
        }

        if (isEdit && editData?.version === undefined) {
             throw new Error('[CRITICAL] 炉台编辑模式下版本号(version)缺失，无法执行 SDRTS 安全 Patch。');
        }

        onConfirm(data as Furnace, isEdit, patchDelta ?? delta)
        onOpenChange(false)
    }

    return (
        <ActionDialogShell
            open={open}
            onOpenChange={onOpenChange}
            title={
                <div className='flex items-center gap-2 text-primary'>
                    <Thermometer className='size-5' />
                    <span>{editData ? t('equipmentTooling.furnaces.dialog.title.edit') : t('equipmentTooling.furnaces.dialog.title.create')}</span>
                </div>
            }
            description={t('equipmentTooling.furnaces.dialog.description')}
            contentDecoration={<div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />}
            contentClassName='relative w-[95vw] sm:max-w-lg max-h-[92vh] flex flex-col p-0 rounded-[32px] border-none shadow-2xl overflow-hidden bg-background'
            headerClassName='p-6 sm:p-8 shrink-0 pb-4 bg-primary/5 border-b border-dashed text-left'
            bodyClassName='flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar'
            footerClassName='p-6 sm:p-8 bg-muted/5 border-t border-dashed border-muted-foreground/10 flex flex-row sm:justify-end gap-3 shrink-0'
            titleClassName='text-lg font-black italic uppercase tracking-tighter'
            descriptionClassName='text-[9px] font-black uppercase tracking-widest opacity-60'
            footer={
                <>
                    <Button
                        type='button'
                        variant='ghost'
                        onClick={() => onOpenChange(false)}
                        className='flex-1 sm:flex-none rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest text-muted-foreground/60'
                    >
                        {t('equipmentTooling.furnaces.dialog.actions.cancel')}
                    </Button>
                    <Button
                        type='submit'
                        onClick={form.handleSubmit(onSubmit)}
                        className='flex-1 sm:flex-none rounded-full h-11 px-10 bg-blue-600 hover:bg-blue-700 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all'
                    >
                        {t('equipmentTooling.furnaces.dialog.actions.save')}
                    </Button>
                </>
            }
        >
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                <FormField
                                    control={form.control}
                                    name='sn'
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic ml-1'>
                                                {t('equipmentTooling.furnaces.dialog.fields.sn')}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t('equipmentTooling.furnaces.dialog.placeholders.sn')}
                                                    className='h-12 rounded-2xl border-none bg-muted/50 font-mono italic font-black shadow-inner'
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className='text-[10px] font-bold' />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='name'
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic ml-1'>
                                                {t('equipmentTooling.furnaces.dialog.fields.name')}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t('equipmentTooling.furnaces.dialog.placeholders.name')}
                                                    className='h-12 rounded-2xl border-none bg-muted/50 font-bold shadow-inner'
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className='text-[10px] font-bold' />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                <FormField
                                    control={form.control}
                                    name='type'
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic ml-1'>
                                                {t('equipmentTooling.furnaces.dialog.fields.type')}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t('equipmentTooling.furnaces.dialog.placeholders.type')}
                                                    className='h-12 rounded-2xl border-none bg-muted/50 font-bold shadow-inner'
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className='text-[10px] font-bold' />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='location'
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic ml-1'>
                                                {t('equipmentTooling.furnaces.dialog.fields.location')}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t('equipmentTooling.furnaces.dialog.placeholders.location')}
                                                    className='h-12 rounded-2xl border-none bg-muted/50 font-bold shadow-inner'
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
                                name='maxTemp'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic ml-1'>
                                            {t('equipmentTooling.furnaces.dialog.fields.maxTemp')}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type='number'
                                                className='h-12 rounded-2xl border-none bg-muted/50 font-mono font-black italic shadow-inner'
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                                            />
                                        </FormControl>
                                        <FormMessage className='text-[10px] font-bold' />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name='description'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic ml-1'>
                                            {t('equipmentTooling.furnaces.dialog.fields.description')}
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder={t('equipmentTooling.furnaces.dialog.placeholders.description')}
                                                className='min-h-[100px] rounded-2xl border-none bg-muted/50 font-medium resize-none'
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className='text-[10px] font-bold' />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
        </ActionDialogShell>
    )
}
