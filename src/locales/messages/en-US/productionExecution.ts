export const productionExecution = {
  page: {
    title: 'Production Execution',
    description:
      'Scan a product barcode, review its current process, then confirm start, completion and advancement, hold, or rework.',
  },
  form: {
    title: 'Scan Execution',
    ready: 'Ready to submit',
  },
  capture: {
    manual: 'Manual input',
    camera: 'Camera scan',
    usb: 'USB Scanner',
  },
  fields: {
    submittedBy: 'Submitted by',
    captureMode: 'Capture source',
    productBarcode: 'Product barcode',
    action: 'Operation to perform',
    route: 'Production route',
    currentStep: 'Process being handled',
    reworkTarget: 'Rework target',
    executionLot: 'Execution lot',
    result: 'Execution result',
    notes: 'Notes',
    fromHolderType: 'From holder type',
    fromHolderId: 'From holder',
    toHolderType: 'To holder type',
    toHolderId: 'To holder',
  },
  actions: {
    START: 'Start process',
    COMPLETE: 'Complete and advance',
    HOLD: 'Pause process',
    REWORK: 'Send for rework',
    execute: 'Execute scan',
  },
  sources: {
    WEB: 'Web',
    USB: 'USB',
    PDA: 'PDA',
  },
  placeholders: {
    productBarcode: 'Scan the barcode on the product label',
    route: 'Select a route for the first start',
    currentStep: 'The first start defaults to the first route process',
    reworkTarget: 'Select a rework target process',
    executionLot: 'Optional',
    result: 'Optional, e.g. PASS',
    notes: 'Optional',
    holderType: 'e.g. INTERNAL, PARTNER',
    holderId: 'Enter holder ID',
  },
  advanced: {
    title: 'Record a physical handover with this operation (optional)',
  },
  result: {
    title: 'Latest confirmed operation',
    empty:
      'After confirmation, review the recorded action, the product’s current process, and route advancement or handover records here.',
    failed: 'Scan execution failed',
    operation: 'Operation',
    barcodeState: 'Barcode state',
    route: 'Current route',
    currentProcess: 'Process after the operation',
    progress: 'Route progress',
    executedStep: 'Process handled',
    nextStep: 'Next process',
    routeCompleted: 'Route completed',
    transferEvents: 'Route advancement and physical handovers',
    noTransfers: 'No transfer events were created.',
    yes: 'Yes',
    no: 'No',
  },
  errorKinds: {
    validation: 'Validation',
    forbidden: 'Permission denied',
    conflict: 'State conflict',
    network: 'Network error',
    timeout: 'Timeout',
    server: 'Server error',
    unknown: 'Unknown error',
  },
  validation: {
    barcode: 'Scan or enter a product barcode first.',
    startRoute: 'Select a production route before starting a process.',
    reworkTarget: 'Select a target route process for rework.',
  },
  noExecutePermission: 'The current account cannot execute production scans.',
  actionSummaries: {
    START: 'Start work and stay at this process.',
    COMPLETE: 'Finish this process and advance to the next.',
    HOLD: 'Pause work and keep the current process.',
    REWORK: 'Choose a process to receive the rework.',
  },
  actionDescriptions: {
    START:
      'Record the start of this process. Choose a route for the first start. The product remains at this process.',
    COMPLETE:
      'Confirm that this process is finished and advance in route order. The next process still needs to be started. Completing the last process finishes the route.',
    HOLD: 'Pause the current process and keep the product at this process.',
    REWORK:
      'Mark the product for rework and move it to the explicitly selected rework process.',
  },
  confirmActions: {
    START: 'Confirm process start',
    COMPLETE: 'Confirm completion and advance',
    HOLD: 'Confirm process hold',
    REWORK: 'Confirm rework destination',
  },
  statuses: {
    NOT_STARTED: 'Awaiting start',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Completed',
    HOLD: 'On hold',
    REWORK: 'Awaiting rework',
  },
  workflow: {
    chooseAction: '1. Choose the operation',
    scopeTitle:
      'Scanning, advancement, dispatch and physical handover explained',
    scopeDescription:
      'Scan the barcode on a product label to record that product’s process execution. Advancement moves a finished product process to the next process in its route. Dispatch assigns tasks and people; this page has no dispatch action. Physical handovers record the sending and receiving holders separately from route advancement.',
    scanProduct: '2. Scan the product and read its current process',
    readBarcode: 'Read current product process',
    reading: 'Reading the product’s current process…',
    readFailed:
      'Could not read the current process. Read it again before confirming an operation.',
    scanHint:
      'Scanning or pressing Enter reads the state. Review it before confirming the operation.',
    reviewContext: 'Route and process details',
    previewTitle: '3. Review the action and process destination',
    previewEmpty:
      'Scan the product barcode, or enter it and choose Read, to see its current process and review the selected action.',
    beforeAction: 'Process being handled',
    afterAction: 'After confirmation',
    chooseCurrentStep: 'Read or select a process',
    chooseReworkTarget: 'Choose the rework destination',
    nextFromRoute: 'Check the product’s actual route',
    routeEnd: 'Entire route completed',
    noRecordedState: 'No process execution has been recorded',
    firstStart:
      'This barcode has no recorded process execution. Choose Start process, select its production route, and review the first process.',
    recordedContextHint:
      'The product barcode supplies its recorded route and current process. Select a separate destination for rework.',
    reviewBeforeSubmit:
      'Read the current product process, review the details, then confirm the operation.',
    optionalDetails: 'Add a lot, result or notes (optional)',
    custodyHint:
      'Fill this in when a physical handover accompanies this process operation. The sending and receiving holders record custody; process advancement still follows the production route.',
    custodyAdded:
      'Confirmation will also record the physical handover entered here.',
    custodyRecorded:
      'The sending and receiving holders were recorded with this operation.',
    routeAdvanceEvent: 'Process advancement',
    reworkTransferEvent: 'Transfer to rework process',
    custodyTransferEvent: 'Physical custody handover',
    confirmedRouteEnd: 'Process finished; the entire route is complete',
    confirmedAdvance:
      'Operation confirmed; the product moved to a subsequent process',
    confirmedRework:
      'Rework confirmed; the product moved to the selected rework process',
    confirmedOperation: 'Process operation recorded',
    nextNeedsStart:
      'The product is awaiting start at the next process. Choose Start process when work begins there.',
    unknownProcess: 'Process name unavailable',
    unknownRoute: 'Route name unavailable',
    unknownStatus: 'State needs review',
    routesFailed:
      'Could not read the production routes. Refresh and review the route and process.',
  },
  toasts: {
    executed: 'Production scan execution recorded.',
    failed: 'Production scan execution failed. See the result panel.',
  },
} as const
