export const productionMaterialRequirementBomBasisReview = {
  title: '核对本次采用的 BOM 与性能版本',
  scope:
    '库存范围：生产物料仓库；扣除有效占用。各分组共用同一份库存，本组可用量仅用于分析，不会预占或扣库存。',
  incomplete:
    '本次需求依据不完整。请先修复订单行的 MBOM 分支或配方数据；完整结果生成前暂停打印和导出。',
  sources: '查看 {{count}} 条订单行的配方依据',
  unspecifiedVersion: '未指定性能版本',
  recalculate: '重新分析',
  issues: {
    DUPLICATE_EFFECTIVE_MBOM:
      '该订单行已选 MBOM 分支存在多份当前有效的已发布记录，属于数据完整性异常。请修复重复发布记录后重新分析。',
    MISSING_BOM: '订单行已选分支下没有当前生效的已发布生产 BOM，请先维护该分支配方。',
    MISSING_MBOM_BRANCH: '订单行尚未绑定有效 MBOM 分支，请先在销售订单中选择产品生产组合。',
    INVALID_SOURCE_LINE: '订单行的身份、产品或成品数量不完整，请先核对订单。',
    INVALID_MATERIAL: '配方包含不存在或已停用的物料，请先修复 BOM。',
    MATERIAL_UNIT_MISMATCH:
      '配方单位与物料主单位不一致，系统不会自动换算，请先统一单位。',
    INVALID_STANDARD_USAGE: '配方行身份或标准用量无效，请先核对 BOM。',
    EMPTY_BOM_REQUIREMENT: '配方没有有效的正向物料用量，请先维护 BOM。',
  },
}
