export const scanPlatform = {
  panel: {
    title: '扫码能力模组',
    description: '这里展示当前扫码能力平台已经拆出的功能模组，以及每个模组更适合挂在哪一类宿主页。',
    moduleCount: '{{count}} 个模组',
    host: '宿主页',
    mode: '模式',
    entryPath: '入口路径',
    permission: '权限',
    viewOnly: '仅查看',
    addToHomeScreenFallback: '放到桌面',
    modes: {
      submit: '提交',
      view: '查看',
    },
    hostKinds: {
      embeddedDialog: '嵌入式弹窗',
      standalonePage: '独立页面',
    },
  },
  modules: {
    logisticsInbound: {
      name: '进货物流扫描',
      description: '用于来料收货、采购物流绑定与入库前校验的扫码插件。',
      hostLabel: '采购物流弹窗',
      statusLabel: '可接入',
      targetLabel: '采购物流宿主页',
      openLabel: '打开宿主页',
      notes: [
        '接入流程已经打通，可以直接挂到现有采购物流弹窗。',
        '建议保持宿主表单为主，扫码仅回填物流单号、承运商和提交草稿。',
      ],
    },
    wheelTrace: {
      name: '车圈追溯',
      description: '用于查询车圈当前层级锚点、历史轨迹与最近处理记录的扫码插件。',
      hostLabel: '独立追溯页',
      statusLabel: '真实接口',
      targetLabel: '车圈追溯查询',
      openLabel: '打开独立页',
      addToHomeScreenLabel: '放到桌面',
      notes: [
        '已接入真实后端查询接口，当前返回条码解析、产品匹配和生产拓扑锚点。',
        '后续补真实过站记录时，只需要扩后端数据源，不需要重做独立页壳子。',
      ],
    },
  },
} as const
