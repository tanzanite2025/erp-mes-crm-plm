export const tradingSalesOrder = {
  tabs: {
    title: "销售订单管理",
    list: "订单台账",
    detail: "订单详情"
  },
  notifications: {
    pendingClaimTitle: "待认领销售订单",
    pendingClaimContent: "来自客户 {{customerName}} 的订单 {{orderNo}} 已提交，正在等待销售人员认领。"
  },
  toasts: {
    saved: "销售订单保存成功",
    duplicateEvidence: "检测到相似凭据",
    duplicateEvidenceDetail: "系统通过感知哈希识别到该凭据此前已上传过。",
    voided: "销售订单已作废",
    claimed: "订单明细行认领成功",
    saveFailed: "保存销售订单失败"
  },
  errors: {
    missingActor: "缺少有效的交易操作者",
    lineProductMissing: "订单第 {{lineNo}} 行未绑定产品，无法保存订单行快照。"
  },
  detail: {
    backToList: "返回台账",
    activities: "操作历史",
    summary: "订单概览",
    items: "明细项",
    evidenceTitle: "订单凭据",
    evidencePlaceholder: "暂无凭据图片",
    evidenceHint: "支持多张截图上传，点击可管理（最大 10MB）",
    evidenceSortHint: "拖动左上角手柄可调整打印与展示顺序",
    evidenceNoteLabel: "图片备注",
    evidenceNotePlaceholder: "例如：客户签字页、邮件截图、包装外观",
    info: {
      orderNo: "订单编号",
      customerName: "客户单位",
      paymentMethod: "支付方式",
      paymentTerm: "结算方式"
    }
  },
  headerFields: {
    paymentCurrency: "支付币种",
    paymentCurrencyPlaceholder: "选择支付币种",
    paymentMethod: "支付方式",
    paymentMethodPlaceholder: "选择支付方式",
    paymentTerm: "结算方式",
    paymentTermPlaceholder: "选择结算方式"
  },
  packagingPreview: {
    title: "包装预览",
    loading: "正在计算订单装箱预览...",
    empty: "当前订单暂无可展示的包装预览",
    unknownProduct: "未识别产品",
    noMatchedProfiles: "当前产品未匹配到可用包装定义",
    warningTitle: "包装告警",
    actionSlotHint: "后续可在此挂接缺料提醒、账号通知、微信触达等动作",
    actionSlotReserved: "动作扩展位预留",
    lineQuantity: "订单数量：{{qty}} {{uom}}",
    lineRemainder: "余数",
    lineProfiles: "匹配箱规",
    lineBoxCount: "{{count}} 箱",
    linePackedQuantity: "已装数量：{{qty}}",
    lineVolume: "总体积：{{value}}",
    lineGrossWeightValue: "总毛重：{{value}}",
    warnings: {
      missingProductBinding: "该订单行未绑定产品，无法匹配包装定义",
      noMatchedProfiles: "当前产品未匹配到包装定义",
      noProfilesProvided: "当前没有可用于计算的包装定义",
      inconsistentDimensionUnits: "匹配到的包装定义尺寸单位不一致，汇总结果仅供参考",
      inconsistentWeightUnits: "匹配到的包装定义重量单位不一致，汇总结果仅供参考",
      remainingQuantity: "当前包装定义无法将数量完全整除，仍有剩余未装数量",
      invalidCapacity: "存在无效装箱容量的包装定义，已在计算中忽略"
    },
    summary: {
      boxes: "总箱数",
      volume: "总体积",
      grossWeight: "总毛重",
      packagedLines: "已可预估行数",
      unpackagedLines: "未匹配行数",
      warnings: "告警数",
      loadingInline: "包装摘要加载中",
      error: "包装摘要异常"
    }
  },
  footer: {
    totalQty: "订单总件数",
    totalAmount: "预计总金额"
  },
  print: {
    templatePending: "PDF 打印模板正在对接中...",
    printShipment: "打印发货清单"
  },
  fileUploader: {
    upload: "选择图片上传",
    toasts: {
      maxSizeExceeded: "文件体积超出限制（最大 {{max}}MB）",
      saveFailed: "图片上传失败"
    }
  },
  master: {
    fulfillmentCalculatedInUI: "履约进度由前端实时聚合预览",
    filters: {
      status: "状态",
      allStatuses: "全部状态",
      paymentMethod: "支付方式",
      paymentTerm: "结算方式",
      allPaymentMethods: "全部支付方式",
      allPaymentTerms: "全部结算方式"
    },
    errors: {
      loadFailed: "销售订单数据加载失败",
      retry: "重试加载",
      authRequired: "当前会话无有效认证，请重新登录后再试。",
      circuitBreaker: "请求已被短路保护拦截，请稍后再试。",
      timeout: "请求超时，请检查当前网络链路。",
      network: "网络请求失败，请确认前后端链路是否可达。",
      invalidResponse: "后端返回的数据格式不符合预期。",
      unknown: "请求失败，请查看下方真实错误信息。",
      reasonPrefix: "原因："
    },
    columns: {
      paymentMethod: "支付方式",
      paymentTerm: "结算方式"
    }
  }
} as const
