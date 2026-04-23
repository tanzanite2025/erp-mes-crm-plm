export const apsScheduling = {
  layout: {
    title: 'APS排产',
    tabs: {
      board: 'APS看板',
      engineConfig: '贪婪引擎配置',
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
  engineConfig: {
    title: '贪婪引擎配置',
    subtitle: '先展示规则结构与因素卡片形态，后续再逐步接入真实排产计算。',
    sections: {
      factorDeckTitle: '因素卡片区',
    },
    dateCard: {
      title: '日期 / 休息日 / 节假日',
      description: '先把工作日、周末休息日与法定节假日这些日期因素抽成独立卡片，后续再决定如何参与真实排产。',
      summary: {
        defaultWorkdayLabel: '默认工作日',
        defaultWorkdayValue: '工作日默认视为可排日期。',
        weekendRestLabel: '周末处理',
        weekendRestValue: '周末先按休息日展示，不接入真实停排逻辑。',
        holidayStopLabel: '节假日处理',
        holidayStopValue: '节假日先以停排占位展示，后续再接真实规则。',
      },
    },
  },
  process: {
    title: '工序总览',
    subtitle: '为 APS 与产线管理复用的工序树与状态视图。',
  },
}
