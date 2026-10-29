export const productionMaterialHandoversOperationGuide = {
  domainLabel: 'Warehouse handbook · Production handovers',
  title: 'How to handle production issues and returns',
  shortcutDescription:
    'Follow the original material document to issue batches, supplement, return and verify order-line allocations and handover history.',
  introduction:
    'For warehouse staff: open a dialog directly from each step to select the original document and issue, supplement, return or review materials. Close it to continue reading with the same document selected. Confirm one material and one batch at a time; continue on the original for additional batches.',
  mobileIntroduction:
    'Open a step dialog to handle materials, then close it to continue reading.',
  contentsLabel: 'Production handover guide contents',
  readingAreaLabel: 'Production handover guide reading area',
  openGuide: 'Read the production handover guide',
  actions: {
    review: 'Select an original and check records',
    issue: 'Open the original issue dialog',
    supplement: 'Open the original supplement dialog',
    return: 'Open the original return dialog',
    recovery: 'Check records and recover the original request',
    loading: 'Opening the original document dialog…',
    permissionRequired:
      'Direct handling requires warehouse page access, issuance view and the corresponding action permission.',
  },
  referenceTitle: 'Related pages',
  referenceDescription:
    'Links follow your page permissions. Handling also requires the corresponding action permission.',
  chapters: {
    preparation: {
      label: 'Before handling',
      shortLabel: 'Prepare',
      title: 'Find the dispatched document and verify this handover',
      description:
        'Open Warehouse management → Production handovers. After production dispatches a document, “Handle warehouse issue” also takes you directly to it.',
      noticeTitle:
        'Dispatch creates the formal document; it does not issue stock',
      noticeDescription:
        'If there is no document, authorized production staff must start, review and dispatch one in Production material issuance. Reference printing in Part requirements does not create it. Formal document printing and notifications are still pending.',
    },
    issue: {
      label: 'Issue in batches',
      shortLabel: 'Issue',
      title: 'Issue the actual quantity and verify each order-line allocation',
      description:
        'Ordinary issues cover outstanding standard requirements and can be handled in multiple batches or handovers. Enter only the quantity physically handed over this time.',
      noticeTitle:
        'Respect both batch availability and each line’s outstanding quantity',
      noticeDescription:
        'Allocations must total this handover quantity. An ordinary allocation cannot exceed that line’s outstanding quantity. Selecting a batch does not lock stock; availability is checked again at confirmation.',
    },
    supplement: {
      label: 'Supplement',
      shortLabel: 'Extra',
      title:
        'Record extra material against the original document with a reason',
      description:
        'Select Supplement on the original document to retain the actual extra handover and its reason for reviewing excess quantities.',
      noticeTitle: 'Assign each supplement to one explicit order line',
      noticeDescription:
        'Do not hide extra material by increasing ordinary allocations or changing order quantities or BOM standards. Supplements count toward issued quantity; review excess against net issued and standard required quantities.',
    },
    return: {
      label: 'Return to original',
      shortLabel: 'Return',
      title: 'Select the original allocation and confirm physical receipt',
      description:
        'Returns follow an original handover allocation, retaining its order line, material, batch and cost.',
      noticeTitle:
        'A return cannot exceed the selected allocation’s remaining returnable quantity',
      noticeDescription:
        'The same material may span several order lines, batches and handovers. Do not select a return using the material total alone. Handle multiple original allocations separately on the same document.',
    },
    reconciliation: {
      label: 'Progress and checks',
      shortLabel: 'Verify',
      title: 'Reconcile six quantities against confirmed handovers',
      description:
        'Warehouse handovers and document progress shows the order lines covered by this document. Confirmed handover history retains each actual operation.',
      noticeTitle:
        'Net issued is not consumption; outstanding is not the purchasing shortage',
      noticeDescription:
        'Issues and supplements transfer material from the production material warehouse into production custody pending consumption. Returns restore the original allocation and cost. A handover is neither consumption nor a product shipment.',
    },
    exceptions: {
      label: 'Problems and retries',
      shortLabel: 'Resolve',
      title: 'Check the original document and outcome before proceeding',
      description:
        'Use these steps for unavailable stock, changed versions, disabled confirmation or timeouts to avoid handling the same physical handover twice.',
      noticeTitle: 'A timeout does not prove that nothing happened',
      noticeDescription:
        'The current session retains an unfinished request. Explicitly retry the original request or check history. After refreshing the whole page or reopening the app, check the original document’s handovers first; do not immediately create an identical handover.',
    },
  },
  steps: {
    findDocument: {
      title: 'Select the original document in the formal document list',
      description:
        'Filter by dispatch status and click the document number to read its frozen details; the warehouse page opens the handover section. If missing, check filters, pagination and whether production dispatched it. Withdrawn documents retain history and cannot accept further handovers.',
    },
    checkDocument: {
      title: 'Check document number, order lines, material and unit',
      description:
        'Confirm the covered orders and products, frozen BOM, standard requirements and existing handovers. Enter quantities in the original document’s main unit; do not mix counts, weights or other units.',
    },
    checkPermissions: {
      title: 'Check account permissions and warehouse capabilities',
      description:
        'Reading documents requires production issuance view permission. Handling also requires the warehouse module and the specific issue, supplement or return action permission. Ask an administrator if you can only view. Resolve any warehouse capability warning shown on the page first.',
    },
    chooseIssueBatch: {
      title:
        'Select Issue, an original material and a production warehouse batch',
      description:
        'Batch options show availability. After selection, check stock, reserved and available quantities. Enter the actual positive issue quantity, no greater than the batch’s available quantity.',
    },
    allocateIssue: {
      title:
        'Generate allocation suggestions from the original and check each line',
      description:
        'Review the material’s order-line allocations and adjust them to match actual ownership. Even for shared material, specify how much each line receives. Zero lines do not participate; allocations must total this handover quantity. Generate suggestions again after changing that quantity.',
    },
    confirmIssue: {
      title:
        'Check the physical handover, tick the checklist and confirm this issue',
      description:
        'A handover note is optional. Check that material, batch, quantity and order lines match the physical handover, then tick the checklist and confirm. Verify the success message, confirmed history and updated progress. Opening a document or generating suggestions does not issue stock.',
    },
    continueIssue: {
      title: 'Continue on the original document for more batches or handovers',
      description:
        'After success, choose “Review again before the next handover”, load current progress and select the next material or batch. The same material from two batches needs two confirmations. Do not dispatch the same order line again.',
    },
    chooseSupplement: {
      title: 'Select Supplement, material and batch on the original document',
      description:
        'Use an original document material and verify its production warehouse batch availability. Handle one material and one batch at a time; do not create another issuance document to replace a supplement.',
    },
    assignSupplement: {
      title: 'Select the supplement order line, quantity and required reason',
      description:
        'Identify the order line receiving the extra material. Enter the actual positive quantity within batch availability and explain the reason. Handle different order lines separately.',
    },
    confirmSupplement: {
      title: 'Review and confirm this supplement',
      description:
        'Tick the physical handover checklist and confirm. After success, verify issued, net issued, excess and supplement history. Review again before handling the next handover.',
    },
    chooseOriginalAllocation: {
      title:
        'Select Return, the original material and original issue allocation',
      description:
        'Options show order line, batch and remaining returnable quantity. Select the original issue or supplement allocation corresponding to the physical return. Check ownership and do not substitute another batch.',
    },
    checkReturnQuantity: {
      title: 'Enter the quantity physically received and a return reason',
      description:
        'Use the original unit and a positive quantity within the selected allocation’s remaining returnable amount. A reason is required. If no allocation is available, check the document and material, whether the original issue was confirmed, and whether it was already fully returned.',
    },
    confirmReturn: {
      title: 'Check physical receipt and confirm receipt of the return',
      description:
        'Tick the checklist and confirm. Only success increases returned quantity and reduces net issued; issued quantity retains its historical total. Verify the return record and remaining returnable quantity before continuing.',
    },
    readQuantities: {
      title: 'Distinguish standard, cumulative, net, outstanding and excess',
      description:
        'Standard required comes from the frozen original basis. Issued includes confirmed ordinary issues and supplements. Returned counts confirmed receipts. Net issued = issued − returned. Outstanding and excess show shortfalls and amounts above standard separately. Check each order line; excess on one line cannot offset another line’s outstanding quantity.',
    },
    checkMovementHistory: {
      title: 'Expand confirmed handover history to check each operation',
      description:
        'Check type, material, batch, quantity, order-line allocations and reason under the current document number. If stock and records differ, preserve the original record and resolve the discrepancy. Page status or verbal notice cannot replace confirmed handovers.',
    },
    checkOverallProgress: {
      title:
        'Check document progress, overall progress and inventory shortage separately',
      description:
        'This document covers only its own order lines. Production material issuance shows material totals and order progress across all active orders. Check purchasing shortages against inventory in Part requirements. Existing analyses are snapshots; analyze again after handovers.',
    },
    resolveStock: {
      title: 'No available stock or a failed batch query',
      description:
        'Check production warehouse receipts, batches and reservations, then refresh batches. Retry a failed query before issuing; do not use stale stock figures. Split quantities across separate handovers when more than one batch is needed.',
    },
    resolveVersion: {
      title: 'Changed document version or disabled confirmation',
      description:
        'After an explicit rejection, resolve the stated reason, review again before the next handover or refresh document progress, then re-enter and check the details. Check positive quantities, batch availability, issue allocation totals, supplement ownership, supplement or return reasons, the checklist, account permissions and warehouse capabilities.',
    },
    resolveUnknownResult: {
      title: 'Submission timed out or the connection was lost',
      description:
        'Check confirmed handovers first. If the current session still shows an unknown outcome, retry the original request with its original quantity, allocations and action. Do not change quantities or start an identical handover just to retry. Begin another only after success or explicit rejection and a fresh review.',
    },
    correctRecord: {
      title:
        'Withdrawn documents, incorrect basis or incorrect handover records',
      description:
        'Confirmed handovers cannot be edited or deleted directly. Return physically received material against its original allocation; ask the responsible person to review other discrepancies. If no warehouse execution exists and orders or recipes need changes, production staff can withdraw with a reason, review and dispatch again. Withdrawal is not handled on the warehouse page.',
    },
  },
  example: {
    title: 'Quantity example: batch issues → supplement → return',
    assumption:
      'Assume one order line needs 100 kg of a material. These are illustrative confirmed handovers.',
    firstIssue: 'First issue, 60 kg: issued 60, net issued 60, outstanding 40.',
    nextIssue:
      'Second issue, 40 kg: issued 100, net issued 100, outstanding 0.',
    supplement: 'Supplement, 8 kg: issued 108, net issued 108, excess 8.',
    return:
      'Return 3 kg against the corresponding original allocation: issued remains 108, returned 3, net issued 105, excess 5.',
  },
  references: {
    handling: 'Handle production issues and returns',
    inventory: 'Check warehouse inventory',
    production: 'View overall production issuance progress',
    productionGuide: 'Read the production issuance and dispatch guide',
    requirements: 'View part requirements and inventory shortages',
  },
}
