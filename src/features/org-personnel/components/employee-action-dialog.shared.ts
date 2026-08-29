import { z } from 'zod'
import { type TranslationKey } from '@/locales'
import { type PersonnelFormFieldKey } from '../config/personnel-archive-columns'

export type EmployeeForm = Record<PersonnelFormFieldKey, string> & {
  id?: string
  positionId: string
  version?: number
}

type EmployeeDialogTranslate = (key: TranslationKey) => string

export function getEmployeeFormSchema(t: EmployeeDialogTranslate) {
  return z.object({
    id: z.string().optional(),
    version: z.number().optional(),
    staffId: z
      .string()
      .trim()
      .min(1, t('orgPersonnel.org.employeeDialog.errors.staffId')),
    name: z
      .string()
      .trim()
      .min(1, t('orgPersonnel.org.employeeDialog.errors.name')),
    orgUnitId: z
      .string()
      .trim()
      .min(1, t('orgPersonnel.org.employeeDialog.errors.orgUnitId')),
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
    positionId: z.string(),
  })
}
