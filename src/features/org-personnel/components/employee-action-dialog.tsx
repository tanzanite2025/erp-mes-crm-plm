'use client'

import { useEffect, useMemo } from 'react'
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
import {
  buildHostedQuickActionDialogContentClassName,
  hostedQuickActionDialogScrollableBodyClassName,
} from '@/components/hosted-quick-action-dialog.styles'
import { SelectDropdown } from '@/components/select-dropdown'
import {
  PERSONNEL_FORM_FIELDS,
  type PersonnelFormFieldConfig,
  type PersonnelFormFieldKey,
  type PersonnelSelectOption,
} from '../config/personnel-archive-columns'
import { type Employee } from '../data/schema'
import { useOrgPersonnelLookups } from '../hooks/use-org-personnel-lookups'
import {
  getEmployeeFormSchema,
  type EmployeeForm,
} from './employee-action-dialog.shared'

const UNASSIGNED_POSITION_VALUE = '__UNASSIGNED_POSITION__'
const employeeFieldControlClassName =
  'h-11 w-full min-w-0 rounded-xl border border-transparent bg-muted/45 px-4 text-sm font-semibold shadow-inner transition-all focus-visible:border-primary/20 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/15'
const employeeFieldLabelClassName =
  'text-xs font-semibold text-muted-foreground'
const employeeFieldHintClassName = 'text-xs leading-5 text-muted-foreground'

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

  values.positionId = employee.positionId || defaults.positionId

  return values
}

function resolveFieldOptions(
  field: PersonnelFormFieldConfig,
  dynamicOrgUnits: PersonnelSelectOption[]
): PersonnelSelectOption[] {
  if (field.optionSource === 'orgUnit') {
    return dynamicOrgUnits
  }
  return field.options ?? []
}

function getEmployeeDialogFieldGridClassName(
  field: PersonnelFormFieldConfig
): string {
  if (field.span === 2) {
    return 'md:col-span-2 xl:col-span-4'
  }

  if (field.key === 'orgUnitId') {
    return 'md:col-span-2 xl:col-span-2'
  }

  if (field.key === 'idCard') {
    return 'xl:col-span-2'
  }

  return ''
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
  const orgUnitFieldLabel = getColumnLabel('orgUnitId')
  const orgUnitFieldHint =
    locale === 'zh-CN'
      ? '这里保存的是人员当前组织归属，来自组织机构主树；不会参与账号权限推导。'
      : 'This stores the employee organization assignment from the organization tree; it does not grant account permissions.'
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
  const { orgUnitOptions, positions } = useOrgPersonnelLookups({
    enabled: open,
    includePositions: true,
  })

  const formSchema = useMemo(() => getEmployeeFormSchema(t), [t])

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
          'flex w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden rounded-[28px] border-none bg-background p-0 shadow-2xl sm:w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] md:w-[min(1180px,calc(100vw-2rem))] md:max-w-[min(1180px,calc(100vw-2rem))]'
        )}
      >
        <DialogHeader className='shrink-0 border-b border-dashed border-muted/50 bg-muted/5 px-6 py-5 pr-14 text-start md:px-8 md:py-5'>
          <DialogTitle className='text-lg font-black'>
            {isEdit
              ? t('orgPersonnel.org.employeeDialog.editTitle')
              : t('orgPersonnel.org.employeeDialog.createTitle')}
          </DialogTitle>
          <DialogDescription className='text-xs font-medium text-muted-foreground'>
            {isEdit
              ? t('orgPersonnel.org.employeeDialog.editDesc')
              : t('orgPersonnel.org.employeeDialog.createDesc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='employee-form'
            onSubmit={form.handleSubmit(onSubmitHandler)}
            className={`${hostedQuickActionDialogScrollableBodyClassName} px-6 py-5 md:px-8 md:py-6`}
          >
            <div className='grid grid-cols-1 items-start gap-x-4 gap-y-4 md:grid-cols-2 xl:grid-cols-4'>
              {PERSONNEL_FORM_FIELDS.map((fieldConfig) => (
                <FormField
                  key={fieldConfig.key}
                  control={form.control}
                  name={fieldConfig.key}
                  render={({ field }) => (
                    <FormItem
                      className={`min-w-0 space-y-1.5 ${getEmployeeDialogFieldGridClassName(fieldConfig)}`}
                    >
                      <FormLabel className={employeeFieldLabelClassName}>
                        {fieldConfig.key === 'orgUnitId'
                          ? orgUnitFieldLabel
                          : getColumnLabel(fieldConfig.key)}
                      </FormLabel>
                      {fieldConfig.input === 'select' ? (
                        <div className='w-full'>
                          <SelectDropdown
                            isControlled
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder={
                              fieldConfig.key === 'orgUnitId'
                                ? orgUnitFieldLabel
                                : getColumnLabel(fieldConfig.key)
                            }
                            items={resolveFieldOptions(
                              fieldConfig,
                              orgUnitOptions
                            ).map((opt) => ({
                              ...opt,
                              label: getOptionLabel(opt.label),
                            }))}
                            className={employeeFieldControlClassName}
                          />
                        </div>
                      ) : (
                        <FormControl>
                          <Input
                            type={fieldConfig.input}
                            placeholder={
                              fieldConfig.key === 'orgUnitId'
                                ? orgUnitFieldLabel
                                : getColumnLabel(fieldConfig.key)
                            }
                            className={employeeFieldControlClassName}
                            {...field}
                          />
                        </FormControl>
                      )}
                      {fieldConfig.key === 'orgUnitId' && (
                        <p className={employeeFieldHintClassName}>
                          {orgUnitFieldHint}
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
                  <FormItem className='space-y-1 md:col-span-2 xl:col-span-2'>
                    <FormLabel className={employeeFieldLabelClassName}>
                      {positionFieldLabel}
                    </FormLabel>
                    <div className='w-full'>
                      <SelectDropdown
                        isControlled
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={positionFieldLabel}
                        items={positionOptions}
                        className={employeeFieldControlClassName}
                      />
                    </div>
                    <p className={employeeFieldHintClassName}>
                      {positionFieldHint}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter className='shrink-0 border-t border-dashed border-muted/50 bg-muted/5 px-6 py-5 md:px-8'>
          <Button
            type='submit'
            form='employee-form'
            className='h-11 w-full rounded-full px-8 text-sm font-semibold shadow-xl shadow-blue-500/20 transition-all active:scale-95 sm:w-auto'
          >
            {t('orgPersonnel.org.employeeDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
