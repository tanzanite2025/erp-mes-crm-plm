import type { BarcodeRuleSegment } from './barcode-rule-segment'

export type { BarcodeRuleSegment }

export const LINEAR_BARCODE_SEQUENCE_RULE_KEY = 'LINEAR_BARCODE_WHEEL'

export const LINEAR_BARCODE_RULES_CONFIG: BarcodeRuleSegment[] = [
    {
        id: 'year',
        range: '01-02',
        name: '生产年份',
        length: 2,
        description: '年份后两位，例如 2025 -> 25。',
        examples: ['24', '25', '26'],
        type: 'fixed',
        isEditable: false,
    },
    {
        id: 'month',
        range: '03',
        name: '生产月份',
        length: 1,
        description: '1-9 代表 1-9 月，0=10 月，N=11 月，D=12 月。',
        examples: ['1', '9', '0=10月', 'N=11月', 'D=12月'],
        type: 'mapping',
        isEditable: false,
    },
    {
        id: 'day',
        range: '04-05',
        name: '生产日期',
        length: 2,
        description: '自然日，范围 01-31。',
        examples: ['01', '08', '31'],
        type: 'fixed',
        isEditable: false,
    },
    {
        id: 'model',
        range: '06-07',
        name: '产品型号',
        length: 2,
        description: '与工程库产品型号双向对齐，使用两位型号编码。',
        examples: ['01', '02', '15'],
        type: 'fixed',
        isEditable: false,
    },
    {
        id: 'appearance',
        range: '08',
        name: '外观代码',
        length: 1,
        description: '1-9 外观映射，延续现有外观字典配置。',
        examples: ['1', '2', '3'],
        type: 'mapping',
        isEditable: true,
    },
    {
        id: 'holePrefix',
        range: '09',
        name: '孔型前缀',
        length: 1,
        description: '孔型前缀占 1 位，当前使用 R/D 等分类标识。',
        examples: ['R', 'D'],
        type: 'fixed',
        isEditable: false,
    },
    {
        id: 'holes',
        range: '10-11',
        name: '孔数',
        length: 2,
        description: '孔数占 2 位，使用两位数字编码，例如 14、18、32。',
        examples: ['14', '18', '24', '32'],
        type: 'fixed',
        isEditable: false,
    },
    {
        id: 'serial',
        range: '12-15',
        name: '流水号',
        length: 4,
        description: `通过业务编号规则 ${LINEAR_BARCODE_SEQUENCE_RULE_KEY} 发号，推荐 pattern={SEQ}、padding=4。`,
        examples: ['0001', '0023', '9999'],
        type: 'auto',
        isEditable: false,
    },
]

export const DEFAULT_LINEAR_BARCODE_SAMPLE = '25010101R140001'
