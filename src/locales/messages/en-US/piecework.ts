export const piecework = {
  layout: {
    title: 'Digital Piecework Center',
    subtitle:
      'Core Piecework rules, team efficiency and digital allocation logic',
    tabs: {
      query: 'Query Detail',
      rules: 'Unit Price Rules',
      stats: 'Efficiency Stats',
      teams: 'Team Management',
    },
  },
  placeholders: {
    moduleTitle: '{{title}} Functional Center',
    moduleSubtitle:
      'Digital Factory: Deep data analysis and controlled management logic',
    notAvailable: '{{title}} Module Not Available',
    underDevelopment: 'Current module is under development and encryption',
  },
  query: {
    title: 'Piecework Query',
  },
  rules: {
    title: 'Piecework Rules',
    page: {
      headerTitle: 'Piecework Rate Standards',
      headerDescription:
        'Manage {{levelName}}-level piecework unit price baselines under a controlled tracking flow.',
      statusBadge: 'Audit Tracking Active',
      searchPlaceholder: 'Search {{levelName}} names or related product SKU...',
      add: 'Add Rate Standard',
      loading: 'Syncing rate rules...',
      empty: 'No rate rules defined',
    },
    table: {
      processName: '{{levelName}} Name',
      productSku: 'Related Product SKU',
      piecePrice: 'Piece Rate',
      status: 'Status',
      actions: 'Actions',
    },
    status: {
      active: 'Active',
      inactive: 'Inactive',
    },
    dialog: {
      titleEdit: 'Edit Piecework Rate Rule',
      titleCreate: 'Define New Piecework Standard',
      description:
        'Set atomic {{levelName}}-level rates and route every change into the audit stream.',
      footerTracking: 'Rule Tracking Active',
      cancel: 'Cancel',
      save: 'Sync Rate Standard',
      fields: {
        product: 'Related Product SKU',
        processName: '{{levelName}} Name',
        piecePrice: 'Piece Rate',
        unit: 'Settlement Unit',
        status: 'Rule Status',
        remarks: 'Accounting Notes',
      },
      placeholders: {
        product: 'Select the matching product SKU',
        processName: 'Enter the {{levelName}} name',
        piecePrice: '0.00',
        unit: 'PCS / KG',
        remarks: 'Enter any special notes for this rate standard...',
      },
    },
    toast: {
      validationRequired:
        'Missing required inputs: product, {{levelName}}, or rate',
      saveSuccess: 'Piecework rate updated',
      saveFailed: 'Failed to save rate: {{message}}',
      patchSuccess: 'Rate delta synced successfully',
      patchFailed: 'Failed to sync rate delta: {{message}}',
      deleteSuccess: 'Rate item removed',
      deleteFailed: 'Failed to remove rate item: {{message}}',
    },
  },
  teams: {
    title: 'Team Management',
    page: {
      headerTitle: 'Piecework Team Management',
      headerDescription:
        'Maintain team structure, responsibility classification, and settlement ownership for piecework operations.',
      searchPlaceholder: 'Search team code, name, or section...',
      add: 'Add Team',
      confirmDelete:
        'Delete this production team? This action cannot be undone.',
      table: {
        code: 'Team Code',
        name: 'Team Name',
        step: 'Display Order',
        section: 'Section',
        type: 'Business Type',
        maintenance: 'Special Flag',
        status: 'Runtime Status',
        audit: 'Audit Record',
        commands: 'Commands',
      },
      typeLabels: {
        dispatch: 'Dispatch',
        quality: 'Quality',
        transfer: 'Transfer',
        receive: 'Receive',
      },
      maintenanceLabels: {
        true: 'Maintenance Team',
        false: 'Standard Team',
      },
      statusLabels: {
        active: 'Running',
        inactive: 'Inactive',
      },
      empty: {
        title: 'No teams matched your search',
        description: 'Try adjusting the filters or create a new team',
      },
    },
    dialog: {
      titleEdit: 'Edit Team Definition',
      titleCreate: 'Create New Work Team',
      description:
        'Define collaborative production units and improve scheduling plus piecework settlement flow.',
      footerTracking: 'Team archive sync active',
      cancel: 'Cancel',
      save: 'Sync Team',
      validationRequired:
        'Please complete the core fields: code, name, and section',
      fields: {
        code: 'Team Code',
        name: 'Team Name',
        shortName: 'Short Name',
        step: 'Display Order',
        section: 'Section',
        type: 'Team Type',
        maintenance: 'Maintenance Privilege',
        status: 'Activation Status',
        remarks: 'Notes',
      },
      placeholders: {
        code: 'e.g. G001',
        name: 'e.g. Production Dispatch Team',
        shortName: 'Enter the external system identifier',
        section: 'Select a business section',
        remarks:
          'Enter additional descriptions or special rules for this team...',
      },
      sectionOptions: {
        productionControl: 'Production Control',
        materialPrep: 'Material Prep',
        batching: 'Batching',
        molding: 'Molding',
        machining: 'Machining',
        finishing: 'Finishing',
      },
      typeOptions: {
        dispatch: 'Dispatch System',
        quality: 'Quality Inspection',
        transfer: 'Production Transfer',
        receive: 'Material Receiving',
      },
      maintenanceDescription: 'Allows repair-task routing privileges',
      statusDescription: 'Whether the team can participate in scheduling',
      statusOptions: {
        active: 'Enabled',
        inactive: 'Disabled',
      },
    },
    toast: {
      saveSuccess: 'Team data synced',
      saveFailed: 'Failed to save team: {{message}}',
      patchSuccess: 'Team delta synced',
      patchFailed: 'Failed to sync team delta: {{message}}',
      deleteSuccess: 'Team removed',
      deleteFailed: 'Failed to remove team: {{message}}',
    },
  },
  stats: {
    title: 'Piecework Stats',
  },
  validation: {
    teamCodeRequired: 'Please enter the team code',
    teamNameRequired: 'Please enter the team name',
    teamSectionRequired: 'Please enter the section',
    pieceworkRateProductRequired: 'Please select a related product SKU',
    pieceworkRateProcessNameRequired: 'Please enter a {{levelName}} name',
    pieceworkRatePriceNonNegative: 'Rate must not be negative',
  },
} as const
