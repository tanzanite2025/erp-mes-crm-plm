export const productionShared = {
  workArchitecture: {
    title: '全景架构中心',
    description: '绑定动作能力与标准条目，按当前层级结构组织业务底座',
    searchPlaceholder: '搜索编号或名称...',
    loadFailed: '结构数据加载失败，请检查网络连接。',
    emptyTitle: '未发现匹配的结构',
    emptyDescription: '请先在“产线管理”中创建可供挂载的层级结构。',
    treeEmptyDynamic: '暂无{{level1Name}}/{{level2Name}}结构数据',
    assignAction: '分配动作',
    assignActionSuccess: '指令 [{{command}}] 已分配至{{levelName}}：{{name}}',
    unconfiguredLevel: '未配置{{levelName}}',
    addLevel: '添加{{levelName}}',
    assignLevelCapability: '分配{{levelName}}能力',
    allLevelsMapped: '所有全局{{levelName}}均已映射。',
    noLevelMapped: '暂无{{levelName}}能力映射',
  },
} as const
