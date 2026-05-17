export const purchase = {
  tabs: {
    payables: "Payables"
  },
  suppliers: {
    toasts: {
      saved: "Supplier saved",
      deleted: "Supplier deleted"
    },
    ratings: {
      strategic: "Strategic Partner",
      preferred: "Qualified / Preferred",
      standard: "Standard Supplier",
      probation: "Under Review / Probation"
    },
    loadingFailed: "Failed to load supplier data, please try again later"
  },
  orders: {
    detailConfirmReceipt: "Confirm Receipt",
    viewPayable: "View Payable",
    detailPrintEvidence: "Print Evidence Attachment",
    detailReceiptAutoRemarks: "Manual receipt confirmation from purchase order page",
    detailEvidenceTitle: "Purchase Contract Evidence",
    receiptDialogDescription: "Review each receipt line, batch number, and target warehouse category before submitting.",
    receiptDialogDate: "Receipt Date",
    receiptDialogRemarks: "Receipt Remarks",
    receiptDialogRemainingQty: "Remaining Qty",
    receiptDialogQuantity: "Receipt Qty",
    receiptDialogBatchNo: "Batch No.",
    receiptDialogTargetCategory: "Target Category",
    receiptDialogSelectCategory: "Select target category",
    receiptDialogCancel: "Cancel",
    receiptDialogSubmitting: "Submitting...",
    receiptDialogSubmit: "Confirm Receipt & Inbound",
    toasts: {
      saved: "Purchase order saved",
      voided: "Purchase order voided",
      receiptConfirmed: "Purchase receipt confirmed"
    },
    validation: {
      supplierRequired: "Please select a supplier",
      linesRequired: "The order must contain at least one line item",
      lineInvalid: "Please complete the line details. Material is required and quantity must be greater than 0."
    },
    status: {
      draft: "Draft",
      sent: "Sent",
      awaiting: "Awaiting",
      received: "Received",
      canceled: "Voided"
    }
  },
  payables: {
    title: "Purchase Payables",
    description: "Payables entry point for the purchase domain, reserved for payment progress, aging, and reconciliation views.",
    summaryTotal: "Outstanding Payables",
    summaryOverdue: "Overdue Amount",
    summaryPending: "Pending Payments",
    tableTitle: "Payables List",
    tableDescription: "Review payable ledgers, aging status, and open the detail dialog for payment registration and allocation.",
    orderDialog: {
      noLedger: "No payable ledger exists for this purchase order yet",
      loadFailed: "Failed to load the payable ledger for this purchase order"
    },
    columns: {
      documentNo: "Document No.",
      supplierName: "Supplier",
      invoiceAmount: "Invoice Amount",
      paidAmount: "Paid",
      outstandingAmount: "Outstanding",
      dueDate: "Due Date",
      agingBucket: "Aging",
      status: "Status"
    }
  },
  logistics: {
    offlineQueued: "Saved as offline draft",
    offlineQueuedDesc: "Tracking No. {{trackingNo}} has been saved locally and will sync when the network recovers.",
    offlineDraftsTitle: "Offline Inbound Drafts",
    offlineDraftsDesc: "These records are only stored on this device and have not been formally submitted yet.",
    offlineDraftStatusPending: "Pending Sync",
    offlineDraftStatusBlocked: "Needs Review",
    offlineNetworkStatus: "Offline",
    offlineSyncNow: "Sync Drafts",
    offlineSyncing: "Syncing...",
    offlineSyncSuccess: "Offline drafts synced",
    offlineSyncSuccessDesc: "{{count}} draft(s) have been submitted successfully.",
    offlineSyncPending: "Drafts still pending",
    offlineSyncPendingDesc: "{{count}} draft(s) are still stored locally. Please review and retry later.",
    offlineSavedAt: "Saved locally at {{time}}",
    offlineLastError: "Last error: {{message}}",
    offlineDraftRemoved: "Offline draft removed"
  }
} as const
