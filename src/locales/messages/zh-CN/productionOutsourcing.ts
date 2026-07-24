export const productionOutsourcing = {
  layout: {
    tabs: {
      partners: '委外单位',
    },
  },
  partners: {
    title: '委外单位管理',
    description:
      '维护生产委外单位档案；供应商只作为可选引用，委外能力范围、任务、发出、回收与检验将在同一委外管理域内继续扩展。',
    searchPlaceholder: '搜索编码、名称、联系人或供应商',
    loadingFailed: '委外单位加载失败',
    empty: '暂无委外单位档案',
    noAddress: '未填写地址',
    noManagePermission: '当前账号没有委外单位管理权限',
    deleteConfirm: '确认删除委外单位「{{name}}」？',
    leadTimeValue: '{{count}} 天',
    actions: {
      add: '新增委外单位',
    },
    filters: {
      all: '全部状态',
    },
    stats: {
      total: '委外单位',
      active: '启用',
      onReview: '评审中',
      inactive: '停用',
    },
    statuses: {
      ACTIVE: '启用',
      ON_REVIEW: '评审中',
      INACTIVE: '停用',
    },
    qualityGrades: {
      NONE: '未评级',
      A: 'A级',
      B: 'B级',
      C: 'C级',
    },
    fields: {
      code: '委外编码',
      name: '委外单位名称',
      supplier: '关联供应商',
      status: '状态',
      qualityGrade: '质量等级',
      leadTimeDays: '标准交期',
      contactPerson: '联系人',
      contactPhone: '联系电话',
      email: '邮箱',
      address: '地址',
      settlementPolicy: '结算说明',
      notes: '备注',
    },
    placeholders: {
      name: '例如：阳极氧化外协厂',
      supplier: '不关联供应商',
    },
    dialog: {
      createTitle: '新增委外单位',
      editTitle: '编辑委外单位',
      description:
        '这里只维护委外单位档案，不维护工序范围和委外任务，避免主数据和执行链路混杂。',
    },
    validation: {
      required: '委外编码和委外单位名称不能为空',
    },
    toasts: {
      saved: '委外单位已保存',
      deleted: '委外单位已删除',
    },
  },
}
