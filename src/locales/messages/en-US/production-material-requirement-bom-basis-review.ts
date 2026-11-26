export const productionMaterialRequirementBomBasisReview = {
  title: 'Review the BOM and performance version for this analysis',
  scope:
    'Stock scope: Production Material Warehouse, excluding active reservations. Groups share one stock pool. Group allocation is an analysis preview and does not reserve or deduct inventory.',
  incomplete:
    'The requirement basis is incomplete. Correct the MBOM branch or recipe data on the affected order lines, then analyze again. Printing and export remain unavailable until the full result is ready.',
  sources: 'Review recipe bases for {{count}} order lines',
  unspecifiedVersion: 'Unspecified performance version',
  recalculate: 'Analyze again',
  issues: {
    DUPLICATE_EFFECTIVE_MBOM:
      'Multiple currently effective released MBOM records exist in the selected branch. This is a data integrity error. Correct the duplicate publications before analyzing again.',
    MISSING_BOM:
      'No currently effective released manufacturing BOM exists in the branch selected on this order line. Maintain that branch recipe first.',
    MISSING_MBOM_BRANCH:
      'This order line has no valid MBOM branch. Select its product branch on the sales order first.',
    INVALID_SOURCE_LINE:
      'The source identity, product or finished quantity is invalid. Review the order first.',
    INVALID_MATERIAL:
      'The recipe contains an unavailable or inactive material. Correct the BOM first.',
    MATERIAL_UNIT_MISMATCH:
      'The recipe unit differs from the material base unit. Align units first; automatic conversion is not applied.',
    INVALID_STANDARD_USAGE:
      'A recipe line identity or standard usage is invalid. Review the BOM first.',
    EMPTY_BOM_REQUIREMENT:
      'The recipe has no positive material requirement. Maintain the BOM first.',
  },
}
