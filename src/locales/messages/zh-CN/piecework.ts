export const piecework = {
  layout: {
    title: '数字化计件管理中心',
    subtitle: '核心计件规则、班组效率与数字化分配逻辑',
    tabs: {
      query: '计件明细查询',
      rules: '计件单价规则',
      stats: '计件效率分析',
      teams: '计件班组管理',
    },
  },
  placeholders: {
    moduleTitle: '{{title}} 功能中心',
    moduleSubtitle: '数字化工厂：计件数据深度分析与受控管理逻辑',
    notAvailable: '{{title}} 模块暂未开放',
    underDevelopment: '当前模块处于开发与数据加密阶段',
  },
  query: {
    title: '计件查询',
  },
  rules: {
    title: '计件规则',
  },
  stats: {
    title: '计件统计',
  },
} as const
