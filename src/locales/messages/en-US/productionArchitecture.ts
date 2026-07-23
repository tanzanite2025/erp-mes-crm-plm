export const productionArchitecture = {
  layout: {
    title: 'Production Architecture',
    tabs: {
      mindmap: 'Line Mindmap',
      hierarchyConfig: 'Hierarchy Config',
      topology: 'Topology Templates',
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
}
