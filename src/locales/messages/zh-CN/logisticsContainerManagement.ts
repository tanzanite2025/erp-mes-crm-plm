export const logisticsContainerManagement = {
  tabs: {
    specs: '货柜规格',
  },
  title: '货柜管理',
  description:
    '内置常见海运货柜的内部空间、门洞、容积和载重数据，先作为物流中心独立三级域内的只读装载参考。',
  builtinBadge: '内置规格',
  unavailable: '不适用',
  boundaryTitle: '独立货柜域',
  boundaryDescription:
    '货柜管理是物流中心下独立三级域，不属于车型匹配，也不挂在物流配置 TAB 内；这里先沉淀常见货柜的标准空间数据，不接外部接口，不承担承运商报价或发货单据联动。',
  summary: {
    total: '规格数量',
    totalHint: '当前内置常见干货柜、冷藏柜、开顶柜和框架柜。',
    largestVolume: '最大建议容积',
    largestVolumeHint: '按内部装载建议容积做初筛，不等于最终可装满体积。',
    largestPayload: '最大载重',
    largestPayloadHint: '仅用于内部预选，最终以承运渠道和设备确认为准。',
    special: '特殊柜型',
    specialHint: '包含冷藏、开顶和框架柜，避免和普通干货柜混算。',
  },
  metrics: {
    internalDimensions: '内部尺寸',
    externalDimensions: '外部尺寸',
    doorOpening: '门洞尺寸',
    nominalVolume: '标称容积',
    usableVolume: '建议可用容积',
    maxPayload: '最大载重',
    tareWeight: '皮重',
    maxGrossWeight: '最大总重',
    useCases: '常见用途',
    loadPlanningNotes: '装载提示',
    usableRate: '建议率',
  },
} as const
