export type DataType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date'

export interface DataDictionaryItem {
    id: string
    variableKey: string // 代码中使用的常量名，如 PRODUCT_ID_PREFIX
    label: string // 业务中文名
    dataType: DataType
    description: string // 详细描述
    mappingRule?: string // 映射规则或 ID 生成逻辑
    example: string // 示例值
    category: string // 业务分类，如 '生产', '质量', '系统'
    updatedAt: string
}
