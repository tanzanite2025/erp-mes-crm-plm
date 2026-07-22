export const toolingFurnaces = {
  tabs: {
    archive: '炉台档案',
    maintenance: '炉台维保',
  },
  archive: {
    title: '炉台档案管理',
    description: 'FURNACE_ASSET_ARCHIVE / 热处理设备主数据与状态台账',
    searchPlaceholder: '搜索炉台编号、名称或类型...',
  },
  maintenance: {
    title: '炉台维保',
    description: 'FURNACE_MAINTENANCE / 只显示炉台设备的维保记录与处理状态',
    filteredDescription:
      'FURNACE_MAINTENANCE / 当前仅显示所选炉台的维保记录与处理状态',
  },
  actions: {
    add: '新增炉台资产',
    viewMaintenance: '查看维保',
  },
  toast: {
    removed: '炉台已移除',
    updated: '炉台档案已更新',
    created: '新炉台已登记',
  },
  status: {
    idle: '空闲',
    heating: '运行中',
    cooling: '冷却中',
    maintenance: '维护中',
    fault: '故障',
    unknown: '未知',
  },
  card: {
    type: '类型',
    location: '位置',
    none: '无',
    tempLive: '实时温度',
    maxTemp: '上限 {{value}}°C',
    sensorOffline: '传感器离线',
  },
  stats: {
    totalUnits: '总炉台数',
    runningNow: '当前运行',
    live: '实时',
    maintenance: '维护中',
    faultAlert: '故障预警',
  },
  dialog: {
    title: {
      edit: '编辑炉台档案',
      create: '登记新炉台资产',
    },
    description: '录入设备编号、最高温度和所在区域信息',
    fields: {
      sn: '设备编号',
      name: '设备名称',
      type: '设备类型',
      location: '所在区域',
      maxTemp: '最高温度 (°C)',
      description: '备注说明',
    },
    placeholders: {
      sn: '例如 FURN-2024-01',
      name: '例如 1号真空炉',
      type: '例如 真空电炉',
      location: '例如 A区',
      description: '填写详细说明或历史记录...',
    },
    defaults: {
      type: '真空电炉',
    },
    validation: {
      snRequired: '请输入炉台编号',
      nameRequired: '请输入炉台名称',
      typeRequired: '请输入炉台类型',
      maxTempPositive: '最高温度必须大于 0',
    },
    actions: {
      cancel: '取消',
      save: '保存',
    },
  },
} as const
