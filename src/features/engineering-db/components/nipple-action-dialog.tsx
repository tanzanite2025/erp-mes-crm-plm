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
import { FileUploader } from '@/components/file-uploader'
import { toast } from 'sonner'
import { nippleSchema, type Nipple } from '../data/nipple-schema'
import { useLanguage } from '@/context/language-provider'

type NippleForm = z.infer<typeof nippleSchema>

interface NippleActionDialogProps {
    currentRow?: Nipple
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: Nipple) => void
}

export function NippleActionDialog({
    currentRow,
    open,
    onOpenChange,
    onSubmit,
}: NippleActionDialogProps) {
    const { t } = useLanguage()
    const isEdit = !!currentRow

    const form = useForm<NippleForm>({
        resolver: zodResolver(nippleSchema) as any,
        defaultValues: {
            id: '',
            name: '',
            brand: '',
            material: '',
            length: '',
            color: '',
            fileUrl: '',
            fileExtension: '',
            createdAt: new Date().toISOString(),
        },
    })

    useEffect(() => {
        if (open) {
            if (isEdit && currentRow) {
                form.reset(currentRow)
            } else {
                form.reset({
                    id: `NIP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                    name: '',
                    brand: '',
                    material: '',
                    length: '',
                    color: '',
                    fileUrl: '',
                    fileExtension: '',
                    createdAt: new Date().toISOString(),
                })
            }
        }
    }, [currentRow, open, isEdit, form])

    const handleFormSubmit = (values: NippleForm) => {
        onSubmit(values as Nipple)
        onOpenChange(false)
        toast.success(isEdit ? t('engineering.nipples.toasts.updateSuccess') : t('engineering.nipples.toasts.saveSuccess'))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-xl rounded-[32px] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[92vh] md:max-h-[85vh]'>
                <div className='absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent pointer-events-none' />
                
                <DialogHeader className='p-6 md:p-8 pb-0 shrink-0 relative'>
                    <DialogTitle className='text-base md:text-lg font-black italic uppercase tracking-tight'>
                        {isEdit ? t('engineering.nipples.dialog.editTitle') : t('engineering.nipples.dialog.createTitle')}
                    </DialogTitle>
                    <DialogDescription className='text-[9px] md:text-[10px] font-medium uppercase tracking-widest opacity-60'>
                        {t('engineering.nipples.dialog.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className='flex-1 overflow-y-auto px-6 md:px-8 py-4 custom-scrollbar relative'>
                    <Form {...form}>
                        <form id='nipple-form' onSubmit={form.handleSubmit(handleFormSubmit)} className='space-y-6'>
                            <FormField
                                control={form.control}
                                name='name'
                                render={({ field }) => (
                                    <FormItem className='space-y-2'>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('engineering.nipples.form.name')}</FormLabel>
                                        <FormControl><Input placeholder={t('engineering.nipples.placeholders.name')} className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner' {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <FormField
                                    control={form.control}
                                    name='brand'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('engineering.nipples.form.brand')}</FormLabel>
                                            <FormControl><Input placeholder={t('engineering.nipples.placeholders.brand')} className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner' {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='material'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('engineering.nipples.form.material')}</FormLabel>
                                            <FormControl><Input placeholder={t('engineering.nipples.placeholders.material')} className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner' {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <FormField
                                    control={form.control}
                                    name='length'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('engineering.nipples.form.length')}</FormLabel>
                                            <FormControl><Input placeholder={t('engineering.nipples.placeholders.length')} className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner' {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='color'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('engineering.nipples.form.color')}</FormLabel>
                                            <FormControl><Input placeholder={t('engineering.nipples.placeholders.color')} className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner' {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className='bg-orange-500/5 p-5 md:p-6 rounded-[24px] border border-dashed border-orange-500/20'>
                                <FormField
                                    control={form.control}
                                    name='fileUrl'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[9px] font-black uppercase tracking-widest text-orange-600/60'>{t('engineering.nipples.form.attachment')}</FormLabel>
                                            <FormControl>
                                                <FileUploader 
                                                    value={field.value} 
                                                    accept='image/*'
                                                    onChange={(url, ext) => {
                                                        field.onChange(url)
                                                        if (ext) form.setValue('fileExtension', ext)
                                                    }}
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

                <DialogFooter className='p-6 md:p-8 pt-4 shrink-0 flex flex-row gap-3 border-t border-dashed border-muted-foreground/10 bg-muted/5 relative'>
                    <Button variant='ghost' onClick={() => onOpenChange(false)} className='flex-1 md:flex-none rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest opacity-60'>取消</Button>
                    <Button type='submit' form='nipple-form' className='flex-2 md:flex-none rounded-full h-11 px-12 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-600/20 bg-orange-600 hover:bg-orange-700 text-white'>{t('engineering.nipples.form.submit')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
