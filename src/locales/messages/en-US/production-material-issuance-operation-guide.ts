export const productionMaterialIssuanceOperationGuide = {
  domainLabel: 'Production handbook · Material issuance',
  title: 'How to issue production materials',
  shortcutDescription:
    'Learn document dispatch, issues, supplements, returns and order-line allocations.',
  introduction:
    'Start issuance by selecting order lines, reviewing BOMs and requirements, and dispatching a formal document. Continue with warehouse issues, supplements and returns on the original. Overall material and order-line progress includes all active orders. Formal printing and notifications remain pending.',
  mobileIntroduction: 'Learn preparation, dispatch, issue and return rules.',
  availabilityLabel:
    'Overall progress and document handovers available · Formal printing and messaging pending',
  contentsLabel: 'Production material issuance guide chapters',
  readingAreaLabel: 'Production material issuance guide reading area',
  openGuide: 'Read production issuance guide',
  referenceTitle: 'Related pages',
  referenceDescription:
    'Operations take place on their business pages with the relevant viewing and action permissions. Reading this guide does not dispatch documents or confirm issues.',
  chapters: {
    scope: {
      label: 'Preparation scope',
      shortLabel: 'Scope',
      title: 'Identify the orders and product quantities covered',
      description:
        'Start issuance in Production issuance and select whole order lines, or bring analyzed sources from Part requirements into the same workflow. Both share requirement bases. Overall and per-line progress uses confirmed warehouse movements.',
      noticeTitle:
        'Handle the original document and keep document progress distinct from overall progress',
      noticeDescription:
        'Totals include all active Pending, Scheduling and InProgress orders, including undispatched sources. Dispatched lines use frozen bases; others use current recipes. Flagged sources make material totals partial. Completed, cancelled and closed orders leave current totals while original history remains.',
    },
    dispatch: {
      label: 'Dispatch and print',
      shortLabel: 'Dispatch',
      title: 'Review the bases, then explicitly dispatch the document',
      description:
        'Choose Start material issuance, select order lines and review BOM prerequisites. Select a BOM when multiple recipes apply, then review the formal sources, weights and material requirements and confirm dispatch. Continue directly to the original document in the warehouse.',
      noticeTitle:
        'Current MRP printing and Excel exports produce reference lists',
      noticeDescription:
        'Current printing does not create a formal document; explicitly dispatch it separately. Formal printing and Dispatch and print remain pending. Dispatch does not open printing, confirm issues or send a notification.',
    },
    warehouse: {
      label: 'Warehouse confirmation',
      shortLabel: 'Issue',
      title: 'Confirm the quantities actually handed over',
      description:
        'After dispatch, choose Continue in warehouse, or open Warehouse → Production handovers and select the original. The handling form opens directly. Choose the action, material and batch, enter the quantity, review order-line allocations and explicitly confirm.',
      noticeTitle:
        'Requests, opening documents and reading messages do not establish issued quantities',
      noticeDescription:
        'Only confirmed warehouse movements count toward issued and returned totals. Issue, supplement and return require their respective permissions. Dispatch, scheduling and completion quantities cannot establish actual handovers.',
    },
    movements: {
      label: 'Supplements and returns',
      shortLabel: 'Returns',
      title:
        'Keep partial issues, supplements and returns against the original document',
      description:
        'Retain every actual movement, then reconcile standard required, net issued and outstanding quantities. The example below is illustrative, not an actual issuance record.',
      noticeTitle:
        'Outstanding to issue is neither a purchasing shortage nor shop-floor stock',
      noticeDescription:
        'Purchasing also depends on available warehouse stock. Shop-floor balances and actual consumption need their own evidence. Issued quantities cannot establish consumption.',
    },
    verification: {
      label: 'Verify and resolve',
      shortLabel: 'Verify',
      title: 'Trace differences through the document, sources and movements',
      description:
        'Dispatch rechecks changed bases and duplicate coverage. Warehouse confirmation checks document version, available batch stock and allocations. Retrying the same request returns its original result; a timeout does not prove that nothing happened.',
      noticeTitle:
        'Dispatch, message reading and physical handover have different evidence',
      noticeDescription:
        'Dispatched means the document is saved; issued quantities need confirmed warehouse movements. Notifications, read receipts and formal printing remain pending. A browser cannot prove that paper was physically printed.',
    },
  },
  topics: {
    purpose: {
      title: 'What each page owns',
      description:
        'Production Material Issuance owns starting, reviewing and dispatching documents, overall progress and original history. Part Requirements calculates demand, stock shortages and packaging and can bring sources into the same workflow. Warehouse Production handovers confirms actual movements on the original. Issued, completed and delivered quantities do not reduce MRP demand automatically.',
    },
    progressViews: {
      title: 'Review overall materials, then individual order lines',
      description:
        'Material totals show six quantities and source-line counts. Switch to By order and expand a line to review materials, BOM, performance version and product weight. Both views share one scope. Use Start material issuance to select an applicable BOM, review and dispatch; the formal document freezes the chosen basis. Documents remain below for traceability.',
    },
    coverage: {
      title: 'Cover full order lines and issue in stages',
      description:
        'Dispatch selects 1–500 whole order lines, and the original document supports partial issues. Scheduling the first 100 of 2,000 products does not automatically change the preparation scope.',
    },
    combinedOrders: {
      title: 'Combine orders while retaining sources',
      description:
        'A document may combine several order lines and aggregate matching materials. Pick by material and confirm once while retaining each order line’s allocation. Supplements and returns trace those allocations. They identify the receiving order without establishing consumption.',
    },
    consumption: {
      title: 'Issued means handed to production, not consumed',
      description:
        'Material may remain on the shop floor awaiting use. Consumption, scrap and remaining stock require subsequent facts. Production issuance is also distinct from finished-product sales shipment.',
    },
    checkBeforeSending: {
      title: 'Review the scope together before dispatch',
      description:
        'Expand every source line, product quantity, selected BOM and revision, product weight and performance version, and recipe materials before confirming dispatch to the production material warehouse. Missing bases block dispatch; changed bases require analysis and review again. Searching and shortage filters do not change the formal scope.',
    },
    sendAndPrint: {
      title: 'Dispatch documents separately from reference printing',
      description:
        'Confirm document dispatch saves a formal number, sender, time and frozen bases without deducting stock. Dispatch and print and formal printing remain pending. Current analysis printing is a reference; cancelling printing does not withdraw the original document.',
    },
    reprint: {
      title: 'Reprint using the original document number',
      description:
        'Reprinting outputs the same document without creating new pending work or increasing required quantities. Clearly distinguish reference analysis from formal documents. A number or QR code identifies the original record for checking its current status.',
    },
    receipt: {
      title: 'How to verify dispatch',
      description:
        'Check the confirmed number, sender, time and queryable original document. Warehouse staff can view the same document in Production handovers; dispatch does not mean notification or receipt. Retry the original request after a timeout in the current session. After a full reload or reopening the app, check history and review first. Messaging remains pending.',
    },
    pendingDocuments: {
      title: 'Open the pending document or its original number',
      description:
        'After dispatch, choose Continue in warehouse, or open Warehouse → Production handovers and select the original. Handling opens automatically. Check the scope, progress and warehouse availability before entering this handover. Message and paper scanning entry points remain pending.',
    },
    actualQuantity: {
      title: 'Check materials, quantities, units, warehouse and batch',
      description:
        'Handle one material and batch at a time. Batch options show availability, with stock and effective reservations displayed together. Enter the actual quantity using the original unit without implicit conversion. Insufficient stock blocks confirmation; continue on the original document for additional batches.',
    },
    lineAllocation: {
      title: 'Enter the total, review line allocations and confirm once',
      description:
        'Enter the quantity and request allocations from the document. Suggestions use frozen line order and outstanding quantities. Review or adjust each allocation; totals must equal the handover quantity and commit with inventory. Version or stock changes require review without silent reallocation.',
    },
    partialIssue: {
      title: 'Continue partial issues on the same document',
      description:
        'If the standard is 4,000 m² and 200 m² is issued today, 3,800 m² remains outstanding. Later issues accumulate against the same document without dispatching the standard requirement again.',
    },
    warehouseResponsibility: {
      title: 'Existing accounts, with recorded confirmation',
      description:
        'Use the existing account and permission system. Confirmation records the materials, quantities, operator and time together with inventory changes. Success must reflect the server-confirmed result.',
    },
    quantityMeanings: {
      title: 'Share quantity definitions with the workspace',
      description:
        'Use the quantity explanation above for standard required, total issued, total returned, net issued, outstanding and excess quantities. Supplements are included in total issued. Review stock gaps and packaging conversions in Part Requirements.',
    },
    supplement: {
      title: 'Record a reason when additional material is needed',
      description:
        'Choose Supplement on the original document, select the material and batch, identify one specific receiving order line and provide a reason before confirmation. Keep above-standard differences without overwriting issues or editing orders and BOM standards to hide them.',
    },
    return: {
      title: 'Reduce net issued only after the warehouse receives the return',
      description:
        'Choose Return and the original issue allocation. Options show its order line, batch and remaining returnable quantity. Enter the actual received quantity and reason. Confirmation reduces net issued and restores stock at the original allocation and cost, within its remaining returnable quantity.',
    },
    traceableCorrection: {
      title: 'Retain evidence when correcting confirmed records',
      description:
        'Posted movements cannot simply be deleted or overwritten. Corrections should use an explicit reversal or return, reconciling inventory effects while retaining the original record and reason.',
    },
    duplicateDispatch: {
      title: 'Distinguish retries, repeated analysis and reprints',
      description:
        'Retrying the same dispatch returns its original document. Active coverage prevents duplicate dispatch. If that document was withdrawn, replay still returns the withdrawn original without creating a new document. Future supplements and reprints use the original document.',
    },
    changedBasis: {
      title: 'Review changes to orders and recipes',
      description:
        'Dispatch freezes sources, quantities, weights and recipes. Later BOM changes do not rewrite history, and active coverage protects order fields affecting materials. A whole document without warehouse execution can be withdrawn from its details with a reason, releasing coverage for edits and a newly reviewed dispatch. History is preserved.',
    },
    missingRecipe: {
      title: 'Complete the requirement basis before formal issuance',
      description:
        'Part Requirements checks published, currently effective production BOMs per order line. Select a performance version where several recipes apply. Missing recipes or invalid units block a complete summary. Dispatch freezes the shared bases; warehouse staff confirm actual handovers against that document.',
    },
    outstandingReconciliation: {
      title:
        'Reconcile outstanding and excess separately; reuse Part Requirements for gaps',
      description:
        'Sum outstanding quantities per order line. If line A has 20 excess and line B has 40 outstanding, show outstanding 40 and excess 20 separately. Reuse Part Requirements for demand, stock gaps and packaging. Issuance tracks warehouse-confirmed movements against the shared basis.',
    },
    statusEvidence: {
      title: 'Check the original document and actual movements',
      description:
        'Trace dispatch or withdrawal, scope, product weight and frozen recipes by document number. Expand warehouse handling for standard required, issued, returned, net, remaining and above-standard quantities per covered order line, and every confirmed handover. Page status, read receipts and print counts do not establish actual handovers.',
    },
  },
  example: {
    title: 'Example: staged issues, supplements and returns for 2,000 products',
    assumption:
      'At 2 m² per product, standard required is 4,000 m². Each example below assumes formal warehouse confirmation.',
    firstIssue:
      'Issue 200 m²: total issued 200, net issued 200, outstanding 3,800 m².',
    nextIssue:
      'Issue another 3,800 m²: total issued 4,000, net issued 4,000, outstanding 0 m².',
    supplement:
      'Supplement 30 m²: total issued 4,030, net issued 4,030, outstanding remains 0. Retain the reason for the 30 m² variance.',
    return:
      'Return 10 m²: total issued stays 4,030, total returned 10, net issued 4,020 m². This does not establish consumption of 4,020 m².',
  },
  references: {
    workspace: 'View issuance workspace',
    requirements: 'View part requirements',
    requirementsGuide: 'Read part requirements guide',
    inventory: 'Check warehouse inventory',
    bomGuide: 'Read BOM guide',
    warehouseHandling: 'Handle warehouse production handovers',
  },
}
