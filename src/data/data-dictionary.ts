import { DataDictionaryItem } from '@/types/data-dict'

export const initialDataDictionary: DataDictionaryItem[] = [
    {
        id: '1',
        variableKey: 'PRODUCT_ID_FORMAT',
        label: '商品ID编码规则',
        dataType: 'string',
        description: '用于定义系统中商品唯一标识的生成规则',
        mappingRule: 'PRD-{YYYY}-{NNNN}',
        example: 'PRD-2025-0001',
        category: '基础设置',
        updatedAt: new Date().toISOString(),
    },
    {
        id: '2',
        variableKey: 'BATCH_PREFIX',
        label: '批次号前缀',
        dataType: 'string',
        description: '生产批次的统一前缀',
        mappingRule: 'BAT-',
        example: 'BAT-20250129',
        category: '生产管理',
        updatedAt: new Date().toISOString(),
    },
    {
        id: '3',
        variableKey: 'QUALITY_STATUS_MAP',
        label: '质检状态映射',
        dataType: 'object',
        description: '质检状态码与显示文本的对应关系',
        mappingRule: '{"0": "待检", "1": "合格", "2": "不合格"}',
        example: '0 -> 待检',
        category: '质量管理',
        updatedAt: new Date().toISOString(),
    }
]
