export const productionMaterialIssuanceStartWorkflow = {
  action: '发起领料',
  startWithSelected: '按本次来源发起领料',
  title: '发起生产领料',
  steps: '选订单行 → 核对 BOM 与需求 → 下发领料单 → 仓库确认交接',
  permissionRequired:
    '发起领料需要生产业务访问、“查看依据与单据”和“下发”权限；请联系管理员配置。',
  wholeLineScope:
    '按整条订单明细备料，成品数量取自订单；每次可选择 1 至 500 行。下发后仓库可分次领料，实际数量在仓库办理时填写。',
  selectSources: '1. 选择备料订单行',
  search: '搜索订单号、客户或产品',
  searchAction: '搜索',
  loading: '正在读取领料来源…',
  loadFailed: '领料来源读取失败，请重试。',
  noSources:
    '当前搜索范围没有有效订单行。请调整搜索，或先由业务人员建立并确认订单。',
  alreadyDispatched: '已由有效领料单覆盖，请沿原单办理：',
  openWarehouseDocument: '打开原单办理',
  selected: '已选 {{count}} 条订单行',
  sourcePagination: '第 {{page}} 页 · 共 {{count}} 条订单行',
  selectionHint: '搜索和翻页保留已选来源；下发覆盖这里的全部已选行。',
  removeSource: '移除 {{order}} 第 {{line}} 行',
  remove: '移除',
  prepare: '2. 核对 BOM 与领料前提',
  bomScope:
    '核对全部已选订单行的适用 BOM、成品重量与标准需求。实际数量和库存批次在下发后由仓库填写。',
  bomIncomplete: '领料前提尚未齐全。请选择适用 BOM 或补齐下方资料后重新核对。',
  preparing: '正在核对 BOM 与前提…',
  prepareFailed: '领料准备未完成，请核对原因后重试。',
  selectionChanged:
    '来源或 BOM 选择已变化，请重新核对前提，再核对正式领料依据。',
  prerequisitesTitle: '请先补齐以下领料前提',
  prerequisites: {
    MISSING_PRODUCT: '来源产品已不可用，请由产品或订单维护人员核对。',
    MISSING_FINISHED_UNIT: '订单成品单位缺失，请由订单维护人员补齐。',
    INVALID_SOURCE_VERSION:
      '订单或采用的 BOM 缺少有效版本，请联系对应资料维护人员。',
    INVALID_FINISHED_WEIGHT:
      '采用的 BOM 需有大于 0 的成品重量及重量单位，请由 BOM 维护人员补齐并发布适用版本。',
  },
  repairHint:
    '配方及物料问题请由 BOM 或物料维护人员处理，订单问题请由订单维护人员处理；维护完成后重新核对。',
  openBom: '前往 BOM 配方',
  warehouseAction: '去仓库办理领料',
  warehouseUnavailable:
    '仓库办理前提尚未齐全，请联系管理员检查生产物料仓库和生产待耗用去向的启用状态及收发能力。',
  warehousePermissionHint:
    '请将正式单号交给有仓库权限的人员，在“仓储管理 → 生产领退”确认实际交接。',
  warehouseStartHint:
    '首次领料：由生产人员发起并下发正式领料单，再在这里选择原单办理。选择物料和库存批次后输入实际数量，核对订单行归属并确认；补料、退料继续沿原单办理。',
  guideQuickStart: '开始办理生产领料',
  guideQuickStartHint:
    '先准备有效订单行、适用的已发布 MBOM、成品重量和单位。点击后进入生产领料工作区，选择订单并逐步核对；实际领料数量由仓库填写。',
  statuses: { Pending: '待处理', Scheduling: '排产中', InProgress: '生产中' },
}
