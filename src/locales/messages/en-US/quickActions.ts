export const quickActions = {
  drawer: {
    title: 'Quick Scan',
    description: 'Show the scan actions that the current account can enter directly based on granted permissions.',
    emptyTitle: 'No quick actions available',
    emptyDescription: 'The current account is not authorized for any quick scan entry.',
    close: 'Close Quick Actions',
  },
  handle: {
    label: 'Quick Scan',
    ariaLabel: 'Open quick scan actions',
  },
  actions: {
    warehouseInboundScan: {
      title: 'Inbound Scan',
      description: 'Open warehouse inbound scanning mode directly for rapid receiving.',
    },
    warehouseShipmentScan: {
      title: 'Shipment Scan',
      description: 'Open warehouse shipment scanning mode directly for rapid outbound processing.',
    },
    warehouseStocktakeScan: {
      title: 'Stocktake Scan',
      description: 'Open PDA stocktake scanning mode directly.',
    },
  },
} as const
