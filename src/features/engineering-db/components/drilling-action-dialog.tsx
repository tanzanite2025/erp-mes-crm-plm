'use client'

import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
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
import { SelectDropdown } from '@/components/select-dropdown'
import { FileUploader } from '@/components/file-uploader'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { drillingPlanSchema, type DrillingPlan } from '../data/schema'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { dictionaryService } from '@/features/basic-settings/services/dictionary-service'

type DrillingForm = z.infer<typeof drillingPlanSchema>

interface DrillingActionDialogProps {
    currentRow?: DrillingPlan
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: DrillingPlan) => void
}

export function DrillingActionDialog({
    currentRow,
    open,
    onOpenChange,
    onSubmit,
}: DrillingActionDialogProps) {
    const { t } = useLanguage()
    const isEdit = !!currentRow
    const { data: products = [] } = useGetProducts()

    const form = useForm<DrillingForm>({
        resolver: zodResolver(drillingPlanSchema) as any,
        defaultValues: {
            id: '',
            name: '',
            productId: '',
            lacingPattern: '',
            standardHoles: '',
            fileUrl: '',
            fileExtension: 'pdf',
            createdAt: new Date().toISOString(),
        },
    })

    useEffect(() => {
        if (open) {
            if (isEdit && currentRow) {
                form.reset(currentRow)
            } else {
                form.reset({
                    id: '',
                    name: '',
                    productId: '',
                    lacingPattern: '',
                    standardHoles: '',
                    fileUrl: '',
                    fileExtension: 'pdf',
                    createdAt: new Date().toISOString(),
                })
            }
        }
    }, [currentRow, open, isEdit, form])

    const handleFormSubmit = (values: DrillingForm) => {
        onSubmit(values as DrillingPlan)
        onOpenChange(false)
        toast.success(isEdit ? t('engineering.drilling.toasts.updateSuccess') : t('engineering.drilling.toasts.saveSuccess'))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-xl rounded-[32px] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[92vh] md:max-h-[85vh]'>
                <div className='absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent pointer-events-none' />
                
                {/* Fixed Header */}
                <DialogHeader className='p-6 md:p-8 pb-0 shrink-0 relative'>
                    <DialogTitle className='text-base md:text-lg font-black italic uppercase tracking-tight'>
                        {isEdit ? t('engineering.drilling.dialog.editTitle') : t('engineering.drilling.dialog.createTitle')}
                    </DialogTitle>
                    <DialogDescription className='text-[9px] md:text-[10px] font-medium uppercase tracking-widest opacity-60'>
                        {t('engineering.drilling.dialog.description')}
                    </DialogDescription>
                </DialogHeader>

                {/* Scrollable Form Content */}
                <div className='flex-1 overflow-y-auto px-6 md:px-8 py-4 custom-scrollbar relative'>
                    <Form {...form}>
                        <form
                            id='drilling-form'
                            onSubmit={form.handleSubmit(handleFormSubmit)}
                            className='space-y-6'
                        >
                            <FormField
                                control={form.control}
                                name='name'
                                render={({ field }) => (
                                    <FormItem className='space-y-2'>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                            {t('engineering.drilling.form.name')}
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder={t('engineering.drilling.placeholders.name')} 
                                                className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm focus-visible:ring-1 focus-visible:ring-primary/20 shadow-inner'
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name='productId'
                                render={({ field }) => (
                                    <FormItem className='space-y-2'>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                            {t('engineering.drilling.form.product')}
                                        </FormLabel>
                                        <SelectDropdown
                                            defaultValue={field.value}
                                            onValueChange={field.onChange}
                                            items={(products || []).map(p => ({ label: `${p.sku} | ${p.name}`, value: p.id }))}
                                            placeholder={t('engineering.drilling.placeholders.product')}
                                            className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner'
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <FormField
                                    control={form.control}
                                    name='lacingPattern'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                                {t('engineering.drilling.form.lacing')}
                                            </FormLabel>
                                            <SelectDropdown
                                                defaultValue={field.value}
                                                onValueChange={field.onChange}
                                                items={dictionaryService.getOptions('LACING_PATTERN')}
                                                placeholder={t('engineering.drilling.placeholders.lacing')}
                                                className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner'
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='standardHoles'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                                {t('engineering.drilling.form.holes')}
                                            </FormLabel>
                                            <SelectDropdown
                                                defaultValue={field.value}
                                                onValueChange={field.onChange}
                                                items={dictionaryService.getOptions('HOLE_COUNT')}
                                                placeholder={t('engineering.drilling.placeholders.holes')}
                                                className='h-12 rounded-2xl border-none bg-muted-foreground/5 px-4 font-bold text-sm shadow-inner'
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            <div className='bg-indigo-500/5 p-5 md:p-6 rounded-[24px] border border-dashed border-indigo-500/20 space-y-3 relative overflow-hidden'>
                                <div className='absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent pointer-events-none' />
                                <FormField
                                    control={form.control}
                                    name='fileUrl'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2 pb-2'>
                                            <FormLabel className='text-[9px] font-black uppercase tracking-widest text-indigo-600/60'>
                                                {t('engineering.drilling.form.attachment')}
                                            </FormLabel>
                                            <FormControl>
                                                <FileUploader 
                                                    value={field.value} 
                                                    onChange={(url, ext) => {
                                                        field.onChange(url)
                                                        if (ext) {
                                                            const supported = ['pdf', 'dwg', 'dxf', 'stp', 'step']
                                                            if (supported.includes(ext)) {
                                                                form.setValue('fileExtension', ext)
                                                            }
                                                        }
                                                    }}
                                                    placeholder={t('engineering.drilling.placeholders.attachment')}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </form>
                    </Form>
                </div>

                {/* Fixed Footer */}
                <DialogFooter className='p-6 md:p-8 pt-4 shrink-0 flex flex-row gap-3 border-t border-dashed border-muted-foreground/10 bg-muted/5 relative'>
                    <Button 
                        variant='ghost' 
                        onClick={() => onOpenChange(false)} 
                        className='flex-1 md:flex-none rounded-full h-11 px-6 md:px-8 font-black text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 transition-all'
                    >
                        {t('engineering.changeOrders.actions.cancel')}
                    </Button>
                    <Button 
                        type='submit' 
                        form='drilling-form' 
                        className='flex-2 md:flex-none rounded-full h-11 px-10 md:px-12 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white'
                    >
                        {t('engineering.drilling.form.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
