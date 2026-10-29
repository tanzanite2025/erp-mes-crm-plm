import { productionMaterialIssuanceStartWorkflow } from './production-material-issuance-start-workflow'
import { productionMaterialIssuanceWarehouseHandling } from './production-material-issuance-warehouse-handling'

export const productionMaterialIssuance = {
  start: productionMaterialIssuanceStartWorkflow,
  warehouseHandling: productionMaterialIssuanceWarehouseHandling,
  title: '生产领料',
  description: '核对订单物料的已领与待领数量。',
  workspace: {
    referenceLinks: '领料相关页面',
    quantityHint:
      '净已领 = 累计已领 − 退料；还差为尚待领料，以仓库确认记录为准。',
    unknownQuantities: '需求依据待核对，暂不能判断应领和待领数量。',
    orderDetails: '查看配方、累计领退与超领明细',
    materialDetails: '展开累计领料、退料与超领明细',
    quantities: {
      required: '标准应领',
      netIssued: '净已领',
      remaining: '还差',
    },
  },
  availabilityTitle: '总体进度与原单领退分别核对',
  availabilityDescription:
    '上方统计全部有效订单行，包含未下发来源；下方原单保留完整历史。仓库确认后才计入已领、退料。缺少依据或读取失败不代表数量为 0；正式打印和消息尚未接入。',
  referenceActions: {
    requirements: '查看料号需求',
    inventory: '查询仓库库存',
  },
  documentList: {
    title: '单据追溯',
    description: '沿原单核对下发人、时间、订单行和冻结的 BOM 依据。',
    permissionRequired:
      '需要“生产领料：查看依据与单据”权限后才能读取单据。页面或指南阅读权限不包含这项权限。',
    statusFilter: '按单据状态筛选',
    allStatuses: '全部状态',
    dispatched: '已下发',
    withdrawn: '已撤回',
    refresh: '刷新单据',
    loading: '正在读取单据…',
    failed: '单据读取失败，请重试。',
    empty: '当前范围暂无正式领料单。',
    pagination: '第 {{page}} 页 · 共 {{count}} 张',
    previous: '上一页',
    next: '下一页',
    detailTitle: '冻结来源与配方',
    frozenHint:
      '以下是下发时保存的来源、重量及配方。原订单行号或当前 BOM 后续变化不会改写这里的历史依据；单据状态不代表已经领料。',
    withdrawalReason: '撤回原因',
  },
  sourceReview: {
    title: '生产领料依据核对',
    description:
      '按本次已选的全部订单行和 BOM 核对正式依据，展开查看成品重量及物料标准需求。核对完成后再确认下发。',
    action: '核对生产领料依据',
    loading: '正在核对…',
    limit: '每次最多核对 500 条订单明细，请缩小订单范围。',
    failed: '核对未完成。若来源或配方已变化，请重新核对 BOM 与领料前提。',
    success: '已核对 {{count}} 条来源。',
  },
  commands: {
    dispatchTitle: '下发正式领料单',
    dispatchScope:
      '将上述全部 {{count}} 条订单行下发至生产物料仓库。正式单据会冻结来源数量、BOM、成品重量及配方；此操作不代表已领料，不扣减库存。',
    confirmSources: '我已核对上述全部订单行、采用 BOM 与成品重量',
    dispatchAction: '确认下发领料单',
    submitting: '正在提交，请稍候…',
    retryOriginal: '按原请求重试',
    rejected:
      '本次操作未通过。请核对以下原因；依据变化时重新分析或读取原单，重试会沿用原请求。',
    unknownOutcome:
      '操作结果尚未确认。请按原请求重试，或到单据追溯核对；请勿把超时当作操作未发生。',
    dispatched: '领料单已下发：',
    originalAlreadyWithdrawn: '本次请求对应的原单已经撤回，未建立新单：',
    dispatchResultHint:
      '以下是原单保存的冻结依据。仓库可在“生产领退”中沿原单确认实际交接；下发不代表已发料或已通知。',
    withdrawTitle: '撤回领料单',
    withdrawHint:
      '仅可撤回尚无仓库执行事实的整张单据。撤回会释放订单行覆盖，原单和冻结依据继续保留；请填写原因并确认。',
    reason: '撤回原因',
    reasonTooLong: '撤回原因过长，请精简后再提交。',
    withdrawAction: '确认撤回整张领料单',
    withdrawn: '领料单已撤回，原单历史已保留。',
    cancel: '取消',
  },
  frozenSources: {
    quantity: '覆盖成品数量',
    weight: '成品重量 / 性能版本',
    unspecifiedVersion: '未指定性能版本',
    bom: 'BOM / 修订',
    owner: '配方归属 / 订单客户',
    customerOwned: '客户专供配方',
    internalOwned: '企业自有配方',
    recipe: '配方物料明细',
    standardUsage: '标准用量',
    required: '标准需求',
  },
  orderScope: {
    title: '订单范围与需求依据',
    description:
      '汇总待处理、排产中、生产中的全部有效订单，未下发的订单行也要纳入；切换查看方式沿用同一范围。完成、取消、关闭的订单退出当前统计，原单历史继续保留。',
    fields: {
      orders: '订单 / 订单行范围',
      warehouse: '生产供料仓库',
      basis: 'BOM / 修订依据',
      dispatch: '下发覆盖情况',
    },
    hint: '点击“发起领料”选择订单行、核对 BOM 与需求并下发；料号需求也可带入来源。这里同时核对总体和订单行进度；已下发采用冻结依据，来源缺失单独提示。',
  },
  views: {
    label: '生产领料查看方式',
    materials: '按物料汇总',
    orders: '按订单查看',
  },
  materials: {
    title: '物料待领汇总',
    description:
      '按物料查看已知需求的总体应领、已领、待领和超标准数量；按订单查看可继续核对具体来源。存在异常来源时，这里只代表已知部分。',
    headers: {
      material: '物料 / 单位',
      required: '标准应领',
      issued: '累计已领（含补料）',
      returned: '累计退料',
      netIssued: '净领料',
      remaining: '尚待领料',
      aboveStandard: '超标准领料',
    },
    progressHint:
      '总体待领按订单行分别计算后相加，超领单独显示；需求、库存缺口与包装换算沿用料号需求，这里不另建一套计算。',
  },
  orderProgress: {
    title: '订单行领料进度',
    description:
      '按订单、订单行查看各物料领了多少、还差多少，并追溯累计发料、退料和关联单据。',
    headers: {
      orderLine: '订单 / 行号 / 产品',
      dispatch: '下发情况',
      material: '物料 / 单位',
      required: '标准应领',
      netIssued: '净领料',
      remaining: '尚待领料',
      aboveStandard: '超标准领料',
    },
    allocationHint:
      '多个订单可以合并领料；仓库确认时保留每条订单行的领料归属，补料与退料沿原归属核对。领料归属不代表实际消耗。',
  },
  activeProgress: {
    loading: '正在核对全部有效订单与领退记录…',
    failed: '总体进度读取失败，请刷新重试。当前不能据此判断是否领齐。',
    refresh: '刷新总体进度',
    orderCount: '{{orders}} 个订单 / {{lines}} 条订单行',
    warehouse: '生产物料仓库（MATERIAL）',
    basisCount: '冻结配方 + 当前配方 / {{count}} 条依据异常',
    dispatchCount: '已下发 {{dispatched}} 条 / 未下发 {{undispatched}} 条',
    incomplete:
      '有 {{count}} 条订单行依据异常，数量仅为已知部分，不能据此判断全部领齐。',
    scopeExplanation: '统计范围与依据说明',
    emptyMaterials:
      '本页没有已知物料需求。若存在依据异常，请先核对异常订单行。',
    emptyOrders: '本页没有有效订单行。',
    sourceLines: '涉及 {{count}} 条订单行',
    undispatched: '未下发 · 当前配方预览',
    frozenBasis:
      '本行采用下发时冻结的配方与重量；可在下方单据追溯按原单号核对领退历史。',
    currentBasis:
      '本行尚未下发，采用当前生效的生产配方；此处预览不会保存 BOM 选择或创建领料单。',
    paginationLabel: '总体进度分页',
    pagination: '第 {{page}} 页 · 共 {{count}} 项',
  },
  movements: {
    title: '领退记录',
    description:
      '首次领料、后续补料和退料分别留痕，保留订单行归属、数量、时间、经办人及原因。',
    emptyTitle: '仓库确认记录待接入',
    emptyDescription:
      '提出领料、保存草稿或打印清单都不计入已领数量。仓库确认后，实际收发结果才进入这里。',
  },
  quantityHelp: {
    trigger: '查看生产领料数量口径',
    title: '这些数量分别代表什么',
    required: {
      title: '标准应领',
      description:
        '覆盖的成品数量 × 本次采用 BOM 的物料标准用量。配方标准用量已包含的损耗不重复计算。',
    },
    issued: {
      title: '累计已领',
      description:
        '仓库已正式确认的发料数量合计，包含首次领料和后续补料；待发申请不计入。',
    },
    returned: {
      title: '累计退料',
      description:
        '仓库已正式确认接收的退料数量合计。提出退料后，确认前不冲减净领料。',
    },
    netIssued: {
      title: '净领料',
      description:
        '累计已领 − 累计退料。按订单行保存领料归属，同物料同单位汇总，不代表实际消耗。',
    },
    remaining: {
      title: '尚待领料',
      description:
        '每条订单行按标准应领 − 净领料计算，最低为 0，再按物料汇总。某行超领不能抵消其他行待领；不直接等于采购缺口或现场余料。',
    },
    aboveStandard: {
      title: '超标准领料',
      description:
        '每条订单行按净领料 − 标准应领计算，最低为 0，再分别汇总。例如 A 行超领 20、B 行待领 40，应分别显示超标准 20、待领 40。',
    },
    supplement: {
      title: '领足后仍不够怎么办',
      description:
        '在原单上追加补料并记录原因；超出标准的部分保留差异，不覆盖原领料记录。实际消耗和现场余料需要另有事实依据。',
    },
  },
}
