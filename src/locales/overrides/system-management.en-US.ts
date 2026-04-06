export const systemManagementEnUSOverrides = {
  systemManagement: {
    layout: {
      title: 'System Management',
      tabs: {
        status: 'Status',
        routing: 'Routing',
        logisticsApi: 'Logistics API',
        aiCapability: 'AI Capability',
      },
    },
    userRights: {
      header: {
        title: 'Role Permission Matrix',
        subtitle: 'Manage module, page, tab, and action access by role.',
      },
      actions: {
        importOrgRole: 'Import Organization Role',
        selectOrgRole: 'Select Organization Role',
        confirmImport: 'Confirm Import',
        expand: 'Expand',
        collapse: 'Collapse',
        expandAll: 'Expand All',
        collapseAll: 'Collapse All',
      },
      sections: {
        accessTree: 'Access Tree',
        moduleActions: 'Module Actions',
      },
      table: {
        accessNodes: 'Permission Nodes',
      },
      mobile: {
        targetRole: 'Select Role',
      },
      kinds: {
        module: 'Module',
        page: 'Page',
        tab: 'Tab',
        action: 'Action',
      },
      status: {
        expanded: 'Expanded {{count}} child nodes',
        collapsed: 'Collapsed {{count}} child nodes. Click left to expand.',
        collapsedShort: 'Collapsed {{count}} child nodes',
      },
      securityInfo:
        'The permission matrix follows least privilege. The ROOT role stays locked to prevent accidental global authorization drift.',
    },
  },
} as const
