export const quickActions = {
  drawer: {
    title: '快捷扫描',
    description: '按当前账号权限显示可直接进入的扫描动作。',
    emptyTitle: '暂无可用快捷动作',
    emptyDescription: '当前账号没有被授权的快捷扫描入口。',
    close: '收起快捷入口',
  },
  handle: {
    label: '快捷扫描',
    ariaLabel: '打开快捷扫描入口',
  },
  actions: {
    warehouseInboundScan: {
      title: '入库扫描',
      description: '直接进入仓库入库扫描模式，快速完成收货登记。',
    },
    warehouseShipmentScan: {
      title: '出货扫描',
      description: '直接进入仓库出货扫描模式，快速完成出库处理。',
    },
    warehouseStocktakeScan: {
      title: '盘点扫描',
      description: '直接进入 PDA 盘点扫描模式。',
    },
  },
} as const
