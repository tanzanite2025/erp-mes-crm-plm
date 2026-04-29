export const systemManagementZhCNOverrides = {
  systemManagement: {
    routingTab: {
      tabs: {
        executions: '执行日志',
      },
    },
    layout: {
      title: '系统管理',
      tabs: {
        status: '系统状态',
        routing: '消息路由',
        workflowDefinition: '销售单工作流',
        logisticsApi: '物流 API',
        aiCapability: 'AI 能力管控',
      },
    },
    salesWorkflowDefinition: {
      loading: '正在加载工作流定义...',
      title: '销售单工作流定义',
      subtitle: '维护 SALES_ORDER 模块流程定义。启用后新建销售单会自动挂接工作流。',
      add: '新增定义',
      empty: '暂无销售单工作流定义',
      status: {
        active: '启用',
        inactive: '停用',
      },
      actions: {
        refresh: '刷新',
        enable: '启用',
        disable: '停用',
      },
      table: {
        code: '编码',
        name: '名称',
        version: '版本',
        status: '状态',
        updatedAt: '更新时间',
        actions: '操作',
      },
      dialog: {
        createTitle: '新增工作流定义',
        editTitle: '编辑工作流定义',
        description: '该定义仅作用于 SALES_ORDER 模块。',
      },
      form: {
        code: '编码',
        name: '名称',
        namePlaceholder: '销售单默认流程',
        version: '版本',
        isActive: '启用状态',
        isActiveHint: '启用后新建销售单会自动创建工作流实例',
        description: '描述',
        descriptionPlaceholder: '用于说明此流程定义的业务场景',
        definitionJson: '流程定义 JSON',
        useTemplate: '填入模板',
      },
      toasts: {
        loadFailed: '加载工作流定义失败',
        saveSuccess: '保存成功',
        saveFailed: '保存工作流定义失败',
        required: '编码和名称不能为空',
        invalidVersion: '版本号必须为正整数',
        invalidJson: '流程定义 JSON 格式错误',
      },
    },
  },
} as const
