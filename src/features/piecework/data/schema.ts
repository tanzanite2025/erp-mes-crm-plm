import { z } from 'zod'
import type { TranslationKey } from '@/locales'

export const teamTypeEnum = z.enum([
  'dispatch',
  'quality',
  'transfer',
  'receive',
]) // 派工, 品质, 移转, 接收

type PieceworkTranslate = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

type TeamValidationKey =
  | 'piecework.validation.teamCodeRequired'
  | 'piecework.validation.teamNameRequired'
  | 'piecework.validation.teamSectionRequired'

const teamValidationFallbacks: Record<TeamValidationKey, string> = {
  'piecework.validation.teamCodeRequired': '请输入群组编码',
  'piecework.validation.teamNameRequired': '请输入群组名称',
  'piecework.validation.teamSectionRequired': '请输入归属区段',
}

function getTeamValidationMessage(
  t: PieceworkTranslate | undefined,
  key: TeamValidationKey
) {
  return t?.(key) ?? teamValidationFallbacks[key]
}

export function createTeamSchema(t?: PieceworkTranslate) {
  return z.object({
    id: z.string(),
    code: z
      .string()
      .min(
        1,
        getTeamValidationMessage(t, 'piecework.validation.teamCodeRequired')
      ),
    name: z
      .string()
      .min(
        1,
        getTeamValidationMessage(t, 'piecework.validation.teamNameRequired')
      ),
    shortName: z.string().optional(),
    step: z.number().optional(),
    section: z
      .string()
      .min(
        1,
        getTeamValidationMessage(t, 'piecework.validation.teamSectionRequired')
      ),
    process: z.string().optional(),
    processCommand: z.string().optional(),
    type: teamTypeEnum.default('dispatch'),
    isMaintenance: z.boolean().default(false),
    status: z.enum(['active', 'inactive']).default('active'),
    operator: z.string().optional(),
    operateTime: z.string().optional(),
    remarks: z.string().optional(),
    version: z.number().default(1),
  })
}

export const teamSchema = createTeamSchema()

export type Team = z.infer<ReturnType<typeof createTeamSchema>>
export type TeamType = z.infer<typeof teamTypeEnum>

export function createPieceworkRateSchema(_t?: PieceworkTranslate) {
  return z
    .object({
      id: z.string(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      payItemId: z.string().min(1),
      payItemCode: z.string().min(1),
      payItemName: z.string().min(1),
      unitPrice: z.number().finite().min(0),
      unit: z.string().min(1),
      currency: z.string().regex(/^[A-Z]{3}$/),
      effectiveFrom: z.string().min(1),
      effectiveTo: z
        .string()
        .nullish()
        .transform((value) => value ?? ''),
      status: z.enum(['active', 'inactive']),
      remarks: z.string().optional(),
      version: z.number().int().positive(),
      operator: z.string().optional(),
    })
    .strict()
}
export const pieceworkRateSchema = createPieceworkRateSchema()
export type PieceworkRate = z.infer<
  ReturnType<typeof createPieceworkRateSchema>
>
