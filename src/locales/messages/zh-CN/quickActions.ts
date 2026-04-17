export const quickActions = {
  drawer: {
    title: '快捷扫描',
    description: '按当前账号权限显示可直接进入的扫描动作。',
    emptyTitle: '暂无可用快捷动作',
    emptyDescription: '当前账号没有被授权的快捷扫描入口。',
    close: '收起快捷入口',
    install: {
      action: '放到桌面',
      installed: '已在桌面',
      guide: '安装指引',
      success: '已触发安装提示，请按浏览器提示完成添加。',
      fallbackTitle: '请手动添加到主屏幕',
      compatibilityHint:
        '不同浏览器可能展示为桌面图标、长按快捷入口或应用内快捷动作，请以浏览器实际支持为准。',
    },
  },
  handle: {
    label: '快捷扫描',
    ariaLabel: '打开快捷扫描入口',
  },
  actions: {
    wheelTraceScan: {
      title: '车圈追溯',
      description:
        '直接打开摄像头扫描车圈一维码，识别后立即查询当前工段和轨迹。',
    },
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
    personalWorkbenchPhoto: {
      title: '个人拍照',
      description: '直接打开个人缓冲区拍照模式，现场拍照先落本地草稿。',
    },
    personalWorkbenchVideo: {
      title: '个人录视频',
      description: '直接打开个人缓冲区录视频模式，现场短视频先落本地草稿。',
    },
    personalWorkbenchBuffer: {
      title: '个人缓冲区',
      description: '直接进入你自己的个人记录缓冲区，查看和处理本地草稿。',
    },
  },
} as const
