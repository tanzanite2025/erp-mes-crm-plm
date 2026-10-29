export const productionMaterialIssuanceWarehouseHandling = {
  dialog: {
    titles: {
      issue: '按指南办理发料',
      supplement: '按指南办理补料',
      return: '按指南办理退料',
      review: '选择原单并查看领退记录',
      recovery: '核对原单与恢复未完成交接',
    },
    continueReadingHint:
      '在下方选择原领料单并办理。本次操作会保存真实交接；关闭弹窗后继续阅读，已选原单会保留。',
    reviewHint:
      '在下方选择原领料单，核对冻结依据、数量进度及交接记录。关闭弹窗后继续阅读，已选原单会保留。',
    noUnfinishedRequest:
      '当前会话没有待恢复的交接请求。请先核对下方已确认记录；如确需办理下一笔，请关闭弹窗，从对应发料、补料或退料步骤进入。',
  },
  pageTitle: '生产领退',
  pageDescription:
    '沿生产下发的原领料单办理发料、补料与退料，并核对每条订单行的数量和交接记录。',
  open: '展开仓库领退与单据进度',
  title: '仓库领退与单据进度',
  documentScope:
    '以下数量仅对应当前领料单覆盖的订单行，不代表全部订单的总体进度。',
  refreshDocument: '刷新原单进度',
  version: '原单版本 {{version}}',
  confirmed: '仓库已确认，原单更新至版本 {{version}}。',
  startAnother: '重新核对后办理下一次',
  loading: '正在读取原单领退进度…',
  failed: '领退进度读取失败，请重试。',
  confirmTitle: '办理本次仓库交接',
  oneBatchHint:
    '每次办理一种物料的一个批次。需要多个批次或分次领料时，可在原单继续办理，历史会逐次保留。',
  action: '办理类型',
  actions: { issue: '发料', supplement: '补料', return: '退料' },
  material: '原单物料',
  chooseMaterial: '请选择原单物料',
  materialStatus:
    '本单标准应领 {{standard}} {{unit}} · 尚待领料 {{remaining}} {{unit}} · 超标准 {{excess}} {{unit}}',
  originalAllocation: '原发料分配',
  chooseOriginal: '请选择本次退回对应的原发料分配',
  noBatch: '无批次号',
  returnable: '可退 {{quantity}} {{unit}}',
  loadingBatches: '正在读取生产物料仓库的批次可领量…',
  batchFailed: '批次读取失败，不能确认发料。',
  batch: '生产物料仓库批次',
  chooseBatch: '请选择本次交接的批次',
  available: '可领 {{quantity}} {{unit}}',
  refresh: '刷新批次',
  batchBalance:
    '库存 {{stock}} {{unit}} · 已预留 {{reserved}} {{unit}} · 可领 {{available}} {{unit}}',
  noStock: '该物料暂无可领库存，请核对入库和预留情况。',
  orderLine: '补料归属订单行',
  chooseLine: '请选择明确的订单行归属',
  quantity: '本次数量（{{unit}}）',
  suggest: '按原单生成分配建议',
  allocationHint: '请核对各订单行的本次分配数量，分配合计应等于本次数量。',
  allocationQuantity: '{{line}} 的本次分配数量',
  reasonOptional: '交接备注（可选）',
  reasonRequired: '原因（必填）',
  confirmChecklist:
    '我已核对本次物料、批次、数量及订单行归属，并确认实际交接一致',
  confirmActions: {
    issue: '确认本次发料',
    supplement: '确认本次补料',
    return: '确认接收退料',
  },
  custodyHint:
    '发料与补料从生产物料仓库移交至生产待耗用物料，退料按原分配和原成本退回。交接不等于生产耗用，也不属于产品出货。',
  readonly:
    '当前账号可查看记录；办理领退还需仓储模块及对应的发料、补料或退料权限。',
  history: '已确认交接记录',
  noMovements: '本单尚无仓库确认的交接记录。下发不代表已经领料。',
  quantities: {
    standardQty: '标准应领',
    issuedQty: '累计已领',
    returnedQty: '累计退料',
    netQty: '净领料',
    remainingQty: '尚待领料',
    excessQty: '超标准领料',
  },
}
