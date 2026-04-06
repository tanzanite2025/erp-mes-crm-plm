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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { technicalSpecSchema, type TechnicalSpec } from '../data/schema'
import { useLanguage } from '@/context/language-provider'

type SpecForm = z.infer<typeof technicalSpecSchema>

interface SpecActionDialogProps {
    currentRow?: TechnicalSpec
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: TechnicalSpec) => void
}

export function SpecActionDialog({
    currentRow,
    open,
    onOpenChange,
    onSubmit,
}: SpecActionDialogProps) {
    const { t } = useLanguage()
    const isEdit = !!currentRow

    const form = useForm<SpecForm>({
        resolver: zodResolver(technicalSpecSchema) as any,
        defaultValues: {
            id: '',
            name: '',
            category: 'SOP',
            version: 'V1.0',
            fileUrl: '',
            fileExtension: 'pdf',
            description: '',
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
                    category: 'SOP',
                    version: 'V1.0',
                    fileUrl: '',
                    fileExtension: 'pdf',
                    description: '',
                    createdAt: new Date().toISOString(),
                })
            }
        }
    }, [currentRow, open, isEdit, form])

    const handleFormSubmit = (values: SpecForm) => {
        onSubmit(values as TechnicalSpec)
        onOpenChange(false)
        toast.success(isEdit ? t('engineering.specs.toasts.updateSuccess') : t('engineering.specs.toasts.saveSuccess'))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-2xl rounded-[32px] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[92vh] md:max-h-[85vh]'>
                <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
                
                {/* Fixed Header */}
                <DialogHeader className='p-6 md:p-8 pb-0 shrink-0 relative'>
                    <DialogTitle className='text-base md:text-lg font-black italic uppercase tracking-tight'>
                        {isEdit ? t('engineering.specs.dialog.editTitle') : t('engineering.specs.dialog.createTitle')}
                    </DialogTitle>
                    <DialogDescription className='text-[9px] md:text-[10px] font-medium uppercase tracking-widest opacity-60'>
                        {t('engineering.specs.dialog.description')}
                    </DialogDescription>
                </DialogHeader>

                {/* Scrollable Form Content */}
                <div className='flex-1 overflow-y-auto px-6 md:px-8 py-4 custom-scrollbar relative'>
                    <Form {...form}>
                        <form
                            id='spec-form'
                            onSubmit={form.handleSubmit(handleFormSubmit)}
                            className='space-y-6'
                        >
                            <FormField
                                control={form.control}
                                name='name'
                                render={({ field }) => (
                                    <FormItem className='space-y-2'>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                            {t('engineering.specs.form.name')}
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder={t('engineering.specs.placeholders.name')} 
                                                className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm focus-visible:ring-1 focus-visible:ring-primary/20 shadow-inner'
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <FormField
                                    control={form.control}
                                    name='category'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                                {t('engineering.specs.form.category')}
                                            </FormLabel>
                                            <SelectDropdown
                                                defaultValue={field.value}
                                                onValueChange={field.onChange}
                                                items={[
                                                    { label: t('engineering.db.categories.sop'), value: 'SOP' },
                                                    { label: t('engineering.db.categories.spec'), value: 'Standard' },
                                                    { label: t('engineering.db.categories.quality'), value: 'Quality' },
                                                ]}
                                                className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm shadow-inner'
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='version'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                                {t('engineering.specs.form.revision')}
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder='V1.0' 
                                                    className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-bold text-sm focus-visible:ring-1 focus-visible:ring-primary/20 shadow-inner uppercase'
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className='bg-muted/5 p-5 md:p-6 rounded-[24px] border border-dashed border-muted-foreground/10 space-y-3 relative overflow-hidden'>
                                <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
                                <FormField
                                    control={form.control}
                                    name='fileUrl'
                                    render={({ field }) => (
                                        <FormItem className='space-y-2'>
                                            <FormLabel className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
                                                {t('engineering.specs.form.attachment')}
                                            </FormLabel>
                                            <FormControl>
                                                <FileUploader 
                                                    value={field.value} 
                                                    onChange={(url, ext) => {
                                                        field.onChange(url)
                                                        if (ext) {
                                                            const supported = ['pdf', 'xlsx', 'docx', 'csv']
                                                            if (supported.includes(ext)) {
                                                                 form.setValue('fileExtension', ext)
                                                            }
                                                        }
                                                    }}
                                                    placeholder={t('engineering.specs.placeholders.upload')}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name='description'
                                render={({ field }) => (
                                    <FormItem className='space-y-2 pb-2'>
                                        <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                            {t('engineering.specs.form.description')}
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder={t('engineering.specs.placeholders.description')} 
                                                className='min-h-[100px] md:min-h-[120px] resize-none rounded-[24px] border-none bg-muted/50 p-4 font-bold text-sm shadow-inner' 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </div>

                {/* Fixed Footer */}
                <DialogFooter className='p-6 md:p-8 pt-4 shrink-0 flex flex-row gap-3 border-t border-dashed border-muted-foreground/10 bg-muted/5 relative'>
                    <Button 
                        variant='ghost' 
                        onClick={() => onOpenChange(false)} 
                        className='flex-1 md:flex-none rounded-full h-11 px-6 md:px-8 font-black text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100'
                    >
                        {t('common.actions.cancel')}
                    </Button>
                    <Button 
                        type='submit' 
                        form='spec-form' 
                        className='flex-2 md:flex-none rounded-full h-11 px-10 md:px-12 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 bg-primary hover:bg-primary/95 text-primary-foreground'
                    >
                        {t('engineering.specs.form.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
