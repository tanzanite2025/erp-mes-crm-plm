export const workflowCore = {
  commands: {
    page: {
      title: "Notification Content Templates",
      description: "Manage reusable notification titles, content, and jump links for routing rules.",
      add: "Add Content Template",
      searchPlaceholder: "Search template title, content, or jump link...",
      tabs: {
        all: "All Templates"
      }
    },
    list: {
      empty: "No notification content templates",
      scope: "Scope",
      nodeType: "Node"
    },
    form: {
      editTitle: "Edit Notification Content Template",
      newTitle: "New Notification Content Template",
      description: "Configure the notification content and the jump path after clicking. Variables like [OrderNo] and [ProductName] are supported.",
      fields: {
        title: "Content Template Name",
        bindType: "Bind Type",
        nodeType: "Node Type",
        params: "Params (Comma Separated)",
        targetLink: "Target Link",
        content: "Notification Content"
      },
      placeholders: {
        title: "e.g. Order approval reminder",
        bindType: "Select a bind scope",
        nodeType: "Select a related node",
        params: "e.g. OrderNo, ProductName",
        targetLink: "e.g. /trading/sales-orders/[OrderId]",
        content: "Enter the notification content here. Parameters are supported..."
      },
      targetLinkHint: "* Clicking the notification will automatically navigate to this page."
    },
    bindTypes: {
      section: "SECTION / Section Only",
      role: "ROLE / Active Role Only",
      global: "GLOBAL / Available Everywhere"
    },
    nodeTypes: {
      none: "None",
      start: "Start Node",
      approval: "Approval Node",
      check: "Check Node",
      production: "Production Node"
    },
    defaults: {
      pendingApproval: {
        title: "Order pending approval notice",
        content: "New order [OrderNo] ([ProductName]) has been submitted. Please click the action button to review it."
      },
      productionDone: {
        title: "Production task completed",
        content: "The production tasks for order [OrderNo] have all been completed. Please review the status."
      }
    }
  }
} as const
