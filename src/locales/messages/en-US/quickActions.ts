export const quickActions = {
  drawer: {
    title: 'Quick Scan',
    description:
      'Show the scan actions that the current account can enter directly based on granted permissions.',
    emptyTitle: 'No quick actions available',
    emptyDescription:
      'The current account is not authorized for any quick scan entry.',
    close: 'Close Quick Actions',
    install: {
      action: 'Add to Home',
      installed: 'Installed',
      guide: 'Install Guide',
      success:
        'Install prompt opened. Follow the browser prompt to finish adding it.',
      fallbackTitle: 'Add to Home Screen manually',
      compatibilityHint:
        'Browsers may show this as a desktop icon, long-press shortcut, or in-app quick action depending on support.',
    },
  },
  handle: {
    label: 'Quick Scan',
    ariaLabel: 'Open quick scan actions',
  },
  actions: {
    wheelTraceScan: {
      title: 'Wheel Trace',
      description:
        'Open the camera to scan a wheel barcode and query the current hierarchy anchor and trace timeline.',
    },
    warehouseInboundScan: {
      title: 'Inbound Scan',
      description:
        'Open warehouse inbound scanning mode directly for rapid receiving.',
    },
    warehouseShipmentScan: {
      title: 'Shipment Scan',
      description:
        'Open warehouse shipment scanning mode directly for rapid outbound processing.',
    },
    warehouseStocktakeScan: {
      title: 'Stocktake Scan',
      description: 'Open PDA stocktake scanning mode directly.',
    },
    personalWorkbenchPhoto: {
      title: 'Personal Photo',
      description:
        'Open the personal buffer camera flow and save the on-site photo as a local draft.',
    },
    personalWorkbenchVideo: {
      title: 'Personal Video',
      description:
        'Open the personal buffer video flow and save the on-site clip as a local draft.',
    },
    personalWorkbenchBuffer: {
      title: 'Personal Buffer',
      description:
        'Open your personal record buffer to review and handle local drafts.',
    },
  },
} as const
