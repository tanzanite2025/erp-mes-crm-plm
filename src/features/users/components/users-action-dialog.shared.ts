import { z } from 'zod'
import { type Employee } from '@/features/org-personnel/data/schema'
import { type TranslationKey } from '@/locales'

export type EmployeeOption = {
  label: string
  value: string
  raw: Employee
}

export type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

export const getFormSchema = (t: TranslateFn) => z
  .object({
    firstName: z.string().min(1, t('users.validation.firstNameRequired')),
    lastName: z.string().min(1, t('users.validation.lastNameRequired')),
    username: z.string().min(1, t('users.validation.usernameRequired')),
    phoneNumber: z.string().optional().or(z.literal('')),
    password: z.string().transform((pwd) => pwd.trim()),
    confirmPassword: z.string().transform((pwd) => pwd.trim()),
    isEdit: z.boolean(),
    employeeId: z.string().optional(),
    role: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.isEdit && !data.password) return true
      return data.password.length > 0
    },
    {
      message: t('users.validation.passwordRequired'),
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password }) => {
      if (isEdit && !password) return true
      return password.length >= 8
    },
    {
      message: t('users.validation.passwordMin'),
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password }) => {
      if (isEdit && !password) return true
      return /[a-z]/.test(password)
    },
    {
      message: t('users.validation.passwordLower'),
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password }) => {
      if (isEdit && !password) return true
      return /\d/.test(password)
    },
    {
      message: t('users.validation.passwordDigit'),
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password, confirmPassword }) => {
      if (isEdit && !password) return true
      return password === confirmPassword
    },
    {
      message: t('users.validation.passwordMismatch'),
      path: ['confirmPassword'],
    }
  )

export type UserForm = z.infer<ReturnType<typeof getFormSchema>>
