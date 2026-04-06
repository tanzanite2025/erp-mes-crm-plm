'use client'

import { useEffect, useState } from 'react'
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
import { spokeLengthSchema, type SpokeLength } from '../data/schema'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { hubService } from '../services/hub-service'
import { nippleService } from '../services/nipple-service'
import { type Hub } from '../data/hub-schema'
import { type Nipple } from '../data/nipple-schema'

type SpokeLengthForm = z.infer<typeof spokeLengthSchema>

interface SpokeLengthActionDialogProps {
    currentRow?: SpokeLength
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: SpokeLength) => void
}

export function SpokeLengthActionDialog({
    currentRow,
    open,
    onOpenChange,
    onSubmit,
}: SpokeLengthActionDialogProps) {
    const { t } = useLanguage()
    const isEdit = !!currentRow
    const { data: products = [] } = useGetProducts()
    const [hubs, setHubs] = useState<Hub[]>([])
    const [nipples, setNipples] = useState<Nipple[]>([])

    const form = useForm<SpokeLengthForm>({
        resolver: zodResolver(spokeLengthSchema) as any,
        defaultValues: {
            id: '',
            name: '',
            productId: '',
            hubId: '',
            nippleId: '',
            length: '',
            material: '',
            fileUrl: '',
            fileExtension: '',
            createdAt: new Date().toISOString(),
        },
    })

    useEffect(() => {
        if (open) {
            // 加载关联数据
            const loadMasterData = async () => {
                const [hubData, nippleData] = await Promise.all([
                    hubService.getHubs(),
                    nippleService.getNipples()
                ])
                setHubs(hubData)
                setNipples(nippleData)
            }
            loadMasterData()

            if (isEdit && currentRow) {
                form.reset(currentRow)
            } else {
                form.reset({
                    id: `SL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                    name: '',
                    productId: '',
                    hubId: '',
                    nippleId: '',
                    length: '',
                    material: '',
                    fileUrl: '',
                    fileExtension: '',
                    createdAt: new Date().toISOString(),
                })
            }
        }
    }, [currentRow, open, isEdit, form])

    const handleFormSubmit = (values: SpokeLengthForm) => {
        onSubmit(values as SpokeLength)
        onOpenChange(false)
        toast.success(isEdit ? t('engineering.spokeLength.toasts.updateSuccess') : t('engineering.spokeLength.toasts.saveSuccess'))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-2xl rounded-[32px] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[92vh] md:max-h-[85vh]'>
                <div className='absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent pointer-events-none' />
                
                <DialogHeader className='p-6 md:p-8 pb-0 shrink-0 relative'>
                    <DialogTitle className='text-base md:text-lg font-black italic uppercase tracking-tight'>
                        {isEdit ? t('engineering.spokeLength.dialog.editTitle') : t('engineering.spokeLength.dialog.createTitle')}
                    </DialogTitle>
                    <DialogDescription className='text-[9px] md:text-[10px] font-medium uppercase tracking-widest opacity-60'>
                        {t('engineering.spokeLength.dialog.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className='flex-1 overflow-y-auto px-6 md:px-8 py-4 custom-scrollbar relative'>
                    <Form {...form}>
                        <form id='spoke-length-form' onSubmit={form.handleSubmit(handleFormSubmit)} className='space-y-6'>
                            <FormField
                                control={form.control}
                                name='name'
                                render={({ field }) => (
                                    <FormItem className='space-y-2'>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('engineering.spokeLength.form.name')}</FormLabel>
                                        <FormControl><Input placeholder={t('engineering.spokeLength.placeholders.name')} className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner' {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <FormField
                                    control={form.control}
                                    name='productId'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('engineering.spokeLength.form.product')}</FormLabel>
                                            <SelectDropdown
                                                defaultValue={field.value}
                                                onValueChange={field.onChange}
                                                items={products.map(p => ({ label: `${p.sku} | ${p.name}`, value: p.id }))}
                                                placeholder={t('engineering.spokeLength.placeholders.product')}
                                                className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner'
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='length'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('engineering.spokeLength.form.length')}</FormLabel>
                                            <FormControl><Input placeholder={t('engineering.spokeLength.placeholders.length')} className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner' {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* 主数据联动选择 */}
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/5 p-6 rounded-[28px] border border-dashed border-muted-foreground/10'>
                                <FormField
                                    control={form.control}
                                    name='hubId'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-indigo-600/60 ml-1'>{t('engineering.spokeLength.form.hub')}</FormLabel>
                                            <SelectDropdown
                                                defaultValue={field.value}
                                                onValueChange={field.onChange}
                                                items={hubs.map(h => ({ label: `${h.brand} ${h.name}`, value: h.id }))}
                                                placeholder={t('engineering.spokeLength.placeholders.hub')}
                                                className='h-12 rounded-2xl border-none bg-background px-4 font-bold text-sm shadow-sm'
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='nippleId'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-orange-600/60 ml-1'>{t('engineering.spokeLength.form.nipple')}</FormLabel>
                                            <SelectDropdown
                                                defaultValue={field.value}
                                                onValueChange={field.onChange}
                                                items={nipples.map(n => ({ label: `${n.brand} ${n.name}`, value: n.id }))}
                                                placeholder={t('engineering.spokeLength.placeholders.nipple')}
                                                className='h-12 rounded-2xl border-none bg-background px-4 font-bold text-sm shadow-sm'
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name='material'
                                render={({ field }) => (
                                    <FormItem className='space-y-2'>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('engineering.spokeLength.form.material')}</FormLabel>
                                        <FormControl><Input placeholder={t('engineering.spokeLength.placeholders.material')} className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner' {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <div className='bg-indigo-500/5 p-6 rounded-[24px] border border-dashed border-indigo-500/20'>
                                <FormField
                                    control={form.control}
                                    name='fileUrl'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[9px] font-black uppercase tracking-widest text-indigo-600/60'>{t('engineering.spokeLength.form.attachment')}</FormLabel>
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

                <DialogFooter className='p-6 md:p-8 pt-4 border-t border-dashed border-muted-foreground/10 bg-muted/5'>
                    <Button variant='ghost' onClick={() => onOpenChange(false)} className='rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest opacity-60'>{t('engineering.changeOrders.actions.cancel')}</Button>
                    <Button type='submit' form='spoke-length-form' className='rounded-full h-11 px-12 font-black text-[10px] uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20'>{t('engineering.spokeLength.form.submit')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
