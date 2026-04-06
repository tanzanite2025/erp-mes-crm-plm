'use client'

import { useEffect, useMemo } from 'react'
import { Thermometer } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
import { createFurnaceSchema, type Furnace } from '../data/schema'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { useLanguage } from '@/context/language-provider'

interface FurnaceActionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (data: Furnace) => void
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

    const form = useForm<Furnace>({
        resolver: zodResolver(furnaceFormSchema),
        defaultValues: {
            id: editData?.id || '',
            sn: editData?.sn || '',
            name: editData?.name || '',
            type: editData?.type || defaultFurnaceType,
            maxTemp: editData?.maxTemp || 1200,
            currentTemp: editData?.currentTemp || 25,
            status: editData?.status || 'IDLE',
            location: editData?.location || '',
            description: editData?.description || '',
            createdAt: editData?.createdAt || new Date().toISOString(),
        },
    })

    useEffect(() => {
        if (!open) return

        form.reset(editData || {
            id: '',
            sn: '',
            name: '',
            type: defaultFurnaceType,
            maxTemp: 1200,
            currentTemp: 25,
            status: 'IDLE',
            location: '',
            description: '',
            createdAt: new Date().toISOString(),
        })
    }, [defaultFurnaceType, editData, form, open])

    const onSubmit = (data: Furnace) => {
        if (!allowsAction('action_equipment_furnace_manage')) return
        onConfirm(data)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='w-[95vw] sm:max-w-lg max-h-[92vh] flex flex-col p-0 rounded-[32px] border-none shadow-2xl overflow-hidden'>
                <DialogHeader className='p-6 sm:p-8 shrink-0 pb-4 bg-primary/5 border-b border-dashed'>
                    <div className='flex items-center gap-2 text-primary'>
                        <Thermometer className='size-5' />
                        <DialogTitle className='text-lg font-black italic uppercase tracking-tighter'>
                            {editData ? t('equipmentTooling.furnaces.dialog.title.edit') : t('equipmentTooling.furnaces.dialog.title.create')}
                        </DialogTitle>
                    </div>
                    <DialogDescription className='text-[9px] font-black uppercase tracking-widest opacity-60'>
                        {t('equipmentTooling.furnaces.dialog.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className='flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar'>
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
                </div>

                <DialogFooter className='p-6 sm:p-8 bg-muted/5 border-t border-dashed border-muted-foreground/10 flex flex-row sm:justify-end gap-3 shrink-0'>
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
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
