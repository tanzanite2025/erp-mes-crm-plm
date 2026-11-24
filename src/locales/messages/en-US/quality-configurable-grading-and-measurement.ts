export const qualityConfigurableGrading = {
  title: 'Custom Grades',
  titleForItem: '{{itemName}} · Grade Rules',
  unnamedItem: 'Current Inspection Item',
  add: 'Add Grade',
  remove: 'Remove Grade',
  level: 'Grade Name',
  lowerTolerance: 'Allowed Lower Deviation',
  upperTolerance: 'Allowed Upper Deviation',
  result: 'Grade Result',
  pass: 'Pass',
  fail: 'Fail',
  description:
    'Order grades from strict to broad, increasing both deviation limits at each level. The first matching grade applies, including its boundary. Enter nonnegative lower and upper deviations; they may differ. Values outside every grade fail. Record rework, concession or scrap separately.',
}
export const qualityMeasurementSubmission = {
  title: 'Measurements and Grading',
  start: 'Record Measurements',
  history: 'View Measurements',
  description:
    'Select a published standard for the product and enter measurements. The server calculates grades and results and preserves the standard version and rules.',
  standard: 'Published Standard',
  search: 'Search standard code or name',
  batch: 'Inspection Batch',
  remarks: 'Inspection Notes',
  value: 'Measured Value',
  submit: 'Save and Evaluate',
  close: 'Close',
  loading: 'Loading standards…',
  loadFailed: 'Unable to load standards. Please retry.',
  retry: 'Retry',
  empty: 'No matching published standards. Publish a standard first.',
  select: 'Select a standard',
  required: 'Required',
  optional: 'Optional',
  version: 'Standard Version',
  noSnapshot:
    'This historical record has no rule snapshot; its original evaluation basis cannot be reconstructed.',
  noEvaluation: 'This historical record has no item measurement evaluations.',
  invalid:
    'Enter a batch and all required measurements, and check the numeric values.',
  unsupported:
    'This standard contains rules that cannot be evaluated automatically. Revise them to numeric deviation grades first.',
  outside: 'Outside all grades',
  result: 'Inspection Result',
  disposition:
    'Failed measurements were saved. Record rework, concession or scrap in abnormality disposition.',
  source: 'Complete outsource tasks through outsource inspection.',
  remaining: 'Next Page',
  previous: 'Previous Page',
}
