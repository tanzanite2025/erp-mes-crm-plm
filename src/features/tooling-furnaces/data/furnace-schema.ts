import { z } from 'zod'
import type { TranslationKey } from '@/locales'

export const furnaceStatusSchema = z.enum([
  'IDLE',
  'HEATING',
  'COOLING',
  'MAINTENANCE',
  'FAULT',
])

type ToolingFurnaceTranslate = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

type FurnaceValidationKey =
  | 'toolingFurnaces.dialog.validation.snRequired'
  | 'toolingFurnaces.dialog.validation.nameRequired'
  | 'toolingFurnaces.dialog.validation.typeRequired'
  | 'toolingFurnaces.dialog.validation.maxTempPositive'

const furnaceValidationFallbacks: Record<FurnaceValidationKey, string> = {
  'toolingFurnaces.dialog.validation.snRequired': '请输入炉台编号',
  'toolingFurnaces.dialog.validation.nameRequired': '请输入炉台名称',
  'toolingFurnaces.dialog.validation.typeRequired': '请输入炉台类型',
  'toolingFurnaces.dialog.validation.maxTempPositive': '最高温度必须大于 0',
}

function getFurnaceValidationMessage(
  t: ToolingFurnaceTranslate | undefined,
  key: FurnaceValidationKey
) {
  return t?.(key) ?? furnaceValidationFallbacks[key]
}

export function createFurnaceSchema(t?: ToolingFurnaceTranslate) {
  return z.object({
    id: z.string(),
    sn: z
      .string()
      .min(
        1,
        getFurnaceValidationMessage(
          t,
          'toolingFurnaces.dialog.validation.snRequired'
        )
      ),
    name: z
      .string()
      .min(
        1,
        getFurnaceValidationMessage(
          t,
          'toolingFurnaces.dialog.validation.nameRequired'
        )
      ),
    type: z
      .string()
      .min(
        1,
        getFurnaceValidationMessage(
          t,
          'toolingFurnaces.dialog.validation.typeRequired'
        )
      ),
    maxTemp: z
      .number()
      .min(
        1,
        getFurnaceValidationMessage(
          t,
          'toolingFurnaces.dialog.validation.maxTempPositive'
        )
      ),
    currentTemp: z.number(),
    imageUrl: z.string().optional(),
    version: z.number().default(1),
    status: furnaceStatusSchema,
    location: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.string(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
    updatedAt: z.string().optional(),
  })
}

export const furnaceSchema = createFurnaceSchema()

export type FurnaceFormInput = z.input<ReturnType<typeof createFurnaceSchema>>
export type FurnaceFormOutput = z.output<ReturnType<typeof createFurnaceSchema>>

export function createFurnaceDraft(
  defaultType: string,
  overrides: Partial<FurnaceFormOutput> = {}
): FurnaceFormOutput {
  return {
    id: '',
    sn: '',
    name: '',
    type: defaultType,
    maxTemp: 1200,
    currentTemp: 25,
    version: 1,
    status: 'IDLE',
    location: '',
    description: '',
    imageUrl: '',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

export type Furnace = z.infer<typeof furnaceSchema>
export type FurnaceStatus = z.infer<typeof furnaceStatusSchema>
