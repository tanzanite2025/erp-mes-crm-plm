export const productionArchitecture = {
  layout: {
    title: '生产架构',
    tabs: {
      mindmap: '产线脑图',
      hierarchyConfig: '层级配置',
      topology: '拓扑模板',
      routes: '生产路线',
    },
  },
  mindmap: {
    header: {
      title: '产线脑图',
      subtitle:
        '以 {{level1Name}} / {{level2Name}} / {{level3Name}} 为层级骨架，验证新的受限脑图编辑方式',
    },
    actions: {
      currentLine: '当前产线',
      linePlaceholder: '选择要查看的产线',
      addLine: '新增产线',
      lineActions: '当前产线操作',
      editLine: '编辑产线资料',
      enableLine: '启用当前产线',
      disableLine: '停用当前产线',
      deleteLine: '删除当前产线',
      editNode: '编辑当前节点',
      noManagePermission: '当前账号没有产线管理权限',
      noUpdatePermission: '当前账号没有修改产线结构权限',
      noStatusPermission: '当前账号没有修改产线状态权限',
    },
  },
  routes: {
    title: '生产路线',
    description:
      '维护产品的工序顺序和执行方式。路线只引用产线脑图已配置的工序能力，不直接修改产线拓扑。',
    searchPlaceholder: '搜索路线编号、名称或产品...',
    add: '新增生产路线',
    empty: '暂无生产路线',
    noDescription: '暂无路线说明',
    productUnbound: '未绑定产品',
    stepCount: '共 {{count}} 道工序',
    moreSteps: '还有 {{count}} 道工序',
    noManagePermission: '当前账号没有生产路线管理权限',
    deleteConfirm: '确认删除生产路线“{{name}}”吗？删除后不可恢复。',
    statuses: {
      DRAFT: '草稿',
      PUBLISHED: '已发布',
      ARCHIVED: '已归档',
    },
    executionModes: {
      IN_HOUSE: '本厂执行',
      OUTSOURCE_ALLOWED: '允许委外',
      OUTSOURCE_REQUIRED: '必须委外',
    },
    qualityGates: {
      NONE: '无需检验',
      OPTIONAL: '可选检验',
      REQUIRED: '必须检验',
    },
    steps: {
      title: '路线步骤',
      description:
        '步骤引用产线脑图中的岗位能力和工序，不在此处重复维护工序档案。',
      add: '新增步骤',
      empty: '还没有路线步骤，可以先新增第一道工序。',
      noCapabilities:
        '产线脑图中还没有可用的岗位能力，请先完成产线和工序配置。',
      capability: '选择岗位能力',
      process: '选择工序',
      noProcess: '该岗位能力暂无工序',
      minutes: '预计分钟',
      transfer: '完成后需要转移',
    },
    dialog: {
      createTitle: '新增生产路线',
      editTitle: '编辑生产路线',
      description: '路线是后续生产执行和委外任务的工序顺序主数据。',
      save: '保存路线',
    },
    fields: {
      name: '路线名称',
      namePlaceholder: '例如：碳纤维车圈标准路线',
      code: '路线编号',
      status: '状态',
      productName: '产品/型号',
      productPlaceholder: '可先填写型号名称，产品主数据接入后再绑定 ID',
      description: '说明',
    },
    toasts: {
      saved: '生产路线已保存',
      saveFailed: '生产路线保存失败',
      deleted: '生产路线已删除',
      deleteFailed: '生产路线删除失败',
    },
  },
}
