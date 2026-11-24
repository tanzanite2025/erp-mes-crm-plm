export const qualityAbnormalityDisposal = {
  unitPlaceholder: 'Select a scrap unit',
  unitsEmpty: 'No active units available',
  unitsLoadFailed: 'Could not load units. Please retry.',
  unitUnavailable: 'This unit is unavailable. Select an active unit.',
  title: 'Abnormality disposition',
  description:
    'Confirm the disposition to close this abnormality. Source details and occurrence time come from the original inspection.',
  task: 'Source inspection',
  product: 'Product',
  batch: 'Batch',
  plan: 'Production plan',
  order: 'Order',
  occurredAt: 'Occurred at',
  method: 'Disposition',
  methodRequired: 'Select a disposition',
  SCRAP: 'Scrap',
  REWORK: 'Rework',
  CONCESSION: 'Accept under concession',
  quantity: 'Scrap quantity',
  unit: 'Scrap unit',
  quantityHint:
    'Enter the actual scrap quantity and its unit. Inspection readings and deviations are not scrap quantities.',
  scrapRequired:
    'Enter a scrap quantity greater than zero and select an active unit.',
  confirm: 'Confirm disposition and close',
  saving: 'Saving…',
  close: 'Close',
  closed: 'The disposition is confirmed and closed. It cannot be overwritten.',
  readOnly:
    'Your account has read access. Confirmation requires disposition permission.',
  unavailable: 'This abnormality cannot be closed in its current status.',
  outsourceLocked:
    'The outsource disposition has already affected inventory. Confirm its closure here; review the outsource workflow before making changes.',
  resolver: 'Resolved by',
  saveFailed:
    'The save did not complete. Your input is preserved. Review the error; if someone else resolved this record, close and refresh the list.',
  loadFailed: 'Could not load abnormalities. Please retry.',
}
