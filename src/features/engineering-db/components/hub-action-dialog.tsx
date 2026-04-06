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
import { useLanguage } from '@/context/language-provider'
import { hubSchema, type Hub } from '../data/hub-schema'

type HubForm = z.infer<typeof hubSchema>

interface HubActionDialogProps {
    currentRow?: Hub
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: Hub) => void
}

export function HubActionDialog({
    currentRow,
    open,
    onOpenChange,
    onSubmit,
}: HubActionDialogProps) {
    const { t } = useLanguage()
    const isEdit = !!currentRow

    const form = useForm<HubForm>({
        resolver: zodResolver(hubSchema) as any,
        defaultValues: {
            id: '',
            name: '',
            brand: '',
            model: '',
            holeCount: '',
            pcdLeft: '',
            pcdRight: '',
            flangeLeft: '',
            flangeRight: '',
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
                    id: `HUB-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                    name: '',
                    brand: '',
                    model: '',
                    holeCount: '',
                    pcdLeft: '',
                    pcdRight: '',
                    flangeLeft: '',
                    flangeRight: '',
                    fileUrl: '',
                    fileExtension: '',
                    createdAt: new Date().toISOString(),
                })
            }
        }
    }, [currentRow, open, isEdit, form])

    const handleFormSubmit = (values: HubForm) => {
        onSubmit(values as Hub)
        onOpenChange(false)
        toast.success(isEdit ? t('engineering.hubs.toasts.updateSuccess') : t('engineering.hubs.toasts.saveSuccess'))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-2xl rounded-[32px] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[92vh] md:max-h-[85vh]'>
                <div className='absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent pointer-events-none' />
                
                <DialogHeader className='p-6 md:p-8 pb-0 shrink-0 relative'>
                    <DialogTitle className='text-base md:text-lg font-black italic uppercase tracking-tight'>
                        {isEdit ? t('engineering.hubs.dialog.editTitle') : t('engineering.hubs.dialog.createTitle')}
                    </DialogTitle>
                    <DialogDescription className='text-[9px] md:text-[10px] font-medium uppercase tracking-widest opacity-60'>
                        {t('engineering.hubs.dialog.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className='flex-1 overflow-y-auto px-6 md:px-8 py-4 custom-scrollbar relative'>
                    <Form {...form}>
                        <form id='hub-form' onSubmit={form.handleSubmit(handleFormSubmit)} className='space-y-6'>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <FormField
                                    control={form.control}
                                    name='name'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('engineering.hubs.form.name')}</FormLabel>
                                            <FormControl><Input placeholder={t('engineering.hubs.placeholders.name')} className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner' {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='brand'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('engineering.hubs.form.brand')}</FormLabel>
                                            <FormControl><Input placeholder={t('engineering.hubs.placeholders.brand')} className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner' {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <FormField
                                    control={form.control}
                                    name='model'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('engineering.hubs.form.model')}</FormLabel>
                                            <FormControl><Input placeholder={t('engineering.hubs.placeholders.model')} className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner' {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='holeCount'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('engineering.hubs.form.holes')}</FormLabel>
                                            <FormControl><Input placeholder={t('engineering.hubs.placeholders.holes')} className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner' {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* 核心几何数值 */}
                            <div className='bg-muted/5 p-6 rounded-[28px] border border-dashed border-muted-foreground/10 space-y-4'>
                                <p className='text-[9px] font-black uppercase tracking-widest text-indigo-600/60 mb-2'>{t('engineering.hubs.form.geometryTitle')}</p>
                                <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
                                    <FormField control={form.control} name='pcdLeft' render={({ field }) => (
                                        <FormItem><FormLabel className='text-[9px] font-bold'>{t('engineering.hubs.form.pcdLeft')}</FormLabel><FormControl><Input className='h-10 rounded-xl bg-background border-none shadow-sm' {...field} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name='pcdRight' render={({ field }) => (
                                        <FormItem><FormLabel className='text-[9px] font-bold'>{t('engineering.hubs.form.pcdRight')}</FormLabel><FormControl><Input className='h-10 rounded-xl bg-background border-none shadow-sm' {...field} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name='flangeLeft' render={({ field }) => (
                                        <FormItem><FormLabel className='text-[9px] font-bold'>{t('engineering.hubs.form.flangeLeft')}</FormLabel><FormControl><Input className='h-10 rounded-xl bg-background border-none shadow-sm' {...field} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name='flangeRight' render={({ field }) => (
                                        <FormItem><FormLabel className='text-[9px] font-bold'>{t('engineering.hubs.form.flangeRight')}</FormLabel><FormControl><Input className='h-10 rounded-xl bg-background border-none shadow-sm' {...field} /></FormControl></FormItem>
                                    )} />
                                </div>
                            </div>

                            <div className='bg-indigo-500/5 p-5 md:p-6 rounded-[24px] border border-dashed border-indigo-500/20'>
                                <FormField
                                    control={form.control}
                                    name='fileUrl'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[9px] font-black uppercase tracking-widest text-indigo-600/60'>{t('engineering.hubs.form.attachment')}</FormLabel>
                                            <FormControl>
                                                <FileUploader 
                                                    value={field.value} 
                                                    accept='image/*,.pdf'
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
                    <Button variant='ghost' onClick={() => onOpenChange(false)} className='flex-1 md:flex-none rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest opacity-60'>{t('engineering.changeOrders.actions.cancel')}</Button>
                    <Button type='submit' form='hub-form' className='flex-2 md:flex-none rounded-full h-11 px-12 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white'>{t('engineering.hubs.form.submit')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
