export const workflowCore = {
  commands: {
    page: {
      title: '通知内容模板',
      description:
        '统一管理可复用的通知标题、正文和跳转链接，供消息中心规则绑定使用。',
      add: '新增内容模板',
      searchPlaceholder: '搜索模板名称、正文或跳转链接...',
      tabs: {
        all: '全部模板',
      },
    },
    list: {
      empty: '暂无通知内容模板',
      scope: '范围',
      nodeType: '环节',
    },
    form: {
      editTitle: '编辑通知内容模板',
      newTitle: '新增通知内容模板',
      description:
        '配置通知正文及点击后的跳转路径，支持使用 [OrderNo]、[ProductName] 等变量。',
      fields: {
        title: '内容模板名称',
        nodeType: '关联环节',
        params: '动态参数（逗号分隔）',
        targetLink: '跳转目标链接',
        content: '通知正文模板',
      },
      placeholders: {
        title: '如：订单审核提醒',
        nodeType: '选择关联环节',
        params: '如：OrderNo, ProductName',
        targetLink: '如：/trading/sales-orders/[OrderId]',
        content: '请在此输入通知正文内容，支持使用参数变量...',
      },
      targetLinkHint: '* 点击通知后将自动跳转至此页面。',
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
        content:
          '新订单 [OrderNo] ([ProductName]) 已提交，请点击处理按钮进行审核。',
      },
      productionDone: {
        title: '生产任务完成',
        content: '订单 [OrderNo] 的生产任务已全部完成，请检查状态。',
      },
    },
  },
} as const
