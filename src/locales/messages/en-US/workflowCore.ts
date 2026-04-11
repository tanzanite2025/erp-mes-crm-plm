export const workflowCore = {
  commands: {
    page: {
      title: 'Command Gallery',
      description: 'Preset standard command templates to improve workflow collaboration efficiency',
      add: 'Add Standard Command',
      searchPlaceholder: 'Search command content, category, or tags...',
      tabs: {
        all: 'All Commands',
      },
    },
    list: {
      empty: 'No notification templates',
      scope: 'Scope',
      nodeType: 'Node',
    },
    form: {
      editTitle: 'Edit Notification Template',
      newTitle: 'New Notification Template',
      description:
        'Configure the notification content and the jump path after clicking. Variables like [OrderNo] and [ProductName] are supported.',
      fields: {
        title: 'Template Title',
        bindType: 'Bind Type',
        nodeType: 'Node Type',
        params: 'Params (Comma Separated)',
        targetLink: 'Target Link',
        content: 'Notification Content',
      },
      placeholders: {
        title: 'e.g. Order approval reminder',
        bindType: 'Select a bind scope',
        nodeType: 'Select a related node',
        params: 'e.g. OrderNo, ProductName',
        targetLink: 'e.g. /trading/sales-orders/[OrderId]',
        content: 'Enter the notification content here. Parameters are supported...',
      },
      targetLinkHint: '* Clicking the notification will automatically navigate to this page.',
    },
    bindTypes: {
      section: 'SECTION / Section Only',
      role: 'ROLE / Active Role Only',
      global: 'GLOBAL / Available Everywhere',
    },
    nodeTypes: {
      none: 'None',
      start: 'Start Node',
      approval: 'Approval Node',
      check: 'Check Node',
      production: 'Production Node',
    },
    defaults: {
      pendingApproval: {
        title: 'Order pending approval notice',
        content: 'New order [OrderNo] ([ProductName]) has been submitted. Please click the action button to review it.',
      },
      productionDone: {
        title: 'Production task completed',
        content: 'The production tasks for order [OrderNo] have all been completed. Please review the status.',
      },
    },
    toasts: {
      added: 'Command added to the library',
      removed: 'Command removed from the library',
    },
  },
}
