/**
 * DM 号码规则映射配置 (Data Matrix Numbering Rules Configuration)
 * 采用 14 位字符对齐逻辑，确保与现有一维码兼容。
 * 独立于 UI 逻辑，便于未来升级追溯维度（如扩展至 24 位）。
 */

export interface DMRuleSegment {
    id: string
    range: string       // 字符位区间，如 "01-02"
    name: string        // 段位名称
    length: number      // 字符长度
    description: string  // 取值说明
    examples: string[]   // 示例数据
    type: 'fixed' | 'mapping' | 'auto' // 取值类型：固定、映射表、自动累加
    isEditable?: boolean // 是否允许手动编辑逻辑
}

export const DM_RULES_CONFIG: DMRuleSegment[] = [
    {
        id: 'year',
        range: '01-02',
        name: '产品年份',
        length: 2,
        description: '年份末尾2位 (2025 -> 25)',
        examples: ['24', '25', '26'],
        type: 'fixed',
        isEditable: false
    },
    {
        id: 'month',
        range: '03',
        name: '产品月份',
        length: 1,
        description: '1-9代表1-9月; 0=10月; N=11月; D=12月',
        examples: ['1', '9', '0=10月', 'N=11月', 'D=12月'],
        type: 'mapping',
        isEditable: false
    },
    {
        id: 'model',
        range: '04-05',
        name: '产品型号',
        length: 2,
        description: '已与产品档案主字段同步 (2位识别码)',
        examples: ['01', '02', '03'],
        type: 'fixed',
        isEditable: false
    },
    {
        id: 'appearance',
        range: '06',
        name: '产品外观',
        length: 1,
        description: '1-9 数字映射 (1=UD, 2=高光...)',
        examples: ['1', '2', '3'],
        type: 'mapping',
        isEditable: true
    },
    {
        id: 'category',
        range: '07',
        name: '二级分类',
        length: 1,
        description: '二级分类代码 (从产品档案关联的分类中自动索引)',
        examples: ['M=山地', 'R=公路', 'G=全地形'],
        type: 'mapping',
        isEditable: true
    },
    {
        id: 'holes',
        range: '08-09',
        name: '产品孔数',
        length: 2,
        description: '基于产品型号自动锁定 (从产品档案允许孔数中索引)',
        examples: ['21', '24', '28'],
        type: 'fixed',
        isEditable: true
    },
    {
        id: 'serial',
        range: '10-14',
        name: '流水号',
        length: 5,
        description: '按生产顺序自动累加 (00001-99999)',
        examples: ['00001', '00024', '99999'],
        type: 'auto',
        isEditable: true
    }
]

/**
 * 默认演示数据，用于 DM 码预览生成器
 */
export const DEFAULT_DM_SAMPLE = '250161R2400023'
