export const productionMaterialRequirementBomBasisReview = {
  title: '核对本次采用的 BOM 与性能版本',
  scope:
    '库存范围：生产物料仓库；扣除有效占用。各分组共用同一份库存，本组可用量仅用于分析，不会预占或扣库存。',
  incomplete:
    '本次需求依据尚未全部确认。请选择具体 BOM 或修复下方问题后重新分析；完整结果生成前暂停打印和导出。',
  sources: '查看 {{count}} 条订单行的配方依据',
  chooseBom: '请选择本次采用的 BOM',
  unspecifiedVersion: '未指定性能版本',
  recalculate: '按当前选择重新分析',
  issues: {
    BOM_SELECTION_REQUIRED:
      '存在多份适用的已发布生产 BOM，请明确选择性能版本。',
    BOM_SELECTION_CHANGED: '上次选择的 BOM 已不适用，请重新选择或修复配方。',
    MISSING_BOM: '没有当前生效且符合客户归属的已发布生产 BOM，请先维护配方。',
    INVALID_SOURCE_LINE: '订单行的身份、产品或成品数量不完整，请先核对订单。',
    INVALID_MATERIAL: '配方包含不存在或已停用的物料，请先修复 BOM。',
    MATERIAL_UNIT_MISMATCH:
      '配方单位与物料主单位不一致，系统不会自动换算，请先统一单位。',
    INVALID_STANDARD_USAGE: '配方行身份或标准用量无效，请先核对 BOM。',
    EMPTY_BOM_REQUIREMENT: '配方没有有效的正向物料用量，请先维护 BOM。',
  },
}
