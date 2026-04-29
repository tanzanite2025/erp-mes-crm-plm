export const systemManagementEnUSOverrides = {
  systemManagement: {
    routingTab: {
      tabs: {
        executions: 'Execution Logs',
      },
    },
    layout: {
      title: 'System Management',
      tabs: {
        status: 'Status',
        routing: 'Routing',
        workflowDefinition: 'Sales Workflow',
        logisticsApi: 'Logistics API',
        aiCapability: 'AI Capability',
      },
    },
    salesWorkflowDefinition: {
      loading: 'Loading workflow definitions...',
      title: 'Sales Order Workflow Definition',
      subtitle: 'Manage SALES_ORDER workflow definitions. New sales orders bind to active definitions automatically.',
      add: 'Add Definition',
      empty: 'No sales workflow definitions found',
      status: {
        active: 'Active',
        inactive: 'Inactive',
      },
      actions: {
        refresh: 'Refresh',
        enable: 'Enable',
        disable: 'Disable',
      },
      table: {
        code: 'Code',
        name: 'Name',
        version: 'Version',
        status: 'Status',
        updatedAt: 'Updated At',
        actions: 'Actions',
      },
      dialog: {
        createTitle: 'Create Workflow Definition',
        editTitle: 'Edit Workflow Definition',
        description: 'This definition is scoped to SALES_ORDER module.',
      },
      form: {
        code: 'Code',
        name: 'Name',
        namePlaceholder: 'Sales Default Flow',
        version: 'Version',
        isActive: 'Active',
        isActiveHint: 'When active, newly created sales orders can start workflow instances automatically.',
        description: 'Description',
        descriptionPlaceholder: 'Describe the business meaning of this definition',
        definitionJson: 'Definition JSON',
        useTemplate: 'Use Template',
      },
      toasts: {
        loadFailed: 'Failed to load workflow definitions',
        saveSuccess: 'Saved successfully',
        saveFailed: 'Failed to save workflow definition',
        required: 'Code and name are required',
        invalidVersion: 'Version must be a positive integer',
        invalidJson: 'Invalid workflow definition JSON',
      },
    },
  },
} as const
