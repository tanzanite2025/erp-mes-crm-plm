import { z } from 'zod'

export const teamTypeEnum = z.enum(['dispatch', 'quality', 'transfer', 'receive']) // 派工, 品质, 移转, 接收

export const teamSchema = z.object({
    id: z.string(),
    code: z.string().min(1, '请输入群组编码'),
    name: z.string().min(1, '请输入群组名称'),
    shortName: z.string().optional(),
    step: z.number().optional(),
    section: z.string().min(1, '请输入归属区段'),
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

export type Team = z.infer<typeof teamSchema>
export type TeamType = z.infer<typeof teamTypeEnum>

// --- 计件工价规则 (Piecework Rates/Rules) ---

export const pieceworkRateSchema = z.object({
    id: z.string(),
    productId: z.string().min(1, '请选择关联产品 SKU'),
    processName: z.string().min(1, '请输入工序名称'),
    piecePrice: z.number().min(0, '单价不能为负数'),
    unit: z.string().default('PCS'),
    status: z.enum(['active', 'inactive']).default('active'),
    remarks: z.string().optional(),
    version: z.number().default(1),
})

export type PieceworkRate = z.infer<typeof pieceworkRateSchema>
