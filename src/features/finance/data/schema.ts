import { z } from 'zod'

/**
 * 币种 Schema (Currency)
 * 遵循 [Backend Authority] 规范，版本号 (version) 强制存在以支持并发校验。
 */
export const CurrencySchema = z.object({
  id: z.number().optional(),
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(1),
  symbol: z.string().min(1),
  rate: z.number().nonnegative(),
  precision: z.number().int().min(0).max(4).default(2),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  isBase: z.boolean().default(false),
  version: z.number().int().default(1),
})

export type Currency = z.infer<typeof CurrencySchema>

/**
 * 结算方式 Schema (Payment Term)
 * 工业级规范：支持 installments JSON 负载。
 */
export const PaymentTermSchema = z.object({
  id: z.number().optional(),
  code: z.string().min(1).toUpperCase(),
  name: z.string().min(1),
  description: z.string().optional(),
  installments: z.string().optional(), // 存储为 JSON 字符串，后端解析
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  isSystem: z.boolean().default(false),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  version: z.number().int().default(1),
})

export type PaymentTerm = z.infer<typeof PaymentTermSchema>

/**
 * 支付方式 Schema (Payment Method)
 */
export const PaymentMethodSchema = z.object({
  id: z.number().optional(),
  code: z.string().min(1).toUpperCase(),
  name: z.string().min(1),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  isSystem: z.boolean().default(false),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  version: z.number().int().default(1),
})

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>
