export const apsScheduling = {
  layout: {
    title: 'APS排产',
    tabs: {
      board: 'APS看板',
      process: '工序总览',
    },
  },
  board: {
    title: 'APS排产工作台',
    subtitle: '统一承接产能、优先级与交期协调的排产工作台。',
    statusSummary: '当前排产：{total} 单，{running} 单执行中，{draft} 单待排，{late} 单有风险。',
    searchPlaceholder: '搜索排程单号、产品或线体...',
    rules: '规则',
    create: '新建排程',
    pending: '待排产',
    capacity: '产能占用',
    risk: '延期风险',
    boardTitle: '时间轴看板',
    boardSubtitle: '排程窗口 / 线体负载 / 交期风险',
    laneLabel: '线体 / 时间',
    live: '实时',
    noResultsTitle: '未找到匹配的排程结果',
    noResultsSubtitle: '请尝试调整搜索条件，或清空关键字后重新查看排产看板。',
    loading: 'APS排产数据加载中...',
    refreshing: '正在刷新 APS 排产数据...',
    fallbackNotice: '若后端暂不可用，页面会回退到本地示例数据。',
  },
  process: {
    title: '工序总览',
    subtitle: '为 APS 与产线管理复用的工序树与状态视图。',
  },
}
