export const terminalConfig = {
  moduleTitle: 'Terminal Config',
  tabs: {
    printers: 'Printer Drivers',
    pda: 'PDA Terminal',
    scanners: 'Scanner Devices',
    mobileCapture: 'Mobile Capture',
    downloads: 'Driver Downloads',
    guides: 'Install Guides',
  },
  shared: {
    statusPendingUpload: 'Pending Upload',
    statusPlanned: 'Planned',
    versionLabel: 'Version',
    packageTypeLabel: 'Type',
    downloadPending: 'Download Coming Soon',
    viewGuide: 'View Setup Guide',
  },
  pages: {
    printers: {
      title: 'Printer Drivers',
      description:
        'Central hub for printer drivers, setup tools, and release packages.',
      summary:
        'This page is separate from the print center: the print center manages templates and records, while this area manages terminal-side drivers and access packages. Once the official drivers are uploaded, you only need to replace the download links in the static list.',
    },
    scanners: {
      title: 'Scanner Devices',
      description:
        'Covers access instructions and parameter templates for barcode scanners, fixed scan heads, and scan modules.',
      summary:
        'Scanner integration is best standardized as HID enter mode or explicit serial protocol templates, so forms, production pages, and PDA scanning can all share the same contract.',
    },
    downloads: {
      title: 'Driver Downloads',
      description:
        'A unified download area for printers, PDA devices, and scanner hardware so on-site rollout stays fast and consistent.',
      summary:
        'The first version already reserves a shared download area and categorized cards. Later, if your team stores packages in a company drive, OSS, or an internal file server, you only need to fill in the download URLs.',
    },
    guides: {
      title: 'Install Guides',
      description:
        'Collects deployment order, acceptance checks, and operational notes for printers, PDA terminals, and scanner devices.',
    },
  },
  resources: {
    common: {
      placeholderVersion: 'v1.0 Placeholder',
      windowsDriverPackage: 'Windows Driver Package',
      desktopDebugTool: 'Desktop Debug Tool',
      androidPda: 'Android PDA',
      terminalPackage: 'Terminal Package',
      operationManual: 'Operation Manual',
      configGuide: 'Configuration Guide',
      parameterTemplate: 'Parameter Template',
    },
    printers: {
      labelPrinters: {
        title: 'Label Printers',
        description:
          'Used for finished-goods labels, barcode reprints, and batch relabeling scenarios.',
        items: {
          tsc: {
            title: 'TSC Label Printer Universal Driver',
            target: 'TSC / TTP / TDP Series',
            note: 'Recommended to be released together with the print-center template package. After upload, the download link can be replaced directly.',
          },
          zebra: {
            title: 'Zebra Industrial Printer Driver',
            target: 'Zebra ZT / GK Series',
            note: 'Well suited for warehouse and production-line label printing workflows.',
          },
        },
      },
      debugTools: {
        title: 'Printer Debug Tools',
        description:
          'Used for port inspection, paper calibration, and print self-checks.',
        items: {
          portTool: {
            title: 'Printer Port Debug Utility',
            target: 'USB / Network Printers',
            note: 'Recommended to ship together with print-center setup, reducing cases where templates are correct but the driver path is not connected.',
          },
        },
      },
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
    scanners: {
      deviceModules: {
        title: 'Scanners and Scan Modules',
        description:
          'Covers HID keyboard mode, serial mode, and fixed scan-head debugging.',
        items: {
          scannerGuide: {
            title: 'Scanner Configuration Manual',
            target: 'USB HID Scanner',
            note: 'It is recommended to default to enter-suffix mode so ERP forms can receive scans directly.',
          },
          fixedHeadTemplate: {
            title: 'Fixed Scan Head Serial Template',
            target: 'Serial / Network Scan Head',
            note: 'Designed for production or automated trigger-based collection scenarios.',
          },
        },
      },
    },
  },
  guides: {
    printerFlow: {
      title: 'Printer Setup Flow',
      description:
        'Install the driver first, then complete template alignment.',
      points: [
        'Confirm whether the printer uses USB or network access before selecting the matching driver package.',
        'After the driver is installed, validate templates, paper size, and print direction in the print center.',
        'Only notify the site team to deploy at scale after integration passes, to avoid editing templates while drivers are still being installed.',
      ],
    },
    pdaFlow: {
      title: 'PDA Go-Live Flow',
      description:
        'Prioritize network connectivity, scanner-key mapping, and shell-browser configuration.',
      points: [
        'A fixed browser or shell app is recommended so the home page lands directly on the business workflow with fewer navigation layers.',
        'On site, validate Wi-Fi roaming, offline cache behavior, and resynchronization after reconnect.',
        'When scanning rules change, update the terminal guide and training checklist at the same time.',
      ],
    },
    scannerChecklist: {
      title: 'Scanner Acceptance Checklist',
      description:
        'Helps catch hidden issues where the scanner works in isolation but breaks the real workflow.',
      points: [
        'Confirm whether a scan automatically appends Enter, so operators do not have to submit manually every time.',
        'Confirm recognition rates for linear barcodes, DM codes, and low-quality labels.',
        'Confirm compatibility with page inputs, modal forms, and batch-operation modes.',
      ],
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
      submitQueued: 'Scan submission failed and was moved into the retry queue',
      clearSceneQueue: 'Cleared the {{scene}} queue',
      clearAllQueue: 'Cleared all retry queues',
    },
  },
} as const
