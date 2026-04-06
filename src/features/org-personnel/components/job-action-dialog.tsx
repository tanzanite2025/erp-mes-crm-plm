'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import type { TranslationKey } from '@/locales'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { jobTypeSchema, type JobType } from '../data/schema'

type JobTypeForm = JobType

const jobDialogKeys = {
    successEdit: 'orgPersonnel.org.jobDialog.successEdit',
    successCreate: 'orgPersonnel.org.jobDialog.successCreate',
    editTitle: 'orgPersonnel.org.jobDialog.editTitle',
    createTitle: 'orgPersonnel.org.jobDialog.createTitle',
    desc: 'orgPersonnel.org.jobDialog.desc',
    submit: 'orgPersonnel.org.jobDialog.submit',
    nameLabel: 'orgPersonnel.org.jobDialog.nameLabel',
    namePlaceholder: 'orgPersonnel.org.jobDialog.namePlaceholder',
    codeLabel: 'orgPersonnel.org.jobDialog.codeLabel',
    codePlaceholder: 'orgPersonnel.org.jobDialog.codePlaceholder',
    descLabel: 'orgPersonnel.org.jobDialog.descLabel',
    descPlaceholder: 'orgPersonnel.org.jobDialog.descPlaceholder',
} as const satisfies Record<string, TranslationKey>

type JobActionDialogProps = {
    currentRow?: JobType
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit?: (data: JobType) => void
}

function getJobFormDefaults(currentRow?: JobType): JobTypeForm {
    if (currentRow) {
        return currentRow
    }

    return {
        id: `JOB-${Math.floor(Math.random() * 9000) + 1000}`,
        name: '',
        code: '',
        description: '',
    }
}

type JobActionDialogFormProps = {
    currentRow?: JobType
    isEdit: boolean
    onSubmit?: (data: JobType) => void
    onOpenChange: (open: boolean) => void
    t: ReturnType<typeof useLanguage>['t']
}

function JobActionDialogForm({
    currentRow,
    isEdit,
    onSubmit,
    onOpenChange,
    t,
}: JobActionDialogFormProps) {
    const form = useForm<JobTypeForm>({
        resolver: zodResolver(jobTypeSchema),
        defaultValues: getJobFormDefaults(currentRow),
    })

    function handleFormSubmit(values: JobTypeForm) {
        toast.success(isEdit ? t(jobDialogKeys.successEdit) : t(jobDialogKeys.successCreate))
        if (onSubmit) {
            onSubmit(values)
        }
        onOpenChange(false)
    }

    return (
        <Form {...form}>
            <form
                id='job-form'
                onSubmit={form.handleSubmit(handleFormSubmit)}
                className='space-y-4'
            >
                <FormField
                    control={form.control}
                    name='name'
                    render={({ field }) => (
                        <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 mx-8'>
                            <FormLabel className='col-span-2 text-end text-[10px] font-black uppercase tracking-widest opacity-60'>{t(jobDialogKeys.nameLabel)}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t(jobDialogKeys.namePlaceholder)}
                                    className='col-span-4 h-11 rounded-2xl bg-muted/50 border-none px-4 font-bold text-xs'
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className='col-span-4 col-start-3' />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name='code'
                    render={({ field }) => (
                        <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 mx-8'>
                            <FormLabel className='col-span-2 text-end text-[10px] font-black uppercase tracking-widest opacity-60'>{t(jobDialogKeys.codeLabel)}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t(jobDialogKeys.codePlaceholder)}
                                    className='col-span-4 h-11 rounded-2xl bg-muted/50 border-none px-4 font-bold text-xs'
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className='col-span-4 col-start-3' />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name='description'
                    render={({ field }) => (
                        <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1 mx-8'>
                            <FormLabel className='col-span-2 text-end mt-2 text-[10px] font-black uppercase tracking-widest opacity-60'>{t(jobDialogKeys.descLabel)}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t(jobDialogKeys.descPlaceholder)}
                                    className='col-span-4 h-11 rounded-2xl bg-muted/50 border-none px-4 font-bold text-xs'
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className='col-span-4 col-start-3' />
                        </FormItem>
                    )}
                />
            </form>
        </Form>
    )
}

export function JobActionDialog({
    currentRow,
    open,
    onOpenChange,
    onSubmit,
}: JobActionDialogProps) {
    const { t } = useLanguage()
    const isEdit = !!currentRow
    const formKey = currentRow?.id ?? 'create'
    const shellClasses = buildActionDialogShellClasses({
        content: 'sm:max-w-lg rounded-[32px] border-none shadow-2xl overflow-hidden p-0 bg-background',
        header: 'text-start p-8 bg-muted/10 border-b border-dashed border-muted/50',
        title: 'text-lg font-black tracking-tighter italic uppercase',
        description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
        body: undefined,
        footer: 'p-6 bg-muted/5 border-t border-dashed border-muted/50',
    })

    return (
        <ActionDialogShell
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? t(jobDialogKeys.editTitle) : t(jobDialogKeys.createTitle)}
            description={t(jobDialogKeys.desc)}
            contentClassName={shellClasses.content}
            headerClassName={shellClasses.header}
            bodyClassName={shellClasses.body}
            footerClassName={shellClasses.footer}
            titleClassName={shellClasses.title}
            descriptionClassName={shellClasses.description}
            footer={(
                <Button type='submit' form='job-form' className='rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20'>
                    {t(jobDialogKeys.submit)}
                </Button>
            )}
        >
            {open ? (
                <JobActionDialogForm
                    key={formKey}
                    currentRow={currentRow}
                    isEdit={isEdit}
                    onSubmit={onSubmit}
                    onOpenChange={onOpenChange}
                    t={t}
                />
            ) : null}
        </ActionDialogShell>
    )
}
