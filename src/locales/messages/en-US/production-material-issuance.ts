import { productionMaterialIssuanceStartWorkflow } from './production-material-issuance-start-workflow'
import { productionMaterialIssuanceWarehouseHandling } from './production-material-issuance-warehouse-handling'

export const productionMaterialIssuance = {
  workspace: {
    referenceLinks: 'Related material issuance pages',
    quantityHint:
      'Net issued = total issued − returns. Outstanding is the quantity still to issue, based on warehouse confirmations. Check each material in its own unit.',
    unknownQuantities:
      'The requirement basis needs review. Required and outstanding quantities cannot be determined yet.',
    orderDetails: 'View recipe, total issues, returns and excess',
    materialDetails: 'Show total issues, returns and excess',
    quantities: {
      required: 'Standard required',
      netIssued: 'Net issued',
      remaining: 'Still to issue',
    },
  },
  start: productionMaterialIssuanceStartWorkflow,
  warehouseHandling: productionMaterialIssuanceWarehouseHandling,
  title: 'Production Material Issuance',
  description:
    'Check required, issued and outstanding material quantities by order.',
  availabilityTitle: 'Review overall progress and original document handovers',
  availabilityDescription:
    'Totals include every active order line, including undispatched sources. Original documents retain history below. Only confirmed warehouse handovers count. Missing bases or failed reads do not mean zero quantities. Formal printing and messaging remain pending.',
  referenceActions: {
    requirements: 'View part requirements',
    inventory: 'Check warehouse inventory',
  },
  documentList: {
    title: 'Document traceability',
    description:
      'Trace the original dispatch, sender, time, order lines and frozen BOM basis.',
    permissionRequired:
      'Reading documents requires the production material basis and document view permission. Page or guide access does not grant it.',
    statusFilter: 'Filter by document status',
    allStatuses: 'All statuses',
    dispatched: 'Dispatched',
    withdrawn: 'Withdrawn',
    refresh: 'Refresh documents',
    loading: 'Loading documents…',
    failed: 'Could not read the document. Please retry.',
    empty: 'No formal issuance documents match this scope.',
    pagination: 'Page {{page}} · Total {{count}}',
    previous: 'Previous',
    next: 'Next',
    detailTitle: 'Frozen sources and recipe',
    frozenHint:
      'These sources, weights, and recipes were saved at dispatch. Later order-line renumbering or BOM edits do not change this history. Document status does not establish material receipt.',
    withdrawalReason: 'Withdrawal reason',
  },
  sourceReview: {
    title: 'Review production material bases',
    description:
      'Review the formal basis for every selected order line and BOM, including finished weights and standard material requirements. Confirm dispatch after reviewing.',
    action: 'Review production material bases',
    loading: 'Reviewing…',
    limit: 'Review up to 500 order lines at a time. Select a smaller scope.',
    failed:
      'Review was not completed. If sources or recipes changed, review BOMs and issuance prerequisites again.',
    success: 'Sources reviewed: {{count}}.',
  },
  commands: {
    dispatchTitle: 'Dispatch a formal issuance document',
    dispatchScope:
      'Dispatch all {{count}} order lines above to the production material warehouse. The document freezes source quantities, BOMs, product weights and recipes. Dispatch does not confirm material receipt or deduct stock.',
    confirmSources:
      'I have checked every order line, selected BOM and product weight above',
    dispatchAction: 'Confirm document dispatch',
    submitting: 'Submitting. Please wait…',
    retryOriginal: 'Retry the original request',
    rejected:
      'The operation was rejected. Check the reason below; analyze again or reload the original document when bases have changed. Retrying uses the original request.',
    unknownOutcome:
      'The outcome is not confirmed. Retry the original request or check document history. A timeout does not prove that nothing happened.',
    dispatched: 'Document dispatched:',
    originalAlreadyWithdrawn:
      'The original document for this request was already withdrawn. No new document was created:',
    dispatchResultHint:
      'These are the frozen bases saved on the original document. Warehouse staff can confirm actual handovers in Production handovers. Dispatch does not establish a material movement or notification.',
    withdrawTitle: 'Withdraw issuance document',
    withdrawHint:
      'Only a whole document without warehouse execution facts can be withdrawn. Withdrawal releases order-line coverage and preserves the document and frozen history. Enter a reason and confirm.',
    reason: 'Withdrawal reason',
    reasonTooLong:
      'The withdrawal reason is too long. Shorten it before submitting.',
    withdrawAction: 'Confirm whole-document withdrawal',
    withdrawn: 'The document was withdrawn. Its history is preserved.',
    cancel: 'Cancel',
  },
  frozenSources: {
    quantity: 'Covered product quantity',
    weight: 'Product weight / performance version',
    unspecifiedVersion: 'Performance version unspecified',
    bom: 'BOM / revision',
    owner: 'Recipe ownership / order customer',
    customerOwned: 'Customer-specific recipe',
    internalOwned: 'Company-owned recipe',
    recipe: 'Recipe materials',
    standardUsage: 'Standard usage',
    required: 'Standard required',
  },
  orderScope: {
    title: 'Order scope and requirement basis',
    description:
      'Include all Pending, Scheduling and InProgress orders, including undispatched lines. Both views use the same scope. Completed, cancelled and closed orders leave current totals; original document history remains available.',
    fields: {
      orders: 'Orders / order lines',
      warehouse: 'Production supply warehouse',
      basis: 'BOM / revision basis',
      dispatch: 'Dispatch coverage',
    },
    hint: 'Choose Start material issuance to select order lines, review BOMs and requirements, and dispatch. Part Requirements can supply analyzed sources. This workspace also tracks overall and per-line progress using frozen dispatched bases and flags missing sources.',
  },
  views: {
    label: 'Production issuance view',
    materials: 'By material',
    orders: 'By order',
  },
  materials: {
    title: 'Outstanding material summary',
    description:
      'Review known required, issued, outstanding and above-standard quantities by material. Use By order to inspect individual sources. When sources have issues, these totals cover only the known portion.',
    headers: {
      material: 'Material / unit',
      required: 'Standard required',
      issued: 'Total issued (including supplements)',
      returned: 'Total returned',
      netIssued: 'Net issued',
      remaining: 'Outstanding to issue',
      aboveStandard: 'Above standard',
    },
    progressHint:
      'Sum outstanding quantities per order line and show excess separately. Reuse Part Requirements for demand, stock gaps and packaging conversions.',
  },
  orderProgress: {
    title: 'Order-line issuance progress',
    description:
      'Review each material’s issued and outstanding quantities by order and line, with access to total issues, returns and related documents.',
    headers: {
      orderLine: 'Order / line / product',
      dispatch: 'Dispatch',
      material: 'Material / unit',
      required: 'Standard required',
      netIssued: 'Net issued',
      remaining: 'Outstanding to issue',
      aboveStandard: 'Above standard',
    },
    allocationHint:
      'Orders can share one combined issue. Warehouse confirmation retains each order line’s allocation; supplements and returns trace those allocations. Allocation does not establish consumption.',
  },
  activeProgress: {
    loading: 'Checking all active orders and confirmed handovers…',
    failed:
      'Could not load overall progress. Refresh to retry; fulfillment cannot be determined.',
    refresh: 'Refresh overall progress',
    orderCount: '{{orders}} orders / {{lines}} order lines',
    warehouse: 'Production material warehouse (MATERIAL)',
    basisCount: 'Frozen + current recipes / {{count}} source issues',
    dispatchCount:
      '{{dispatched}} dispatched / {{undispatched}} undispatched lines',
    incomplete:
      'Totals are partial: {{count}} order lines have unresolved bases. Check By order before judging fulfillment.',
    scopeExplanation: 'Scope and requirement basis explained',
    emptyMaterials:
      'No known material requirements on this page. Resolve any source issues first.',
    emptyOrders: 'No active order lines on this page.',
    sourceLines: '{{count}} source order lines',
    undispatched: 'Undispatched · current recipe preview',
    frozenBasis:
      'This line uses the recipe and weight frozen at dispatch. Find the original number in document traceability below to review handovers.',
    currentBasis:
      'This undispatched line uses the currently applicable production recipe. Previewing does not save BOM choices or create an issuance document.',
    paginationLabel: 'Overall progress pagination',
    pagination: 'Page {{page}} · Total {{count}}',
  },
  movements: {
    title: 'Issue and return records',
    description:
      'Keep initial issues, supplementary issues and returns as separate facts, with order-line allocations, quantities, dates, operators and reasons.',
    emptyTitle: 'Warehouse confirmations are not connected yet',
    emptyDescription:
      'Requests, saved drafts, and printed lists do not count as issued materials. Actual movements appear here only after warehouse confirmation.',
  },
  quantityHelp: {
    trigger: 'Explain production issuance quantities',
    title: 'What these quantities mean',
    required: {
      title: 'Standard required',
      description:
        'Covered product quantity × material standard usage from the selected BOM. Do not apply wastage again when it is already included in standard usage.',
    },
    issued: {
      title: 'Total issued',
      description:
        'All formally confirmed warehouse issues, including initial and supplementary issues. Pending requests are excluded.',
    },
    returned: {
      title: 'Total returned',
      description:
        'All returns formally received and confirmed by the warehouse. Requested returns do not reduce net issued quantities before confirmation.',
    },
    netIssued: {
      title: 'Net issued',
      description:
        'Total issued − total returned. Retain order-line allocations and aggregate matching materials and units. This does not establish consumption.',
    },
    remaining: {
      title: 'Outstanding to issue',
      description:
        'For each order line, standard required − net issued, with a minimum of zero; then sum by material. Excess on one line cannot offset another line’s outstanding demand. This is not a purchasing shortage or shop-floor balance.',
    },
    aboveStandard: {
      title: 'Above standard',
      description:
        'For each order line, net issued − standard required, with a minimum of zero; then sum separately. If line A has 20 excess and line B has 40 outstanding, show excess 20 and outstanding 40.',
    },
    supplement: {
      title: 'When the standard quantity has been issued but more is needed',
      description:
        'Record a supplementary issue and reason against the original document. Retain the variance above standard and the original movements. Actual consumption and shop-floor balances require separate evidence.',
    },
  },
}
