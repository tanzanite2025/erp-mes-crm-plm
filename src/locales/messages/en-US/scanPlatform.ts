export const scanPlatform = {
  panel: {
    title: 'Scan Platform Modules',
    description: 'This panel shows the scan-platform modules that have already been split out, along with the host page each module fits best.',
    moduleCount: '{{count}} modules',
    host: 'Host',
    mode: 'Mode',
    entryPath: 'Entry Path',
    permission: 'Permission',
    viewOnly: 'View Only',
    addToHomeScreenFallback: 'Add to Home Screen',
    modes: {
      submit: 'Submit',
      view: 'View',
    },
    hostKinds: {
      embeddedDialog: 'Embedded Dialog',
      standalonePage: 'Standalone Page',
    },
  },
  modules: {
    logisticsInbound: {
      name: 'Inbound Logistics Scan',
      description: 'Scan plugin for incoming receiving, purchase-logistics binding, and pre-inbound validation.',
      hostLabel: 'Purchase Logistics Dialog',
      statusLabel: 'Ready to Integrate',
      targetLabel: 'Purchase Logistics Host Page',
      openLabel: 'Open Host Page',
      notes: [
        'The integration flow is already in place, so this module can plug directly into the existing purchase logistics dialog.',
        'Keep the host form as the primary surface, and let scanning fill only the tracking number, carrier, and submission draft.',
      ],
    },
    wheelTrace: {
      name: 'Wheel Trace',
      description: 'Scan plugin for querying the current stage, history timeline, and latest handling record of a wheel.',
      hostLabel: 'Standalone Trace Page',
      statusLabel: 'Live API',
      targetLabel: 'Wheel Trace Lookup',
      openLabel: 'Open Standalone Page',
      addToHomeScreenLabel: 'Add to Home Screen',
      notes: [
        'It already uses the real backend lookup API and currently returns barcode parsing, product matching, and production topology anchors.',
        'When real station-pass records are added later, only the backend data source needs to expand without rebuilding the standalone shell.',
      ],
    },
  },
} as const
