export const productionArchitecture = {
  layout: {
    title: 'Production Architecture',
    tabs: {
      mindmap: 'Line Mindmap',
      topology: 'Topology Templates',
      routes: 'Production Routes',
    },
  },
  mindmap: {
    header: {
      title: 'Line Mindmap',
      subtitle:
        'Validate a constrained mindmap editor with {{level1Name}} / {{level2Name}} / {{level3Name}} as the hierarchy backbone',
    },
    actions: {
      currentLine: 'Current Line',
      linePlaceholder: 'Select a line to view',
      addLine: 'Add Line',
      lineActions: 'Current Line Actions',
      editLine: 'Edit Line Profile',
      enableLine: 'Enable Current Line',
      disableLine: 'Disable Current Line',
      deleteLine: 'Delete Current Line',
      editNode: 'Edit Current Node',
      noManagePermission:
        'The current account cannot create or delete production lines',
      noUpdatePermission:
        'The current account cannot modify production line structure',
      noStatusPermission:
        'The current account cannot change production line status',
    },
  },
  routes: {
    title: 'Production Routes',
    description:
      'Maintain product L3 order and execution mode. Routes reference configured L2 + L3 nodes from the line mindmap without editing line topology.',
    searchPlaceholder: 'Search route code, name, or product...',
    add: 'New Production Route',
    empty: 'No production routes',
    noDescription: 'No route description',
    productUnbound: 'Product not bound',
    stepCount: '{{count}} process steps',
    moreSteps: '{{count}} more steps',
    noManagePermission: 'The current account cannot manage production routes',
    deleteConfirm:
      'Delete production route “{{name}}”? This action cannot be undone.',
    statuses: {
      DRAFT: 'Draft',
      PUBLISHED: 'Published',
      ARCHIVED: 'Archived',
    },
    executionModes: {
      IN_HOUSE: 'In-house',
      OUTSOURCE_ALLOWED: 'Outsource allowed',
      OUTSOURCE_REQUIRED: 'Outsource required',
    },
    qualityGates: {
      NONE: 'No inspection',
      OPTIONAL: 'Optional inspection',
      REQUIRED: 'Required inspection',
    },
    steps: {
      title: 'Route Steps',
      description:
        'Steps reference L2 and L3 nodes from the line mindmap; L3 archives are not duplicated here.',
      add: 'Add Step',
      empty: 'No route steps yet. Add the first L3 step.',
      noSegments:
        'No usable L2 + L3 nodes are available in the line mindmap. Configure the structure first.',
      segment: 'Select L2',
      process: 'Select L3',
      noProcess: 'No L3 on this L2',
      minutes: 'Minutes',
      transfer: 'Transfer after completion',
    },
    dialog: {
      createTitle: 'New Production Route',
      editTitle: 'Edit Production Route',
      description:
        'The route is the process-order master data for future production execution and outsourcing tasks.',
      save: 'Save Route',
    },
    fields: {
      name: 'Route Name',
      namePlaceholder: 'e.g. Standard carbon-fiber rim route',
      code: 'Route Code',
      status: 'Status',
      productName: 'Product / Model',
      productPlaceholder:
        'Enter a model name first; bind the product ID after product master integration',
      description: 'Description',
    },
    toasts: {
      saved: 'Production route saved',
      saveFailed: 'Failed to save production route',
      deleted: 'Production route deleted',
      deleteFailed: 'Failed to delete production route',
    },
  },
}
