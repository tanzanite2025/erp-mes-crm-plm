'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Factory, Save } from 'lucide-react'
import { type z } from 'zod'
import { ActionDialogShell } from '@/components/action-dialog-shell'
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
import { type EquipmentPartner, equipmentPartnerSchema } from '../data/schema'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { type DeltaSet } from '@/lib/delta/types'
import { useMemo, useEffect } from 'react'
import { prepareTrackedDialogSubmit } from '../utils/tracked-dialog-submit'

type EquipmentPartnerFormInput = z.input<typeof equipmentPartnerSchema>
type EquipmentPartnerFormOutput = z.output<typeof equipmentPartnerSchema>

interface PartnerActionDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    currentRow?: EquipmentPartner | null
    onSubmit: (data: EquipmentPartner, isPatch?: boolean, delta?: DeltaSet) => void
}

export function PartnerActionDialog({
    isOpen,
    onOpenChange,
    currentRow,
    onSubmit
}: PartnerActionDialogProps) {
    const { t } = useLanguage()
    
    // SDRTS: 状态初始化
    const isEdit = !!currentRow
    const initialValues = useMemo(() => {
        if (currentRow) return currentRow
        return {
            // [BACKEND-AUTHORITY]: 物理 ID 严禁在前端使用 Math.random 生成，必须由后端数据库在创建时分配。
            id: '',
            name: '',
            type: 'INTERNAL' as const,
            contactPerson: '',
            phone: '',
            address: '',
            version: 1,
            createdAt: new Date().toISOString(),
        }
    }, [currentRow])

    const { commit, deltaProxy, reset } = useDeltaTracker<EquipmentPartner>(initialValues, isOpen)

    const form = useForm<EquipmentPartnerFormInput, unknown, EquipmentPartnerFormOutput>({
        resolver: zodResolver(equipmentPartnerSchema),
        defaultValues: initialValues,
    })

    useEffect(() => {
        if (isOpen) {
            form.reset(initialValues)
            reset(initialValues)
        }
    }, [isOpen, initialValues, form, reset])

    const handleFormSubmit = (values: EquipmentPartnerFormOutput) => {
        const { isDirty, patchDelta } = prepareTrackedDialogSubmit({
            values,
            deltaProxy,
            commit,
            isEdit,
        })

        if (isEdit && !isDirty) {
            onOpenChange(false)
            return
        }

        onSubmit(values, isEdit, patchDelta)
        onOpenChange(false)
    }

    return (
        <ActionDialogShell
            open={isOpen}
            onOpenChange={onOpenChange}
            title={
                <div className='flex items-center gap-2'>
                    <Factory className='size-6 text-blue-600' />
                    <span>{isEdit ? t('equipmentTooling.partners.dialog.title.edit') : t('equipmentTooling.partners.dialog.title.create')}</span>
                </div>
            }
            contentDecoration={<div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />}
            contentClassName='relative w-[95vw] sm:max-w-md max-h-[92vh] flex flex-col p-0 rounded-[32px] shadow-2xl border-none overflow-hidden bg-background'
            headerClassName='p-6 sm:p-8 shrink-0 pb-4 bg-muted/5 border-b border-dashed text-left'
            bodyClassName='flex-1 overflow-y-auto px-6 sm:p-8 pt-6 custom-scrollbar pb-8'
            footerClassName='p-6 sm:px-8 bg-muted/5 border-t border-dashed border-muted-foreground/10 flex flex-row sm:justify-end gap-3 shrink-0'
            titleClassName='text-xl font-black tracking-tighter italic uppercase'
            footer={
                <>
                    <Button
                        variant='ghost'
                        onClick={() => onOpenChange(false)}
                        className='flex-1 sm:flex-none rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest'
                    >
                        {t('equipmentTooling.partners.dialog.actions.cancel')}
                    </Button>
                    <Button
                        onClick={form.handleSubmit(handleFormSubmit)}
                        className='flex-1 sm:flex-none rounded-full shadow-lg h-11 px-10 font-black text-[10px] uppercase tracking-widest bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 active:scale-95 transition-all'
                    >
                        <Save className='size-3.5 mr-2' />
                        {t('common.actions.save')}
                    </Button>
                </>
            }
        >
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleFormSubmit)} className='space-y-6'>
                            <FormField
                                control={form.control}
                                name='name'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1 italic'>{t('equipmentTooling.partners.dialog.fields.name')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                className='h-12 rounded-2xl border-none bg-muted/50 font-bold'
                                                placeholder={t('equipmentTooling.partners.dialog.placeholders.name')}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className='text-[10px] font-bold' />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name='type'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1 italic'>{t('equipmentTooling.partners.dialog.fields.type')}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 focus:ring-blue-500/20 font-bold'>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className='rounded-2xl border-none shadow-2xl'>
                                                <SelectItem value='INTERNAL' className='rounded-xl font-bold'>{t('equipmentTooling.partners.types.internal')}</SelectItem>
                                                <SelectItem value='EXTERNAL' className='rounded-xl font-bold'>{t('equipmentTooling.partners.types.external')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className='text-[10px] font-bold' />
                                    </FormItem>
                                )}
                            />

                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                <FormField
                                    control={form.control}
                                    name='contactPerson'
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1 italic'>{t('equipmentTooling.partners.dialog.fields.contact')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className='h-12 rounded-2xl border-none bg-muted/50 font-bold'
                                                    placeholder={t('equipmentTooling.partners.dialog.placeholders.contact')}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className='text-[10px] font-bold' />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='phone'
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1 italic'>{t('equipmentTooling.partners.dialog.fields.phone')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className='h-12 rounded-2xl border-none bg-muted/50 font-mono font-bold'
                                                    placeholder={t('equipmentTooling.partners.dialog.placeholders.phone')}
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
                                name='address'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1 italic'>{t('equipmentTooling.partners.dialog.fields.address')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                className='h-12 rounded-2xl border-none bg-muted/50 font-bold'
                                                placeholder={t('equipmentTooling.partners.dialog.placeholders.address')}
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
