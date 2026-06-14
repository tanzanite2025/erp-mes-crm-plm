'use client'

import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type TranslationKey } from '@/locales'
import { type DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
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
import { AuditStamp } from '@/components/common/audit-stamp'
import { buildHostedQuickActionDialogContentClassName } from '@/components/hosted-quick-action-dialog.styles'
import { SelectDropdown } from '@/components/select-dropdown'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import {
  PERSONNEL_FORM_FIELDS,
  type PersonnelFormFieldConfig,
  type PersonnelFormFieldKey,
  type PersonnelSelectOption,
} from '../config/personnel-archive-columns'
import { type Employee } from '../data/schema'
import { useOrgPersonnelLookups } from '../hooks/use-org-personnel-lookups'

const UNASSIGNED_POSITION_VALUE = '__UNASSIGNED_POSITION__'

type EmployeeForm = Record<PersonnelFormFieldKey, string> & {
  id?: string
  lineId: string
  processId: string
  positionId: string
  version?: number
}

type EmployeeActionDialogProps = {
  currentRow?: Employee
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (
    data: Employee,
    isPatch?: boolean,
    delta?: DeltaSet
  ) => Promise<Employee | void>
  onSaved?: (employee: Employee) => void
}

function buildDefaultValues(): EmployeeForm {
  const fieldDefaults = Object.fromEntries(
    PERSONNEL_FORM_FIELDS.map((field) => [field.key, field.defaultValue ?? ''])
  ) as Record<PersonnelFormFieldKey, string>

  return {
    ...fieldDefaults,
    id: '',
    lineId: 'none',
    processId: '',
    positionId: '',
  }
}

function buildFormValues(employee?: Employee): EmployeeForm {
  const defaults = buildDefaultValues()
  if (!employee) return defaults

  const values = { ...defaults, id: employee.id, version: employee.version }

  PERSONNEL_FORM_FIELDS.forEach((field) => {
    values[field.key] = field.formValueFromEmployee
      ? field.formValueFromEmployee(employee)
      : String(employee[field.key] ?? defaults[field.key] ?? '')
  })

  values.lineId = employee.lineId || defaults.lineId
  values.processId = employee.processId || defaults.processId
  values.positionId = employee.positionId || defaults.positionId

  return values
}

function resolveFieldOptions(
  field: PersonnelFormFieldConfig,
  dynamicDepts: PersonnelSelectOption[]
): PersonnelSelectOption[] {
  if (field.optionSource === 'department') {
    return dynamicDepts
  }
  return field.options ?? []
}

export function EmployeeActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSubmit,
  onSaved,
}: EmployeeActionDialogProps) {
  const { locale, t } = useLanguage()
  const isEdit = !!currentRow
  const getColumnLabel = (key: PersonnelFormFieldKey) =>
    t(`orgPersonnel.excel.columns.${key}` as TranslationKey)
  const getOptionLabel = (label: string) =>
    label.includes('.') ? t(label as TranslationKey) : label
  const deptFieldLabel = getColumnLabel('deptId')
  const deptFieldHint =
    locale === 'zh-CN'
      ? '这里的“部门”必须映射到组织管理中的二级部门，不能直接选择三级生产单元。'
      : 'This department field must map to a level-2 department from Organization Management, not a level-3 production unit.'
  const positionFieldLabel = locale === 'zh-CN' ? '岗位' : 'Position'
  const positionFieldHint =
    locale === 'zh-CN'
      ? '岗位来自统一岗位主数据；如需解绑，请选择“无岗位”。'
      : 'Positions come from the unified position directory. Choose "No position" to clear the current assignment.'
  const noPositionLabel = locale === 'zh-CN' ? '无岗位' : 'No position'
  const initialFormValues = useMemo(
    () => buildFormValues(currentRow),
    [currentRow]
  )
  const { data: deltaProxy, tracker } = useDeltaTracker(initialFormValues, open)
  const { departmentOptions, positions } = useOrgPersonnelLookups({
    enabled: open,
    includePositions: true,
  })

  const formSchema = z.object({
    id: z.string().optional(),
    staffId: z
      .string()
      .trim()
      .min(1, t('orgPersonnel.org.employeeDialog.errors.staffId')),
    name: z
      .string()
      .trim()
      .min(1, t('orgPersonnel.org.employeeDialog.errors.name')),
    deptId: z
      .string()
      .trim()
      .min(1, t('orgPersonnel.org.employeeDialog.errors.deptId')),
    phone: z.string(),
    emergencyPhone: z.string(),
    gender: z.string(),
    joinedDate: z.string(),
    status: z
      .string()
      .trim()
      .min(1, t('orgPersonnel.org.employeeDialog.errors.status')),
    age: z.string(),
    idCard: z.string(),
    birthday: z.string(),
    address: z.string(),
    bankCard: z.string(),
    bankName: z.string(),
    education: z.string(),
    lineId: z.string(),
    processId: z.string(),
    positionId: z.string(),
  })

  const defaultValues = useMemo(() => buildDefaultValues(), [])

  const form = useForm<EmployeeForm>({
    resolver: zodResolver(formSchema),
    defaultValues: initialFormValues,
  })

  const positionOptions = useMemo(
    () => [
      { label: noPositionLabel, value: UNASSIGNED_POSITION_VALUE },
      ...positions.map((position) => ({
        label: position.orgUnitName
          ? `${position.name} / ${position.orgUnitName}`
          : position.name,
        value: position.id,
      })),
    ],
    [noPositionLabel, positions]
  )

  useEffect(() => {
    if (!open) return
    form.reset(initialFormValues)
  }, [form, initialFormValues, open])

  const onSubmitHandler = async (values: EmployeeForm) => {
    Object.assign(deltaProxy, values)
    const delta = tracker.commit()
    const isDirty = Object.keys(delta).length > 0

    if (isEdit && !isDirty) {
      onOpenChange(false)
      return
    }

    if (isEdit && values.version === undefined) {
      throw new Error(
        `[CRITICAL] Missing version for SDRTS Patch operation on Employee ID: ${values.id || 'Unknown'}`
      )
    }

    const nextEmployee: Partial<Employee> = {
      id: values.id || '',
      lineId: values.lineId,
      processId: values.processId,
      positionId:
        values.positionId === UNASSIGNED_POSITION_VALUE
          ? undefined
          : values.positionId.trim() || undefined,
      version: values.version,
    }

    PERSONNEL_FORM_FIELDS.forEach((field) => {
      const rawValue = values[field.key]
      const normalizedValue = field.submitValueFromForm
        ? field.submitValueFromForm(rawValue)
        : rawValue

      ;(nextEmployee as Record<string, unknown>)[field.key] = normalizedValue
    })

    try {
      const savedEmployee = await onSubmit?.(
        nextEmployee as Employee,
        isEdit,
        isEdit ? delta : undefined
      )
      if (!savedEmployee) {
        return
      }

      onSaved?.(savedEmployee)
    } catch {
      return
    }

    form.reset(defaultValues)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!state) {
          form.reset(defaultValues)
        }
        onOpenChange(state)
      }}
    >
      <DialogContent
        className={buildHostedQuickActionDialogContentClassName(
          'flex flex-col gap-0 overflow-hidden rounded-[32px] border-none bg-background p-0 shadow-2xl md:max-w-3xl'
        )}
      >
        <DialogHeader className='shrink-0 border-b border-dashed border-muted/50 bg-muted/5 p-8 text-start'>
          <DialogTitle className='text-lg font-black tracking-tighter uppercase italic'>
            {isEdit
              ? t('orgPersonnel.org.employeeDialog.editTitle')
              : t('orgPersonnel.org.employeeDialog.createTitle')}
          </DialogTitle>
          <DialogDescription className='text-[9px] font-black tracking-widest uppercase opacity-60'>
            {isEdit
              ? t('orgPersonnel.org.employeeDialog.editDesc')
              : t('orgPersonnel.org.employeeDialog.createDesc')}
          </DialogDescription>
          {isEdit && currentRow && (
            <AuditStamp
              module={AUDIT_MODULES.employee}
              targetId={currentRow.id}
              createdBy={currentRow.createdBy}
              createdAt={currentRow.createdAt}
              updatedBy={currentRow.updatedBy}
              updatedAt={currentRow.updatedAt}
              className='mt-4 border-primary/10'
            />
          )}
        </DialogHeader>

        <Form {...form}>
          <form
            id='employee-form'
            onSubmit={form.handleSubmit(onSubmitHandler)}
            className='min-h-0 flex-1 space-y-6 overflow-y-auto p-8'
          >
            <div className='grid grid-cols-2 gap-x-8 gap-y-4'>
              {PERSONNEL_FORM_FIELDS.map((fieldConfig) => (
                <FormField
                  key={fieldConfig.key}
                  control={form.control}
                  name={fieldConfig.key}
                  render={({ field }) => (
                    <FormItem
                      className={`space-y-1 ${fieldConfig.span === 2 ? 'col-span-2' : ''}`}
                    >
                      <FormLabel className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                        {fieldConfig.key === 'deptId'
                          ? deptFieldLabel
                          : getColumnLabel(fieldConfig.key)}
                      </FormLabel>
                      {fieldConfig.input === 'select' ? (
                        <div className='pt-1'>
                          <SelectDropdown
                            isControlled
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder={
                              fieldConfig.key === 'deptId'
                                ? deptFieldLabel
                                : getColumnLabel(fieldConfig.key)
                            }
                            items={resolveFieldOptions(
                              fieldConfig,
                              departmentOptions
                            ).map((opt) => ({
                              ...opt,
                              label: getOptionLabel(opt.label),
                            }))}
                            className='h-11 rounded-2xl border-none bg-muted/50 text-xs font-bold shadow-inner'
                          />
                        </div>
                      ) : (
                        <FormControl>
                          <Input
                            type={fieldConfig.input}
                            placeholder={
                              fieldConfig.key === 'deptId'
                                ? deptFieldLabel
                                : getColumnLabel(fieldConfig.key)
                            }
                            className='h-11 rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner transition-all focus-visible:ring-primary/20'
                            {...field}
                          />
                        </FormControl>
                      )}
                      {fieldConfig.key === 'deptId' && (
                        <p className='text-[10px] leading-relaxed text-muted-foreground'>
                          {deptFieldHint}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <FormField
                control={form.control}
                name='positionId'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                      {positionFieldLabel}
                    </FormLabel>
                    <div className='pt-1'>
                      <SelectDropdown
                        isControlled
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={positionFieldLabel}
                        items={positionOptions}
                        className='h-11 rounded-2xl border-none bg-muted/50 text-xs font-bold shadow-inner'
                      />
                    </div>
                    <p className='text-[10px] leading-relaxed text-muted-foreground'>
                      {positionFieldHint}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter className='shrink-0 border-t border-dashed border-muted/50 bg-muted/5 p-6'>
          <Button
            type='submit'
            form='employee-form'
            className='h-11 rounded-full px-8 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all active:scale-95'
          >
            {t('orgPersonnel.org.employeeDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
