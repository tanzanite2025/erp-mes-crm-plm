export const productionMaterialIssuanceWarehouseHandling = {
  dialog: {
    titles: {
      issue: 'Issue materials from the guide',
      supplement: 'Supplement materials from the guide',
      return: 'Return materials from the guide',
      review: 'Select an original and review handovers',
      recovery: 'Review and recover an unfinished handover',
    },
    continueReadingHint:
      'Select the original document below. Confirming an operation saves a real handover. Close this dialog to continue reading; your selected document is retained.',
    reviewHint:
      'Select the original document to check its frozen basis, quantities and handover history. Close this dialog to continue reading; your selected document is retained.',
    noUnfinishedRequest:
      'There is no unfinished handover to recover in this session. Check confirmed history below first. For a new operation, close this dialog and open the appropriate issue, supplement or return step.',
  },
  pageTitle: 'Production material handovers',
  pageDescription:
    'Issue, supplement, and return materials against the original production document, with quantities and handover history for each order line.',
  open: 'Expand warehouse handovers and document progress',
  title: 'Warehouse handovers and document progress',
  documentScope:
    'These quantities cover only the order lines on this document, not overall progress across all orders.',
  refreshDocument: 'Refresh document progress',
  version: 'Document version {{version}}',
  confirmed:
    'Warehouse confirmation saved. Document updated to version {{version}}.',
  startAnother: 'Review again and start another handover',
  loading: 'Loading document handover progress…',
  failed: 'Could not load handover progress. Please retry.',
  confirmTitle: 'Confirm this warehouse handover',
  oneBatchHint:
    'Handle one material and one batch at a time. Continue on the original document for additional batches or partial issues; each handover is retained.',
  action: 'Handover type',
  actions: { issue: 'Issue', supplement: 'Supplement', return: 'Return' },
  material: 'Document material',
  chooseMaterial: 'Select a document material',
  materialStatus:
    'Document standard {{standard}} {{unit}} · Remaining {{remaining}} {{unit}} · Above standard {{excess}} {{unit}}',
  originalAllocation: 'Original issue allocation',
  chooseOriginal: 'Select the original issue allocation being returned',
  noBatch: 'No batch number',
  returnable: 'Returnable {{quantity}} {{unit}}',
  loadingBatches:
    'Loading available batches in the production material warehouse…',
  batchFailed: 'Could not load batches. Issue confirmation is unavailable.',
  batch: 'Production material warehouse batch',
  chooseBatch: 'Select the batch for this handover',
  available: 'Available {{quantity}} {{unit}}',
  refresh: 'Refresh batches',
  batchBalance:
    'Stock {{stock}} {{unit}} · Reserved {{reserved}} {{unit}} · Available {{available}} {{unit}}',
  noStock:
    'No available stock for this material. Check receipts and reservations.',
  orderLine: 'Order line receiving the supplement',
  chooseLine: 'Select the specific order line',
  quantity: 'Quantity ({{unit}})',
  suggest: 'Suggest allocations from the document',
  allocationHint:
    'Review the quantity assigned to each order line. Allocations must total the handover quantity.',
  allocationQuantity: 'Allocation quantity for {{line}}',
  reasonOptional: 'Handover note (optional)',
  reasonRequired: 'Reason (required)',
  confirmChecklist:
    'I have checked the material, batch, quantity, and order line allocations against the actual handover',
  confirmActions: {
    issue: 'Confirm issue',
    supplement: 'Confirm supplement',
    return: 'Confirm received return',
  },
  custodyHint:
    'Issues and supplements transfer materials to production pending consumption. Returns use the original allocation and cost. A handover does not record consumption or a product shipment.',
  readonly:
    'This account can read records. Handling requires warehouse access and the corresponding issue, supplement, or return permission.',
  history: 'Confirmed handover history',
  noMovements:
    'No warehouse-confirmed handovers on this document. Dispatch does not mean materials have been issued.',
  quantities: {
    standardQty: 'Standard required',
    issuedQty: 'Total issued',
    returnedQty: 'Total returned',
    netQty: 'Net issued',
    remainingQty: 'Remaining to issue',
    excessQty: 'Above standard',
  },
}
