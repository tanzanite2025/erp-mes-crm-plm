import { z } from 'zod'
import { type TranslationKey } from '@/locales'
import { getNewUserPasswordPolicyError } from '@/features/auth/change-current-user-password/new-user-password-policy-validation'
import { type Employee } from '@/features/org-personnel/data/schema'

export type EmployeeOption = {
  label: string
  value: string
  raw: Employee
}

export type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export const getFormSchema = (t: TranslateFn) =>
  z
    .object({
      firstName: z.string().min(1, t('users.validation.firstNameRequired')),
      lastName: z.string().min(1, t('users.validation.lastNameRequired')),
      username: z.string().min(1, t('users.validation.usernameRequired')),
      phoneNumber: z.string().optional().or(z.literal('')),
      password: z.string(),
      confirmPassword: z.string(),
      isEdit: z.boolean(),
      employeeId: z.string().optional(),
      permissionPresetId: z.string().optional(),
      initialPermissionPresetId: z.string(),
      adminChallenge: z.string().transform((value) => value.trim()),
    })
    .superRefine((data, context) => {
      if (data.isEdit && !data.password) return
      const error = getNewUserPasswordPolicyError(data.password)
      if (error)
        context.addIssue({
          code: 'custom',
          path: ['password'],
          message: t(`users.validation.${error}`),
        })
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
      ({ permissionPresetId, initialPermissionPresetId, adminChallenge }) => {
        const promotesToAdmin =
          initialPermissionPresetId.trim().toLowerCase() !== 'admin' &&
          permissionPresetId?.trim().toLowerCase() === 'admin'
        return !promotesToAdmin || adminChallenge.length > 0
      },
      {
        message: t('users.validation.adminChallengeRequired'),
        path: ['adminChallenge'],
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
