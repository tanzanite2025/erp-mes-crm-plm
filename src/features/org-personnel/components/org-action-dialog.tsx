import { useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
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
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { type DeltaSet } from '@/lib/delta/types'
import { type OrgNode } from '../data/org-schema'

type OrgForm = {
    name: string
    manager?: string
    type: 'company' | 'department' | 'team'
    description?: string
    version?: number
}

type OrgActionDialogProps = {
    currentRow?: OrgNode
    parentId?: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit?: (data: Partial<OrgNode> & OrgForm & { id?: string; parentId?: string }, isPatch?: boolean, delta?: DeltaSet) => void
}

function getOrgFormDefaults(currentRow?: OrgNode, parentId?: string): OrgForm {
    if (currentRow) {
        return {
            name: currentRow.name,
            manager: currentRow.manager || '',
            type: currentRow.type as OrgForm['type'],
            description: currentRow.description || '',
            version: currentRow.version || 1,
        }
    }

    return {
        name: '',
        manager: '',
        type: parentId ? 'department' : 'company',
        description: '',
    }
}

type OrgActionDialogFormProps = {
    currentRow?: OrgNode
    parentId?: string
    isEdit: boolean
    open: boolean
    onSubmit?: (data: Partial<OrgNode> & OrgForm & { id?: string; parentId?: string }, isPatch?: boolean, delta?: DeltaSet) => void
    onOpenChange: (open: boolean) => void
    t: ReturnType<typeof useLanguage>['t']
}

function OrgActionDialogForm({
    currentRow,
    parentId,
    isEdit,
    open,
    onSubmit,
    onOpenChange,
    t,
}: OrgActionDialogFormProps) {
    const formSchema = z.object({
        name: z.string().min(1, t('orgPersonnel.org.dialog.nameRequired')),
        manager: z.string().optional(),
        type: z.enum(['company', 'department', 'team']),
        description: z.string().optional(),
    })

    const initialValues = useMemo(() => getOrgFormDefaults(currentRow, parentId), [currentRow, parentId])
    const { data: deltaProxy, tracker } = useDeltaTracker(initialValues, open)

    const form = useForm<OrgForm>({
        resolver: zodResolver(formSchema),
        defaultValues: initialValues,
    })

    function handleFormSubmit(values: OrgForm) {
        // SDRTS: 同步 RHF 数据到 Proxy 用于增量追踪
        Object.assign(deltaProxy, values)
        const delta = tracker.commit()
        const isDirty = Object.keys(delta).length > 0

        if (isEdit && !isDirty) {
            onOpenChange(false)
            return
        }

        const nodeData = {
            ...(isEdit && currentRow ? { id: currentRow.id } : {}),
            parentId: isEdit && currentRow ? currentRow.parentId : parentId,
            ...values,
        }

        if (onSubmit) {
            onSubmit(nodeData, isEdit, isEdit ? delta : undefined)
        }

        form.reset(getOrgFormDefaults(currentRow, parentId))
        onOpenChange(false)
    }

    return (
        <Form {...form}>
            <form
                id='org-form'
                onSubmit={form.handleSubmit(handleFormSubmit)}
                className='space-y-4'
            >
                <FormField
                    control={form.control}
                    name='name'
                    render={({ field }) => (
                        <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 py-1'>
                            <FormLabel className='col-span-2 text-end text-[10px] font-black uppercase tracking-widest opacity-60'>{t('orgPersonnel.org.dialog.nameLabel')}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('orgPersonnel.org.dialog.namePlaceholder')}
                                    className='col-span-4 h-11 rounded-2xl border-none bg-muted/50'
                                    autoComplete='off'
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className='col-span-4 col-start-3 text-[10px] font-bold' />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name='type'
                    render={({ field }) => (
                        <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 py-1'>
                            <FormLabel className='col-span-2 text-end text-[10px] font-black uppercase tracking-widest opacity-60'>{t('orgPersonnel.org.dialog.typeLabel')}</FormLabel>
                            <div className='col-span-4'>
                                <SelectDropdown
                                    defaultValue={field.value}
                                    onValueChange={field.onChange}
                                    placeholder={t('orgPersonnel.org.dialog.typePlaceholder')}
                                    items={[
                                        { label: t('orgPersonnel.org.dialog.types.company'), value: 'company' },
                                        { label: t('orgPersonnel.org.dialog.types.department'), value: 'department' },
                                        { label: t('orgPersonnel.org.dialog.types.team'), value: 'team' },
                                    ]}
                                />
                            </div>
                            <FormMessage className='col-span-4 col-start-3 text-[10px] font-bold' />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name='manager'
                    render={({ field }) => (
                        <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 py-1'>
                            <FormLabel className='col-span-2 text-end text-[10px] font-black uppercase tracking-widest opacity-60'>{t('orgPersonnel.org.dialog.managerLabel')}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('orgPersonnel.org.dialog.managerPlaceholder')}
                                    className='col-span-4 h-11 rounded-2xl border-none bg-muted/50'
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className='col-span-4 col-start-3 text-[10px] font-bold' />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name='description'
                    render={({ field }) => (
                        <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1 py-1'>
                            <FormLabel className='col-span-2 text-end mt-2 text-[10px] font-black uppercase tracking-widest opacity-60'>{t('orgPersonnel.org.dialog.descLabel')}</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={t('orgPersonnel.org.dialog.descPlaceholder')}
                                    className='col-span-4 h-11 rounded-2xl border-none bg-muted/50'
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage className='col-span-4 col-start-3 text-[10px] font-bold' />
                        </FormItem>
                    )}
                />
            </form>
        </Form>
    )
}

export function OrgActionDialog({
    currentRow,
    parentId,
    open,
    onOpenChange,
    onSubmit,
}: OrgActionDialogProps) {
    const { t } = useLanguage()
    const isEdit = !!currentRow
    const formKey = `${currentRow?.id ?? 'create'}:${parentId ?? 'root'}`
    const shellClasses = buildActionDialogShellClasses({
        content: 'sm:max-w-lg',
        header: 'text-start',
        title: 'text-lg font-black italic tracking-tighter uppercase',
        description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
    })

    return (
        <ActionDialogShell
            open={open}
            onOpenChange={onOpenChange}
            title={isEdit ? t('orgPersonnel.org.dialog.editTitle') : t('orgPersonnel.org.dialog.createTitle')}
            description={isEdit ? t('orgPersonnel.org.dialog.editDesc') : t('orgPersonnel.org.dialog.createDesc')}
            contentClassName={shellClasses.content}
            headerClassName={shellClasses.header}
            bodyClassName={shellClasses.body}
            footerClassName={shellClasses.footer}
            titleClassName={shellClasses.title}
            descriptionClassName={shellClasses.description}
            footer={(
                <Button type='submit' form='org-form' className='h-11 px-8 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/10'>
                    {t('orgPersonnel.org.dialog.submit')}
                </Button>
            )}
        >
            {open ? (
                <OrgActionDialogForm
                    key={formKey}
                    currentRow={currentRow}
                    parentId={parentId}
                    isEdit={isEdit}
                    open={open}
                    onSubmit={onSubmit}
                    onOpenChange={onOpenChange}
                    t={t}
                />
            ) : null}
        </ActionDialogShell>
    )
}
