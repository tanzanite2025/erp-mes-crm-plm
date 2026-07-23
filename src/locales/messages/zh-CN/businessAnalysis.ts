export const businessAnalysis = {
  moduleTitle: '经营分析',
  moduleDescription: '统一承载生产、品质、销售与客户的跨域只读分析能力。',
  tabs: {
    overview: '分析总览',
    productionCapacity: '月产能分析',
    productionLoad: '产能负荷',
    productionEfficiency: '生产效率',
    scrap: '报废分析',
    defectTrend: '不良趋势',
    orders: '订单分析',
    customers: '客户分析',
  },
  overview: {
    title: '经营分析域已建立',
    description:
      '这里统一承载跨生产、品质、销售与客户的数据分析，不修改任何业务事实。',
    ownershipTitle: '数据所有权边界',
    ownershipDescription:
      '生产、销售、品质模块继续维护各自事实；经营分析只负责聚合、比较、趋势与钻取。',
    productionTitle: '生产分析',
    productionDescription: '月产能、产能负荷和生产效率将从生产事实链路汇总。',
    qualityTitle: '品质分析',
    qualityDescription: '报废和不良趋势必须读取品质域确认的数据。',
    customerTitle: '客户与销售',
    customerDescription: '订单分析与客户分析统一归入经营分析入口。',
    nextStepTitle: '当前实施阶段',
    nextStepDescription:
      '第一阶段先完成统一路由和菜单归属；月产能和报废统计待数据契约完成后接入。',
  },
  productionCapacity: {
    title: '月产能分析',
    description:
      '按月份、客户、产品型号和生产资源查看计划量、完工量、合格量与报废量。',
    status: '数据契约准备中',
    statusDescription:
      '当前已建立经营分析域入口，正式统计需要先固化完工事实、报废数量和跨域关联键。',
    plannedQuantity: '计划量',
    completedQuantity: '实际完工量',
    qualifiedQuantity: '合格量',
    scrapQuantity: '报废量',
    filtersTitle: '预留筛选条件',
    filters: '月份 / 客户 / 产品型号 / 生产线 / 计划状态',
    sourceTitle: '当前数据边界',
    sourceDescription:
      '生产计划和任务提供生产事实，销售订单提供客户维度，品质域提供报废事实；页面不会使用异常条数冒充报废数量。',
  },
  placeholder: {
    status: '分析页面承载位已建立',
    description:
      '该页面已纳入经营分析域，待对应领域数据契约与后端聚合接口完成后接入正式统计。',
  },
} as const
