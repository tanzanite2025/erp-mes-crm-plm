export const tradingSalesOrder = {
  tabs: {
    title: "Sales Order Management",
    list: "Order Ledger",
    detail: "Order Detail"
  },
  notifications: {
    pendingClaimTitle: "Sales order pending acknowledgement",
    pendingClaimContent: "Order {{orderNo}} from {{customerName}} was submitted and is waiting to be claimed."
  },
  toasts: {
    saved: "Sales order saved",
    duplicateEvidence: "Similar evidence detected",
    duplicateEvidenceDetail: "The system detected that this evidence was already uploaded before through perceptual hashing.",
    voided: "Sales order voided",
    claimed: "Order lines claimed successfully",
    saveFailed: "Failed to save sales order"
  },
  errors: {
    missingActor: "Missing valid trading command actor"
  },
  detail: {
    backToList: "Back to Ledger",
    activities: "Activity Log",
    summary: "Order Summary",
    items: "Line Items",
    info: {
      orderNo: "Order No.",
      customerName: "Customer",
      paymentMethod: "Payment Method",
      paymentTerm: "Payment Term"
    },
    evidenceTitle: "Order Evidence",
    evidencePlaceholder: "No evidence images yet",
    evidenceHint: "Supports multiple screenshots or photos with cloud-side compression up to 10MB each",
    evidenceSortHint: "Drag the top-left handle to reorder display and print order",
    evidenceNoteLabel: "Image Note",
    evidenceNotePlaceholder: "Example: signed page, email screenshot, packaging appearance"
  },
  headerFields: {
    paymentMethod: "Payment Method",
    paymentMethodPlaceholder: "Select payment method",
    paymentTerm: "Payment Term",
    paymentTermPlaceholder: "Select payment term"
  },
  packagingPreview: {
    title: "Packaging Preview",
    loading: "Calculating packaging preview...",
    empty: "No packaging preview is available for this order",
    unknownProduct: "Unknown Product",
    noMatchedProfiles: "No packaging definition matched this product",
    warningTitle: "Packaging Warnings",
    actionSlotHint: "Future actions such as shortage alerts, account notifications, or WeChat outreach can be mounted here",
    actionSlotReserved: "Action Slot Reserved",
    lineQuantity: "Ordered quantity: {{qty}} {{uom}}",
    lineRemainder: "Remainder",
    lineProfiles: "Matched Profiles",
    lineBoxCount: "{{count}} boxes",
    linePackedQuantity: "Packed quantity: {{qty}}",
    lineVolume: "Total volume: {{value}}",
    lineGrossWeightValue: "Total gross weight: {{value}}",
    warnings: {
      missingProductBinding: "This order line is not bound to a product, so no packaging definition can be matched",
      noMatchedProfiles: "No packaging definition matched this product",
      noProfilesProvided: "No packaging definition is available for calculation",
      inconsistentDimensionUnits: "Matched packaging definitions use inconsistent dimension units, so the summary is for reference only",
      inconsistentWeightUnits: "Matched packaging definitions use inconsistent weight units, so the summary is for reference only",
      remainingQuantity: "The current packaging definitions cannot pack the ordered quantity exactly, so some quantity remains unpacked",
      invalidCapacity: "Some packaging definitions have invalid capacities and were ignored during calculation"
    },
    summary: {
      boxes: "Boxes",
      volume: "Volume",
      grossWeight: "Gross Weight",
      packagedLines: "Packaged Lines",
      unpackagedLines: "Unmatched Lines",
      warnings: "Warnings",
      loadingInline: "Packaging summary loading",
      error: "Packaging summary error"
    }
  },
  footer: {
    totalQty: "Total Quantity",
    totalAmount: "Estimated Total"
  },
  print: {
    templatePending: "The PDF print feature is being wired up to the template...",
    printShipment: "Print Shipment Document"
  },
  fileUploader: {
    upload: "Upload Images",
    toasts: {
      maxSizeExceeded: "File size exceeds the limit (max {{max}}MB)",
      saveFailed: "Failed to upload image"
    }
  },
  master: {
    fulfillmentCalculatedInUI: "Fulfillment preview derived in UI",
    filters: {
      status: "Status",
      allStatuses: "All Statuses",
      paymentMethod: "Payment Method",
      paymentTerm: "Payment Term",
      allPaymentMethods: "All Payment Methods",
      allPaymentTerms: "All Payment Terms"
    },
    errors: {
      loadFailed: "Failed to load sales orders",
      retry: "Retry Load",
      authRequired: "The current session is not authenticated. Please sign in again.",
      circuitBreaker: "The request was blocked by circuit-breaker protection. Please retry later.",
      timeout: "The request timed out. Please check the current network path.",
      network: "The network request failed. Verify frontend/backend connectivity.",
      invalidResponse: "The backend returned a response format that does not match the contract.",
      unknown: "The request failed. Review the detailed error below.",
      reasonPrefix: "Reason:"
    },
    columns: {
      paymentMethod: "Payment Method",
      paymentTerm: "Payment Term"
    }
  }
} as const
