export const terminalConfig = {
  moduleTitle: 'Terminal Config',
  tabs: {
    pda: 'PDA Terminal',
    scanners: 'USB Scanner Config',
    mobileCapture: 'Mobile Capture',
  },
  shared: {
    statusPendingUpload: 'Pending Upload',
    statusPlanned: 'Planned',
    versionLabel: 'Version',
    packageTypeLabel: 'Type',
  },
  pages: {
    scanners: {
      title: 'USB Scanner Config',
      description:
        'Focused only on USB HID keyboard-mode scanners for access testing, Enter-suffix validation, and barcode protocol alignment.',
      summary:
        'This page does not cover fixed scan heads, scan modules, or serial devices. It is dedicated to validating the USB scanner keyboard-input path so ERP pages can receive scan results consistently.',
    },
  },
  resources: {
    common: {
      placeholderVersion: 'v1.0 Placeholder',
      androidPda: 'Android PDA',
      terminalPackage: 'Terminal Package',
      operationManual: 'Operation Manual',
    },
    pda: {
      workTerminals: {
        title: 'PDA Work Terminals',
        description:
          'Suitable for inbound, outbound, stocktake, and on-site scanning operations.',
        items: {
          browserShell: {
            title: 'PDA Browser Shell Package',
            note: 'Used to configure fullscreen mode, fixed homepage behavior, and automatic scanner-key wakeup.',
          },
          offlineGuide: {
            title: 'PDA Offline Cache Guide',
            note: 'Describes offline caching, reconnect synchronization, and exception retry behavior.',
          },
        },
      },
    },
  },
  pda: {
    page: {
      title: 'PDA Terminal',
      description:
        'PDA scan workbench that calls /pda/ingest directly and reuses persisted barcode protocol defaults from the backend.',
      openShell: 'Open Scan Terminal',
      configLoading: 'Config Loading',
      configReady: 'Config Ready',
      autoSubmitOn: 'Auto Submit On',
      autoSubmitOff: 'Auto Submit Off',
    },
    workbench: {
      title: 'Scan Ingest Workbench',
      description:
        'Raw values collected by the phone camera, PDA scanner head, or barcode scanner all enter the unified ingest pipeline here.',
      inputTitle: 'Camera / Scanner Input',
      inputDescription:
        'Scanned values keep their raw input first, then the backend parses the protocol, routes the business scene, and broadcasts to the PC side.',
      autoSubmit: 'Auto Submit',
      saveDefaults: 'Save Defaults',
      inputPlaceholder:
        'Scan or enter a raw barcode, for example 25010101R140001',
    },
    fields: {
      symbology: 'Symbology',
      symbologyPlaceholder: 'Select symbology',
      scene: 'Scene',
      scenePlaceholder: 'Select scene',
      deviceId: 'Device ID',
      scannedQty: 'Scanned Qty',
      taskId: 'Task ID',
      taskIdPlaceholder: 'Stocktake task ID',
      materialCode: 'Material Code',
      batchNo: 'Batch No',
      batchNoPlaceholder: 'Optional batch number',
    },
    sceneOptions: {
      general: 'General Ingest',
      stocktake: 'Stocktake Bridge',
      production: 'Production',
      traceability: 'Quality Traceability',
    },
    routing: {
      title: 'Routing Readiness',
      ready: 'The current payload is ready for stocktake bridging.',
      idle: 'The current payload will only go through ingest parsing and broadcasting, without submitting stocktake results.',
      submit: 'Submit Ingest',
    },
    defaults: {
      title: 'Protocol Defaults',
      description:
        'Defaults come from backend persisted config instead of living only in the page.',
      sequenceRule: 'Sequence Rule',
      sequenceRuleHint:
        'The PDA page reads ingestDefaults directly from this protocol set and can write updated device defaults back.',
      payloadPreview: 'Payload Preview',
    },
    payload: {
      rawCode: 'Raw Code',
      symbology: 'Symbology',
      scene: 'Scene',
      deviceId: 'Device ID',
      taskId: 'Task ID',
      materialCode: 'Material Code',
      batchNo: 'Batch No',
      scannedQty: 'Scanned Qty',
    },
    response: {
      title: 'Ingest Response',
      description:
        'Shows backend parsing results, matched product or material records, and whether the payload was bridged into stocktake submission.',
      bridged: 'Bridged',
      ingestOnly: 'Ingest Only',
      productionDate: 'Production Date',
      shortTag: 'Short Tag',
      year: 'Year',
      month: 'Month',
      day: 'Day',
      model: 'Model',
      appearance: 'Appearance',
      holePrefix: 'Hole Prefix',
      holes: 'Holes',
      serial: 'Serial',
      product: 'Product',
      material: 'Material',
      empty:
        'No ingest has been submitted yet. After scanning, protocol parsing, product matching, and bridge results will appear here.',
    },
    toast: {
      rawCodeRequired: 'Please collect or enter a barcode first.',
      submitSuccess: 'Scan data has entered the ingest pipeline',
      submitFailed: 'Failed to submit ingest',
      saveDefaultsSuccess:
        'PDA default ingest settings were written back to the protocol config',
      saveDefaultsFailed: 'Failed to save PDA default settings',
    },
  },
  pdaShell: {
    page: {
      badge: 'PDA Scan Shell',
      title: 'Minimal Resident Scan Shell',
      description:
        'Submits to /pda/ingest automatically by default. Failed scans are queued by scene, duplicates are merged, and retries resume when the device is back online.',
      online: 'Online',
      offline: 'Offline',
      configLoading: 'Config Loading',
      configReady: 'Config Ready',
      wakeLockOn: 'Wake Lock On',
      keepAwake: 'Keep Awake',
      wakeLockOff: 'Wake Lock Off',
    },
    actions: {
      enterLockMode: 'Enter Lock Mode',
      exitLockMode: 'Exit Lock Mode',
      keepAwakeOn: 'Disable Keep Awake',
      keepAwakeOff: 'Enable Keep Awake',
      wakeScanner: 'Wake Scanner',
      retryScene: 'Retry Current Scene',
      clearSceneQueue: 'Clear Current Scene Queue',
      clearAllQueue: 'Clear All Queues',
      openWorkbench: 'Open Workbench',
      backToWorkbench: 'Back To Workbench',
      retry: 'Retry',
      drop: 'Drop',
      retryBucket: 'Retry This Scene',
    },
    input: {
      placeholder: 'Scan a barcode to auto-submit, for example 25010101R140001',
    },
    status: {
      title: 'Scan Status',
      waiting: 'Waiting For Scan',
      hotkeyWake: 'Hardware key woke the scanner',
      manualWake: 'Scanner window was opened manually',
      retrySuccess: 'Retry succeeded: {{code}}',
      duplicateQueued: 'Duplicate failures merged: {{code}} x{{count}}',
      queuedByScene:
        'Submission failed and was added to the {{scene}} retry queue',
    },
    stats: {
      autoSubmitTitle: 'Auto Submit',
      autoSubmitValue: 'On',
      autoSubmitHint: 'Auto-sends 220ms after scan',
      currentSceneTitle: 'Current Scene',
      currentSceneHint: 'Pending retries for the current scene',
      retryQueueTitle: 'Retry Queue',
      retryQueueHintRetrying: 'Retrying in the background',
      retryQueueHintIdle: 'Failed tasks are stored locally',
      wakeTitle: 'Wake / Hotkey',
      wakeReady: 'Ready',
      wakeBestEffort: 'Best Effort',
      wakeHint: 'Volume key wake depends on browser and device capabilities',
    },
    queue: {
      sceneBucketsTitle: 'Scene Buckets',
      sceneDuplicateSummary: 'Merged duplicates: {{count}}',
      pendingTitle: 'Pending Retries',
      pendingLine:
        'Attempts {{attempts}} / duplicates {{duplicates}} / {{error}}',
      waitingRetry: 'waiting retry',
    },
    hints: {
      lockMode:
        'Volume-key wake depends on whether the device browser dispatches hardware-key events. A web page cannot wake itself from a true screen-off system state, so the current approach combines foreground lock mode, keep-awake behavior, and best-effort hotkey interception.',
    },
    toast: {
      scanCollected: 'Scan captured',
      submitFailed: 'Production scan execution failed',
      submitQueued: 'Scan submission failed and was moved into the retry queue',
      clearSceneQueue: 'Cleared the {{scene}} queue',
      clearAllQueue: 'Cleared all retry queues',
    },
  },
} as const
