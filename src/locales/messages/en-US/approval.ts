export const approval = {
  centerTitle: 'Approval Center',
  tabs: {
    policies: 'Approval Configuration',
    requests: 'Inbox & Requests',
    routing: 'Message Center',
    history: 'Approval History',
  },
  policies: {
    title: 'Business Approval Configuration',
    description:
      'Configure approvers for business submissions. Notification rules only control reminders.',
    enabled: 'Enable approval chain',
    selectPrimary: 'Select the primary approver',
    noSecondary: 'No second approval level',
    unavailableAccount:
      'The previous approver is unavailable; select another account',
    existingRequests:
      'Changes apply to new requests. Pending requests retain their original approvers.',
    readOnly:
      'Your account has read access. Management permission is required to make changes.',
    save: 'Save approval configuration',
    saving: 'Saving…',
    saved: 'Approval configuration saved',
    saveFailed: 'Failed to save approval configuration',
    refresh: 'Refresh',
    loading: 'Loading approval configuration…',
    loadFailed: 'Failed to load approval configuration',
  },
  modules: {
    quality: 'Quality',
    inventory: 'Inventory',
    trading: 'Trading',
    production: 'Production',
    materials: 'Materials',
  },
  actions: {
    quality_standard_review: 'Quality standard review',
    void: 'Void / Reverse',
    delete: 'Hard Delete',
    price_override: 'Price Override',
    scrap: 'Scrap Handling',
    export: 'Sensitive Export',
  },
  status: {
    pending: 'In Review',
    approved_l1: 'L1 Approved',
    approved: 'Authorized',
    rejected: 'Rejected',
    consumed: 'Consumed',
    expired: 'Expired',
    active: 'Active',
    inactive: 'Inactive',
  },
  labels: {
    requester: 'Requester',
    requestReason: 'Request Reason',
    content: 'Content',
    status: 'Status',
    pinCode: 'PIN Code',
    timestamp: 'Timestamp',
    module: 'Module',
    action: 'Action',
    l1Approver: 'L1 Approver',
    l2Approver: 'L2 Approver',
    result: 'Result',
    operations: 'Actions',
    targetModule: 'Target Module',
    sensitiveAction: 'Sensitive Action',
    unknownUser: 'Unknown User',
    createdAt: 'Created At',
  },
  requests: {
    selectedRequest: 'Selected approval request',
    selectedUnavailable:
      'This approval request is no longer available or you cannot view it.',
    selectedLoadFailed:
      'Could not load the approval request. Refresh to try again.',
    loading: 'Loading approval tasks...',
    heroTitle: 'Inbox & Requests',
    heroSubtitle:
      'You have {{count}} requests waiting for authorization. Complete secondary approval for sensitive operations here.',
    emptyPending: 'No pending tasks right now',
    noReasonProvided: 'No reason provided',
    reject: 'Reject',
    confirm: 'Confirm PIN',
    l1Pass: 'Pass L1',
    myLogsTitle: 'My Request Timeline',
    myLogsSubtitle:
      'Track every approval request you initiated across its full lifecycle.',
    emptyMine: 'No requests initiated by you',
    pinDialogTitle: 'Set a 6-digit PIN',
    pinDialogDescription:
      'Enter a 6-digit numeric PIN. The requester can complete the protected action after entering it.',
    issuePin: 'Issue PIN',
    approvedToast: 'Request approved',
    rejectedToast: 'Request rejected',
    table: {
      content: 'Content',
      status: 'Status',
      pinCode: 'PIN Code',
      timestamp: 'Timestamp',
    },
  },
  history: {
    heroTitle: 'Approval History',
    heroSubtitle:
      'Historical authorization trail for sensitive operations across the system, with {{count}} approval records.',
    searchPlaceholder: 'Search module, action, or requester...',
    empty: 'No matching approval records',
  },
  guard: {
    title: 'Security Authorization Required',
    verifyDescription:
      'This operation is protected. Enter the 6-digit authorization PIN issued by the approver.',
    verifyPlaceholder: 'Enter PIN',
    requestAnother: 'Lost it or no request yet? Submit again',
    requestDescription:
      'The approval flow is missing or the request has expired. Enter a reason to submit a new request:',
    requestPlaceholder:
      'Reason (for example: business reversal, data correction)',
    verifyAction: 'Verify and Continue',
    submitRequest: 'Submit Request',
    verifySuccess: 'Authorization successful',
    verifyFailed: 'Invalid PIN or approval not granted yet',
    requestSuccess:
      'Request submitted. Please contact the approver for the 6-digit PIN',
  },
} as const
