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

type PieceworkRateValidationKey =
  | 'piecework.validation.pieceworkRateProductRequired'
  | 'piecework.validation.pieceworkRateProcessNameRequired'
  | 'piecework.validation.pieceworkRatePriceNonNegative'

const teamValidationFallbacks: Record<TeamValidationKey, string> = {
  'piecework.validation.teamCodeRequired': '请输入群组编码',
  'piecework.validation.teamNameRequired': '请输入群组名称',
  'piecework.validation.teamSectionRequired': '请输入归属区段',
}

const pieceworkRateValidationFallbacks: Record<
  PieceworkRateValidationKey,
  string
> = {
  'piecework.validation.pieceworkRateProductRequired': '请选择关联产品 SKU',
  'piecework.validation.pieceworkRateProcessNameRequired': '请输入末级层级名称',
  'piecework.validation.pieceworkRatePriceNonNegative': '单价不能为负数',
}

function getTeamValidationMessage(
  t: PieceworkTranslate | undefined,
  key: TeamValidationKey
) {
  return t?.(key) ?? teamValidationFallbacks[key]
}

function getPieceworkValidationMessage(
  t: PieceworkTranslate | undefined,
  key: PieceworkRateValidationKey
) {
  return t?.(key) ?? pieceworkRateValidationFallbacks[key]
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

// --- 计件工价规则 (Piecework Rates/Rules) ---

export function createPieceworkRateSchema(t?: PieceworkTranslate) {
  return z.object({
    id: z.string(),
    productId: z
      .string()
      .min(
        1,
        getPieceworkValidationMessage(
          t,
          'piecework.validation.pieceworkRateProductRequired'
        )
      ),
    processName: z
      .string()
      .min(
        1,
        getPieceworkValidationMessage(
          t,
          'piecework.validation.pieceworkRateProcessNameRequired'
        )
      ),
    piecePrice: z
      .number()
      .min(
        0,
        getPieceworkValidationMessage(
          t,
          'piecework.validation.pieceworkRatePriceNonNegative'
        )
      ),
    unit: z.string().default('PCS'),
    status: z.enum(['active', 'inactive']).default('active'),
    remarks: z.string().optional(),
    version: z.number().default(1),
  })
}

export const pieceworkRateSchema = createPieceworkRateSchema()

export type PieceworkRate = z.infer<
  ReturnType<typeof createPieceworkRateSchema>
>
