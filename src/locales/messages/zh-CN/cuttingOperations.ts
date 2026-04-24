export const cuttingOperations = {
  tabs: {
    cuttingIssuance: '裁纱下达',
    sizeInventory: '裁纱尺寸库存',
  },
  sizeInventory: {
    header: {
      title: '裁纱尺寸库存',
      description: '尺寸主数据直接读取裁切尺寸库，库存数量字段待后续库存引擎接入后自动扣减。',
    },
    metrics: {
      total: '尺寸总数',
      active: '启用尺寸',
      usageTypes: '用途类型数',
    },
    table: {
      title: '尺寸库存台账（尺寸来自裁切尺寸库）',
      hint: '当前仅展示尺寸主数据来源，不写入模拟库存。',
      loading: '正在加载尺寸库数据...',
      empty: '暂无可用尺寸，请先在“裁切尺寸库”维护尺寸单元。',
      pendingInventory: '待库存引擎接入',
      error: '加载尺寸库存失败：{{message}}',
      columns: {
        code: '尺寸编号',
        name: '尺寸名称',
        size: '尺寸表达式',
        usage: '用途',
        sourceStatus: '来源状态',
        inventoryQty: '库存数量',
      },
    },
    status: {
      Active: '启用',
      Inactive: '停用',
      Archived: '归档',
    },
  },
} as const
