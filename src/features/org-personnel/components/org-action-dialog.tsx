import { useEffect, useMemo, type ReactNode } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type DeltaSet } from '@/lib/delta/types'
import { getServerErrorPresentation } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { SelectDropdown } from '@/components/select-dropdown'
import { type OrgNode } from '../data/org-schema'

type OrgForm = {
  name: string
  manager?: string
  type: 'company' | 'department' | 'team'
  description?: string
  version: number
}

type OrgActionDialogProps = {
  currentRow?: OrgNode
  parentNode?: OrgNode
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (organization: OrgNode) => void
  isSaving?: boolean
  creationParentSelector?: ReactNode
  onSubmit?: (
    data: Partial<OrgNode> & OrgForm & { id?: string; parentId?: string },
    isPatch?: boolean,
    delta?: DeltaSet
  ) => void | Promise<OrgNode | void>
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

function getOrgFormDefaults(
  currentRow?: OrgNode,
  parentNode?: OrgNode
): OrgForm {
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
    version: 1,
  }
}

type OrgActionDialogFormProps = {
  currentRow?: OrgNode
  parentNode?: OrgNode
  isEdit: boolean
  open: boolean
  onSubmit?: OrgActionDialogProps['onSubmit']
  onSaved?: OrgActionDialogProps['onSaved']
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
  onSaved,
  onOpenChange,
  t,
  locale,
}: OrgActionDialogFormProps) {
  const formSchema = z.object({
    name: z.string().min(1, t('orgPersonnel.org.dialog.nameRequired')),
    manager: z.string().optional(),
    type: z.enum(['company', 'department', 'team']),
    description: z.string().optional(),
    version: z.number().default(1),
  })
  type OrgFormInput = z.input<typeof formSchema>
  type OrgFormOutput = z.output<typeof formSchema>

  const initialValues = useMemo(
    () => getOrgFormDefaults(currentRow, parentNode),
    [currentRow, parentNode]
  )
  const { data: deltaProxy, tracker } = useDeltaTracker(initialValues, open)
  const typeHint = getOrgTypeHint(isEdit, currentRow, parentNode, locale)

  const form = useForm<OrgFormInput, unknown, OrgFormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (!isEdit) form.setValue('type', inferOrgTypeFromParent(parentNode))
  }, [form, isEdit, parentNode])

  async function submitOrganizationFormAndCloseOnlyAfterSuccess(
    values: OrgFormOutput
  ) {
    Object.assign(deltaProxy, values)
    const delta = tracker.commit()
    const isDirty = Object.keys(delta).length > 0

    if (isEdit && !isDirty) {
      onOpenChange(false)
      return
    }

    const nodeData: OrgNode = {
      ...(isEdit && currentRow ? { id: currentRow.id } : {}),
      parentId: isEdit && currentRow ? currentRow.parentId : parentNode?.id,
      ...values,
    }

    try {
      const savedOrganization = await onSubmit?.(
        nodeData,
        isEdit,
        isEdit ? delta : undefined
      )
      if (onSaved) {
        if (!savedOrganization) return
        onSaved(savedOrganization)
      }
    } catch (error) {
      form.setError('root', {
        message: getServerErrorPresentation(error).message,
      })
      return
    }
    form.reset(getOrgFormDefaults(currentRow, parentNode))
    onOpenChange(false)
  }

  return (
    <Form {...form}>
      <form
        id='org-form'
        onSubmit={form.handleSubmit(
          submitOrganizationFormAndCloseOnlyAfterSuccess
        )}
        className='space-y-4'
      >
        {form.formState.errors.root?.message && (
          <p role='alert' className='text-sm text-destructive'>
            {form.formState.errors.root.message}
          </p>
        )}
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 py-1'>
              <FormLabel className='col-span-2 text-end text-[10px] font-black tracking-widest uppercase opacity-60'>
                {t('orgPersonnel.org.dialog.nameLabel')}
              </FormLabel>
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
              <FormLabel className='col-span-2 text-end text-[10px] font-black tracking-widest uppercase opacity-60'>
                {t('orgPersonnel.org.dialog.typeLabel')}
              </FormLabel>
              <div className='col-span-4'>
                <SelectDropdown
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={
                    locale === 'zh-CN'
                      ? '自动识别层级类型'
                      : 'Auto-detected hierarchy type'
                  }
                  items={(['company', 'department', 'team'] as const).map(
                    (organizationType) => ({
                      label: getOrgTypeLabel(organizationType, locale),
                      value: organizationType,
                    })
                  )}
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
              <FormLabel className='col-span-2 text-end text-[10px] font-black tracking-widest uppercase opacity-60'>
                {t('orgPersonnel.org.dialog.managerLabel')}
              </FormLabel>
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
              <FormLabel className='col-span-2 mt-2 text-end text-[10px] font-black tracking-widest uppercase opacity-60'>
                {t('orgPersonnel.org.dialog.descLabel')}
              </FormLabel>
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
  onSaved,
  isSaving = false,
  creationParentSelector,
}: OrgActionDialogProps) {
  const { locale, t } = useLanguage()
  const isEdit = !!currentRow
  const formKey = currentRow?.id ?? 'create'
  const shellClasses = buildActionDialogShellClasses({
    content: 'flex flex-col gap-0 sm:max-w-lg',
    header: 'text-start',
    body: 'min-h-0 flex-1 overflow-y-auto',
    footer: 'shrink-0',
    title: 'text-lg font-black tracking-tighter uppercase',
    description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
  })

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSaving) onOpenChange(nextOpen)
      }}
      title={
        isEdit
          ? t('orgPersonnel.org.dialog.editTitle')
          : parentNode
            ? t('orgPersonnel.org.dialog.createTitle')
            : t('orgPersonnel.operationGuide.actions.createOrganization')
      }
      description={
        isEdit
          ? t('orgPersonnel.org.dialog.editDesc')
          : t('orgPersonnel.org.dialog.createDesc')
      }
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={
        <Button
          disabled={isSaving}
          type='submit'
          form='org-form'
          className='h-11 rounded-full px-8 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-primary/10'
        >
          {t('orgPersonnel.org.dialog.submit')}
        </Button>
      }
    >
      {creationParentSelector}
      {open ? (
        <OrgActionDialogForm
          key={formKey}
          currentRow={currentRow}
          parentNode={parentNode}
          isEdit={isEdit}
          open={open}
          onSubmit={onSubmit}
          onSaved={onSaved}
          onOpenChange={onOpenChange}
          t={t}
          locale={locale}
        />
      ) : null}
    </ActionDialogShell>
  )
}
