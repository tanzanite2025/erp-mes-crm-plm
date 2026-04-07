'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Factory, Save } from 'lucide-react'
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
import { type EquipmentPartner, equipmentPartnerSchema } from '../data/schema'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { type DeltaSet } from '@/lib/delta/types'
import { useMemo, useEffect } from 'react'

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
            id: `PARTNER-${Math.floor(Math.random() * 90000) + 10000}`,
            name: '',
            type: 'INTERNAL' as const,
            contactPerson: '',
            phone: '',
            address: '',
            version: 1,
            createdAt: new Date().toISOString(),
        }
    }, [currentRow])

    const { tracker, deltaProxy } = useDeltaTracker<EquipmentPartner>(initialValues, isOpen)

    const form = useForm<EquipmentPartner>({
        resolver: zodResolver(equipmentPartnerSchema) as any,
        defaultValues: initialValues as any,
    })

    useEffect(() => {
        if (isOpen) {
            form.reset(initialValues as any)
        }
    }, [isOpen, initialValues, form])

    const handleFormSubmit = (values: EquipmentPartner) => {
        Object.assign(deltaProxy, values)
        const delta = tracker.commit()
        const isDirty = Object.keys(delta).length > 0

        if (isEdit && !isDirty) {
            onOpenChange(false)
            return
        }

        onSubmit(values, isEdit, isEdit ? delta : undefined)
        onOpenChange(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className='w-[95vw] sm:max-w-md max-h-[92vh] flex flex-col p-0 rounded-[32px] shadow-2xl border-none overflow-hidden'>
                <DialogHeader className='p-6 sm:p-8 shrink-0 pb-4 bg-muted/5 border-b border-dashed'>
                    <DialogTitle className='text-xl font-black tracking-tighter flex items-center gap-2 italic uppercase'>
                        <Factory className='size-6 text-blue-600' />
                        {isEdit ? t('equipmentTooling.partners.dialog.title.edit') : t('equipmentTooling.partners.dialog.title.create')}
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
                </div>

                <DialogFooter className='p-6 sm:px-8 bg-muted/5 border-t border-dashed border-muted-foreground/10 flex flex-row sm:justify-end gap-3 shrink-0'>
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
                        {isEdit ? t('common.actions.save') : (t as any)('common.actions.create') || t('common.actions.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
