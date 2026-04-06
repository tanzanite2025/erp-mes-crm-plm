export const workflowCore = {
  commands: {
    page: {
      title: '标准指令库',
      description: '预设标准化指令模板，提升流程协同效率',
      add: '新增标准指令',
      searchPlaceholder: '搜索指令内容、分类或标签...',
      tabs: {
        all: '全部指令',
      },
    },
    list: {
      empty: '暂无通知模板',
      scope: '范围',
      nodeType: '环节',
    },
    form: {
      editTitle: '编辑通知模板',
      newTitle: '新增通知模板',
      description: '配置通知正文及点击后的跳转路径，支持使用 [OrderNo]、[ProductName] 等变量。',
      fields: {
        title: '通知模板名称',
        bindType: '适用范围',
        nodeType: '关联环节',
        params: '动态参数（逗号分隔）',
        targetLink: '跳转目标链接',
        content: '通知正文模板',
      },
      placeholders: {
        title: '如：订单审核提醒',
        bindType: '选择适用范围',
        nodeType: '选择关联环节',
        params: '如：OrderNo, ProductName',
        targetLink: '如：/trading/sales-orders/[OrderId]',
        content: '请在此输入通知正文内容，支持使用参数变量...',
      },
      targetLinkHint: '* 点击通知后将自动跳转至此页面。',
    },
    bindTypes: {
      section: 'SECTION / 仅工段',
      station: 'STATION / 仅站点',
      role: 'ROLE / 仅角色激活',
      global: 'GLOBAL / 全局通用',
    },
    nodeTypes: {
      none: '未分类',
      start: '触发环节',
      approval: '审批环节',
      check: '核对环节',
      production: '生产环节',
    },
    defaults: {
      pendingApproval: {
        title: '订单待审批通知',
        content: '新订单 [OrderNo] ([ProductName]) 已提交，请点击处理按钮进行审核。',
      },
      productionDone: {
        title: '生产任务完成',
        content: '订单 [OrderNo] 的生产任务已全部完成，请检查状态。',
      },
    },
    toasts: {
      added: '指令已添加到库中',
      removed: '指令已从库中移除',
    },
  },
}
