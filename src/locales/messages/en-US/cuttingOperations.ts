export const cuttingOperations = {
  tabs: {
    cuttingIssuance: 'Cutting Issuance',
    sizeInventory: 'Cutting Size Inventory',
  },
  sizeInventory: {
    header: {
      title: 'Cutting Size Inventory',
      description:
        'Size master data is read directly from the cut-size library. Inventory quantity will be connected to stock deduction in a later phase.',
    },
    metrics: {
      total: 'Total Sizes',
      active: 'Active Sizes',
      usageTypes: 'Usage Types',
    },
    table: {
      title: 'Size Inventory Ledger (sourced from Cut-Size Library)',
      hint: 'This view only shows size source records; no mock inventory is written.',
      loading: 'Loading cut-size library records...',
      empty: 'No available sizes yet. Maintain size units in Cut-Size Library first.',
      pendingInventory: 'Pending inventory engine',
      error: 'Failed to load size inventory: {{message}}',
      columns: {
        code: 'Size Code',
        name: 'Size Name',
        size: 'Size Expression',
        usage: 'Usage',
        sourceStatus: 'Source Status',
        inventoryQty: 'Inventory Qty',
      },
    },
    status: {
      Active: 'Active',
      Inactive: 'Inactive',
      Archived: 'Archived',
    },
  },
} as const
