'use client'

import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
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
import { type Employee } from '../data/schema'
import { type OrgNode } from '../data/org-schema'
import { OrgService } from '../services/org-service'
import {
    PERSONNEL_FORM_FIELDS,
    type PersonnelFormFieldConfig,
    type PersonnelFormFieldKey,
    type PersonnelSelectOption,
} from '../config/personnel-archive-columns'

type EmployeeForm = Record<PersonnelFormFieldKey, string> & {
    id?: string
    lineId: string
    processId: string
}

type EmployeeActionDialogProps = {
    currentRow?: Employee
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit?: (data: Employee) => void
}

function buildDefaultValues(): EmployeeForm {
    const fieldDefaults = Object.fromEntries(
        PERSONNEL_FORM_FIELDS.map(field => [field.key, field.defaultValue ?? ''])
    ) as Record<PersonnelFormFieldKey, string>

    return {
        ...fieldDefaults,
        id: '',
        lineId: 'none',
        processId: '',
    }
}

function buildFormValues(employee?: Employee): EmployeeForm {
    const defaults = buildDefaultValues()
    if (!employee) return defaults

    const values = { ...defaults, id: employee.id }

    PERSONNEL_FORM_FIELDS.forEach(field => {
        values[field.key] = field.formValueFromEmployee
            ? field.formValueFromEmployee(employee)
            : String(employee[field.key] ?? defaults[field.key] ?? '')
    })

    values.lineId = employee.lineId || defaults.lineId
    values.processId = employee.processId || defaults.processId

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
}: EmployeeActionDialogProps) {
    const { t } = useLanguage()
    const isEdit = !!currentRow
    const [dynamicDepts, setDynamicDepts] = useState<PersonnelSelectOption[]>([])

    const formSchema = z.object({
        id: z.string().optional(),
        staffId: z.string().trim().min(1, t('orgPersonnel.employeeDialog.errors.staffId' as any)),
        name: z.string().trim().min(1, t('orgPersonnel.employeeDialog.errors.name' as any)),
        deptId: z.string().trim().min(1, t('orgPersonnel.employeeDialog.errors.deptId' as any)),
        phone: z.string(),
        emergencyPhone: z.string(),
        gender: z.string(),
        joinedDate: z.string(),
        status: z.string().trim().min(1, t('orgPersonnel.employeeDialog.errors.status' as any)),
        age: z.string(),
        idCard: z.string(),
        birthday: z.string(),
        address: z.string(),
        bankCard: z.string(),
        bankName: z.string(),
        education: z.string(),
        lineId: z.string(),
        processId: z.string(),
    })

    const defaultValues = useMemo(() => buildDefaultValues(), [])

    const form = useForm<EmployeeForm>({
        resolver: zodResolver(formSchema),
        defaultValues,
    })

    useEffect(() => {
        if (!open) return

        const loadDynamicData = async () => {
            const orgData = await OrgService.getOrgTree()

            const flattenDepts = (nodes: OrgNode[]): PersonnelSelectOption[] => {
                let results: PersonnelSelectOption[] = []
                nodes.forEach(node => {
                    if (node.type === 'department' || node.type === 'team') {
                        results.push({ label: node.name, value: node.id })
                    }
                    if (node.children) {
                        results = [...results, ...flattenDepts(node.children)]
                    }
                })
                return results
            }

            setDynamicDepts(flattenDepts(orgData))
        }

        loadDynamicData()
    }, [open])

    useEffect(() => {
        if (!open) return
        form.reset(buildFormValues(currentRow))
    }, [currentRow, form, open])

    const onSubmitHandler = (values: EmployeeForm) => {
        const nextEmployee: Partial<Employee> = {
            id: values.id || '',
            lineId: values.lineId,
            processId: values.processId,
        }

        PERSONNEL_FORM_FIELDS.forEach(field => {
            const rawValue = values[field.key]
            const normalizedValue = field.submitValueFromForm
                ? field.submitValueFromForm(rawValue)
                : rawValue

            ;(nextEmployee as Record<string, unknown>)[field.key] = normalizedValue
        })

        onSubmit?.(nextEmployee as Employee)
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
            <DialogContent className='sm:max-w-3xl rounded-[32px] border-none shadow-2xl p-0 gap-0 overflow-hidden bg-background'>
                <DialogHeader className='text-start bg-muted/5 p-8 border-b border-dashed border-muted/50'>
                    <DialogTitle className='text-lg font-black tracking-tighter italic uppercase'>
                        {isEdit ? t('orgPersonnel.employeeDialog.editTitle' as any) : t('orgPersonnel.employeeDialog.createTitle' as any)}
                    </DialogTitle>
                    <DialogDescription className='text-[9px] font-black uppercase tracking-widest opacity-60'>
                        {isEdit ? t('orgPersonnel.employeeDialog.editDesc' as any) : t('orgPersonnel.employeeDialog.createDesc' as any)}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        id='employee-form'
                        onSubmit={form.handleSubmit(onSubmitHandler)}
                        className='space-y-6 p-8'
                    >
                        <div className='grid grid-cols-2 gap-x-8 gap-y-4'>
                            {PERSONNEL_FORM_FIELDS.map(fieldConfig => (
                                <FormField
                                    key={fieldConfig.key}
                                    control={form.control}
                                    name={fieldConfig.key}
                                    render={({ field }) => (
                                        <FormItem className={`space-y-1 ${fieldConfig.span === 2 ? 'col-span-2' : ''}`}>
                                            <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                                                {t(`orgPersonnel.excel.columns.${fieldConfig.key}` as any)}
                                            </FormLabel>
                                            {fieldConfig.input === 'select' ? (
                                                <div className='pt-1'>
                                                    <SelectDropdown
                                                        isControlled
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                        placeholder={t(`orgPersonnel.excel.columns.${fieldConfig.key}` as any)}
                                                        items={resolveFieldOptions(fieldConfig, dynamicDepts)}
                                                        className='h-11 rounded-2xl bg-muted/50 border-none shadow-inner font-bold text-xs'
                                                    />
                                                </div>
                                            ) : (
                                                <FormControl>
                                                    <Input
                                                        type={fieldConfig.input}
                                                        placeholder={t(`orgPersonnel.excel.columns.${fieldConfig.key}` as any)}
                                                        className='h-11 rounded-2xl bg-muted/50 border-none shadow-inner font-bold text-xs px-4 focus-visible:ring-primary/20 transition-all'
                                                        {...field}
                                                    />
                                                </FormControl>
                                            )}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                    </form>
                </Form>

                <DialogFooter className='p-6 bg-muted/5 border-t border-dashed border-muted/50'>
                    <Button
                        type='submit'
                        form='employee-form'
                        className='rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all'
                    >
                        {t('orgPersonnel.employeeDialog.submit' as any)}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
