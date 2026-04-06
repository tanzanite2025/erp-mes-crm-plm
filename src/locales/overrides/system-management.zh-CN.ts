export const systemManagementZhCNOverrides = {
  systemManagement: {
    layout: {
      title: '系统管理',
      tabs: {
        status: '系统状态',
        routing: '消息路由',
        logisticsApi: '物流 API',
        aiCapability: 'AI 能力管控',
      },
    },
    userRights: {
      header: {
        title: '角色权限矩阵',
        subtitle: '按角色标识统一管理模块、页面、标签页与操作权限。',
      },
      actions: {
        importOrgRole: '导入部门角色',
        selectOrgRole: '选择部门角色',
        confirmImport: '确认导入',
        expand: '展开',
        collapse: '收起',
        expandAll: '展开全部',
        collapseAll: '收起全部',
      },
      sections: {
        accessTree: '权限树',
        moduleActions: '模块级操作权限',
      },
      table: {
        accessNodes: '权限节点',
      },
      mobile: {
        targetRole: '选择角色',
      },
      kinds: {
        module: '模块',
        page: '页面',
        tab: '标签',
        action: '操作',
      },
      status: {
        expanded: '已展开 {{count}} 个子节点',
        collapsed: '已收起 {{count}} 个子节点，点击左侧可展开。',
        collapsedShort: '已收起 {{count}} 个子节点',
      },
      securityInfo:
        '权限矩阵遵循最小授权原则。ROOT（superadmin）角色保持锁定，避免误触发全局授权漂移。',
    },
  },
} as const
