'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Upload } from 'lucide-react'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { labelingDraftSchema, type LabelingDraft } from '../data/schema'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { FileUploadZone } from './file-upload-zone'

interface LabelingActionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentRow?: LabelingDraft
    onSubmit: (data: LabelingDraft) => void
}

export function LabelingActionDialog({
    open,
    onOpenChange,
    currentRow,
    onSubmit,
}: LabelingActionDialogProps) {
    const { t } = useLanguage()
    const { data: products = [] } = useGetProducts()
    
    const form = useForm<LabelingDraft>({
        resolver: zodResolver(labelingDraftSchema),
        defaultValues: {
            id: '',
            name: '',
            type: 'Water',
            productId: '',
            fileUrl: '',
            fileExtension: '',
            createdAt: new Date().toISOString(),
        },
    })

    useEffect(() => {
        if (open) {
            if (currentRow) {
                form.reset(currentRow)
            } else {
                form.reset({
                    id: Math.random().toString(36).substring(2, 9),
                    name: '',
                    type: 'Water',
                    productId: '',
                    fileUrl: '',
                    fileExtension: '',
                    createdAt: new Date().toISOString(),
                })
            }
        }
    }, [currentRow, form, open])

    const handleFormSubmit = (data: LabelingDraft) => {
        if (!data.fileUrl) {
            toast.error(t('engineering.specs.toasts.noAttachment'))
            return
        }
        onSubmit(data)
        onOpenChange(false)
        toast.success(currentRow ? t('engineering.labeling.toasts.updateSuccess') : t('engineering.labeling.toasts.saveSuccess'))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-xl rounded-[32px] border-none shadow-2xl p-0 overflow-hidden bg-card flex flex-col max-h-[92vh] md:max-h-[85vh]'>
                <div className='absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent pointer-events-none' />
                
                {/* Fixed Header */}
                <DialogHeader className='p-6 md:p-8 pb-0 shrink-0 relative'>
                    <div className='flex items-center gap-2'>
                        <div className='size-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 shrink-0'>
                            <Upload className='size-4' />
                        </div>
                        <DialogTitle className='text-base md:text-lg font-black italic uppercase tracking-tight'>
                            {currentRow ? t('engineering.labeling.dialog.editTitle') : t('engineering.labeling.dialog.createTitle')}
                        </DialogTitle>
                    </div>
                    <DialogDescription className='text-[9px] md:text-[10px] font-medium uppercase tracking-widest opacity-60 ml-10'>
                        {t('engineering.labeling.dialog.description')}
                    </DialogDescription>
                </DialogHeader>

                {/* Scrollable Form Content */}
                <div className='flex-1 overflow-y-auto px-6 md:px-8 py-4 custom-scrollbar relative'>
                    <Form {...form}>
                        <form id='labeling-form' onSubmit={form.handleSubmit(handleFormSubmit)} className='space-y-6'>
                            <div className='bg-teal-500/5 p-4 md:p-6 rounded-[24px] border border-dashed border-teal-500/20 shadow-inner'>
                                <FileUploadZone 
                                    fileUrl={form.watch('fileUrl')}
                                    fileName={form.watch('name')}
                                    fileExtension={form.watch('fileExtension')}
                                    onFileSelected={(name, ext, url) => {
                                        form.setValue('name', name)
                                        form.setValue('fileExtension', ext)
                                        form.setValue('fileUrl', url)
                                    }}
                                    onFileClear={() => {
                                        form.setValue('fileUrl', '')
                                        form.setValue('name', '')
                                        form.setValue('fileExtension', '')
                                    }}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name='name'
                                render={({ field }) => (
                                    <FormItem className='space-y-2'>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                            {t('engineering.labeling.form.name')}
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder={t('engineering.labeling.placeholders.name')} 
                                                {...field} 
                                                className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm focus-visible:ring-1 focus-visible:ring-teal-500/20 shadow-inner' 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <FormField
                                    control={form.control}
                                    name='type'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                                {t('engineering.labeling.form.category')}
                                            </FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner'>
                                                        <SelectValue placeholder={t('engineering.labeling.placeholders.category')} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className='rounded-[24px] border-none shadow-2xl bg-card p-2'>
                                                    <SelectItem value='Water' className='font-bold rounded-xl'>{t('engineering.labeling.types.water')}</SelectItem>
                                                    <SelectItem value='Paint' className='font-bold rounded-xl'>{t('engineering.labeling.types.paint')}</SelectItem>
                                                    <SelectItem value='Laser' className='font-bold rounded-xl'>{t('engineering.labeling.types.laser')}</SelectItem>
                                                    <SelectItem value='Other' className='font-bold rounded-xl'>{t('engineering.labeling.types.other')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name='productId'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2 pb-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                                {t('engineering.labeling.form.product')}
                                            </FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || 'none'}>
                                                <FormControl>
                                                    <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner'>
                                                        <SelectValue placeholder={t('engineering.labeling.placeholders.product')} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className='rounded-[24px] border-none shadow-2xl bg-card p-2'>
                                                    <SelectItem value='none' className='italic opacity-60 font-bold rounded-xl'>-- {t('engineering.labeling.table.generic')} --</SelectItem>
                                                    {products.map(p => (
                                                        <SelectItem key={p.id} value={p.id} className='font-bold rounded-xl'>{p.sku} | {p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
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
                        type='button' 
                        variant='ghost' 
                        onClick={() => onOpenChange(false)} 
                        className='flex-1 md:flex-none rounded-full h-11 px-6 md:px-8 font-black text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 transition-all'
                    >
                        {t('engineering.changeOrders.actions.cancel')}
                    </Button>
                    <Button 
                        form='labeling-form'
                        type='submit' 
                        className='flex-2 md:flex-none rounded-full h-11 px-10 md:px-12 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-teal-500/20 bg-teal-600 hover:bg-teal-700 text-white'
                    >
                        {t('engineering.labeling.form.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
