import { z } from 'zod'

/**
 * 实验设备分类 Schema
 * 支持多级层级嵌套
 */
export const equipmentCategorySchema = z.object({
    id: z.string(),
    name: z.string().min(1, '请输入分类名称'),
    parentId: z.string().optional(), // 为空表示顶层分类
    description: z.string().optional(),
    imageUrl: z.string().optional(), // 分类配图
    order: z.number().default(0),
    createdAt: z.string(),
})

export type EquipmentCategory = z.infer<typeof equipmentCategorySchema> & {
    children?: EquipmentCategory[]
}

/**
 * 实验设备 Schema
 */
export const equipmentSchema = z.object({
    id: z.string(),
    categoryId: z.string(), // 关联分类 ID
    name: z.string().min(1, '请输入设备名称'),
    sn: z.string().min(1, '请输入设备序列号'),
    model: z.string().optional(),
    spec: z.string().optional(), // 规格参数
    status: z.enum(['Active', 'Maintenance', 'Inactive']).default('Active'),
    imageUrl: z.string().optional(),
    lastCalibratedAt: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.string(),
})

export type Equipment = z.infer<typeof equipmentSchema>
