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
    parentNode?: OrgNode
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit?: (data: Partial<OrgNode> & OrgForm & { id?: string; parentId?: string }, isPatch?: boolean, delta?: DeltaSet) => void
}

function inferOrgTypeFromParent(parentNode?: OrgNode): OrgForm['type'] {
    if (!parentNode) return 'company'
    if (parentNode.type === 'company') return 'department'
    return 'team'
}

function getOrgTypeLabel(type: OrgForm['type'], locale: string) {
    if (locale !== 'zh-CN') {
        if (type === 'company') return 'Level 1 / Company or HQ'
        if (type === 'department') return 'Level 2 / Department'
        return 'Level 3 / Production Unit'
    }

    if (type === 'company') return '一级单位 / 分公司 / 总部'
    if (type === 'department') return '二级部门'
    return '三级生产单元'
}

function getOrgTypeHint(
    isEdit: boolean,
    currentRow: OrgNode | undefined,
    parentNode: OrgNode | undefined,
    locale: string
) {
    if (locale !== 'zh-CN') {
        if (isEdit) {
            return currentRow?.parentId
                ? 'This node level is locked and cannot be changed to another hierarchy type directly.'
                : 'The top-level organization type is locked and cannot be changed directly.'
        }

        if (!parentNode) {
            return 'No parent selected. A new level-1 organization will be created.'
        }

        if (parentNode.type === 'company') {
            return `The selected parent "${parentNode.name}" is level 1, so the new child will be created as a level-2 department.`
        }

        return `The selected parent "${parentNode.name}" is level 2, so the new child will be created as a level-3 production unit.`
    }

    if (isEdit) {
        return currentRow?.parentId
            ? '当前节点层级已锁定，不能直接改成其他层级类型。'
            : '一级单位层级已锁定，不能直接改成其他层级类型。'
    }

    if (!parentNode) {
        return '未选择父级节点时，将创建一级单位。'
    }

    if (parentNode.type === 'company') {
        return `当前选中的是一级单位“${parentNode.name}”，新建子项会自动识别为二级部门。`
    }

    return `当前选中的是二级部门“${parentNode.name}”，新建子项会自动识别为三级生产单元。`
}

function getOrgFormDefaults(currentRow?: OrgNode, parentNode?: OrgNode): OrgForm {
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
        type: inferOrgTypeFromParent(parentNode),
        description: '',
    }
}

type OrgActionDialogFormProps = {
    currentRow?: OrgNode
    parentNode?: OrgNode
    isEdit: boolean
    open: boolean
    onSubmit?: (data: Partial<OrgNode> & OrgForm & { id?: string; parentId?: string }, isPatch?: boolean, delta?: DeltaSet) => void
    onOpenChange: (open: boolean) => void
    t: ReturnType<typeof useLanguage>['t']
    locale: string
}

function OrgActionDialogForm({
    currentRow,
    parentNode,
    isEdit,
    open,
    onSubmit,
    onOpenChange,
    t,
    locale,
}: OrgActionDialogFormProps) {
    const formSchema = z.object({
        name: z.string().min(1, t('orgPersonnel.org.dialog.nameRequired')),
        manager: z.string().optional(),
        type: z.enum(['company', 'department', 'team']),
        description: z.string().optional(),
    })

    const initialValues = useMemo(() => getOrgFormDefaults(currentRow, parentNode), [currentRow, parentNode])
    const { data: deltaProxy, tracker } = useDeltaTracker(initialValues, open)
    const typeHint = getOrgTypeHint(isEdit, currentRow, parentNode, locale)

    const form = useForm<OrgForm>({
        resolver: zodResolver(formSchema),
        defaultValues: initialValues,
    })

    function handleFormSubmit(values: OrgForm) {
        Object.assign(deltaProxy, values)
        const delta = tracker.commit()
        const isDirty = Object.keys(delta).length > 0

        if (isEdit && !isDirty) {
            onOpenChange(false)
            return
        }

        const nodeData = {
            ...(isEdit && currentRow ? { id: currentRow.id } : {}),
            parentId: isEdit && currentRow ? currentRow.parentId : parentNode?.id,
            ...values,
        }

        onSubmit?.(nodeData, isEdit, isEdit ? delta : undefined)
        form.reset(getOrgFormDefaults(currentRow, parentNode))
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
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder={locale === 'zh-CN' ? '自动识别层级类型' : 'Auto-detected hierarchy type'}
                                    items={[
                                        { label: getOrgTypeLabel(field.value, locale), value: field.value },
                                    ]}
                                    disabled
                                    isControlled
                                />
                            </div>
                            <p className='col-span-4 col-start-3 text-[10px] leading-relaxed text-muted-foreground'>
                                {typeHint}
                            </p>
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
    parentNode,
    open,
    onOpenChange,
    onSubmit,
}: OrgActionDialogProps) {
    const { locale, t } = useLanguage()
    const isEdit = !!currentRow
    const formKey = `${currentRow?.id ?? 'create'}:${parentNode?.id ?? 'root'}`
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
                    parentNode={parentNode}
                    isEdit={isEdit}
                    open={open}
                    onSubmit={onSubmit}
                    onOpenChange={onOpenChange}
                    t={t}
                    locale={locale}
                />
            ) : null}
        </ActionDialogShell>
    )
}
