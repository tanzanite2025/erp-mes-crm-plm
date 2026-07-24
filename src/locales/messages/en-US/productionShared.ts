export const productionShared = {
  workArchitecture: {
    title: 'Work Architecture Center',
    description:
      'Bind action capabilities and standard entries to organize the operating backbone by the current hierarchy.',
    searchPlaceholder: 'Search by code or name...',
    loadFailed:
      'Failed to load structure data. Please check the network connection.',
    emptyTitle: 'No matching structures',
    emptyDescription: 'Create hierarchy structures in “Line Mindmap” first.',
    treeEmptyDynamic: 'No {{level1Name}} / {{level2Name}} structure data',
    assignAction: 'Assign Action',
    assignActionSuccess:
      'Command [{{command}}] assigned to {{levelName}}: {{name}}',
    unconfiguredLevel: 'No {{levelName}} configured',
    addLevel: 'Add {{levelName}}',
    assignLevelCapability: 'Assign {{levelName}} Capability',
    allLevelsMapped: 'All global {{levelName}} entries are already mapped.',
    noLevelMapped: 'No {{levelName}} capability mapped',
  },
} as const
