export const bomFieldBusinessMeaningHelp = {
  triggerLabel: '查看{{field}}说明',
  bomType: {
    title: 'BOM 类型：研发与生产分别管理',
    summary:
      '类型表示这份配方的用途。新建时先建立研发 BOM，类型由创建方式决定。',
    items: {
      engineering: {
        title: '研发 BOM（EBOM）',
        description:
          '记录设计和研发确认的物料配方，先保存草稿，核对后批准、发布。',
      },
      manufacturing: {
        title: '生产 BOM（MBOM）',
        description:
          '从已发布且锁定的研发 BOM 派生，生成独立的生产草稿，再核对生产用途的配方。源研发 BOM 保留不变。',
      },
    },
    instruction:
      '需要转生产时，到“BOM 配方”找到源研发记录，点击“派生 MBOM”；这里不能直接切换类型。',
  },
  ownership: {
    title: '归属：这份配方供谁使用',
    summary:
      '归属区分通用的内部生产配方与特定客户专供的配方。研发和生产 BOM 都可以分别设置归属。',
    items: {
      internal: {
        title: '内部生产',
        description: '配方不绑定特定客户时选此项；“归属客户”留空，无需选择。',
      },
      customer: {
        title: '客户专供',
        description:
          '配方专供某个客户时选此项，并在“归属客户”选择实际客户。没有客户资料时先建立客户，再回来选择。',
      },
    },
    instruction:
      '例如同一 R50 产品的内部配方选“内部生产”，为客户 A 单独维护的配方选“客户专供＋客户 A”。归属表示配方适用范围，不是负责部门。不同归属的版本和重量分别核对。',
  },
  performanceAndWeight: {
    title: '性能版本与重量：当前产品的具体配置',
    summary:
      '先选择具体产品，再打开旁边的设置按钮维护版本及重量，回到下拉菜单选用。',
    items: {
      catalog: {
        title: '共用名称，按需选用',
        description:
          '标准版、轻量版、超轻版等是共用选项。每种产品只建立需要的版本，不要求所有型号都有全部版本。',
      },
      weight: {
        title: '重量随当前 BOM 保存',
        description:
          '填写当前具体产品、性能版本和配方对应的成品重量及单位。例如 R50 轻量版 420 g，另一产品的轻量版可以不同；物料用量和预估成本不会自动算出成品重量。',
      },
      save: {
        title: '目录保存与 BOM 保存分开',
        description:
          '选项弹窗保存后，从下拉菜单选择版本，再保存 BOM。BOM 只保存当前选中的版本和重量，其他标记为“本次暂存”的版本不会一起保存。',
      },
    },
    instruction:
      '比较重量时对齐具体产品、研发或生产类型、归属与客户。草稿可继续补全重量；发布前须填写大于 0 的成品重量及重量单位。',
  },
  lifecycle: {
    title: '为什么 BOM 有生命周期',
    summary:
      '同一产品的配方会经历准备、确认、投入使用和退出。状态记录的是这份 BOM 能否继续修改、能否正式使用，不是产品型号或性能版本的等级。',
    items: {
      draft: {
        title: '草稿（DRAFT）',
        description:
          '正在准备，可以修改和保存；保存草稿不代表已经可以投入生产。',
      },
      reviewing: {
        title: '评审中（REVIEWING）',
        description:
          '表示待评审阶段；当前弹窗的“提交评审”使用直接批准的快速通道，不会停留在此状态。',
      },
      approved: {
        title: '已批准（APPROVED）',
        description: '内容锁定，等待单独执行发布；已批准还不等于已发布。',
      },
      released: {
        title: '已发布（RELEASED）',
        description:
          '已经发布，内容锁定。已发布且锁定的研发 BOM 可以派生生产 BOM。',
      },
      obsolete: {
        title: '已作废（OBSOLETE）',
        description: '退出使用，保留历史，不能再直接修改或恢复为草稿。',
      },
    },
    instruction:
      '生效日期只记录计划适用日期，不会自动批准或发布。状态操作仍受账号权限和业务校验约束。',
  },
}
