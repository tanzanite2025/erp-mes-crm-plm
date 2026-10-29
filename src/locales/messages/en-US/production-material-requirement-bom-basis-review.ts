export const productionMaterialRequirementBomBasisReview = {
  title: 'Review the BOM and performance version for this analysis',
  scope:
    'Stock scope: Production Material Warehouse, excluding active reservations. Groups share one stock pool. Group allocation is an analysis preview and does not reserve or deduct inventory.',
  incomplete:
    'The requirement basis is incomplete. Select a BOM or resolve the issues below, then analyze again. Printing and export remain unavailable until the full result is ready.',
  sources: 'Review recipe bases for {{count}} order lines',
  chooseBom: 'Select the BOM for this analysis',
  unspecifiedVersion: 'Unspecified performance version',
  recalculate: 'Analyze with the current selection',
  issues: {
    BOM_SELECTION_REQUIRED:
      'Multiple released manufacturing BOMs apply. Select the intended performance version.',
    BOM_SELECTION_CHANGED:
      'The previous BOM no longer applies. Select an applicable recipe or correct the BOM.',
    MISSING_BOM:
      'No currently effective released manufacturing BOM matches this customer scope. Maintain the recipe first.',
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
