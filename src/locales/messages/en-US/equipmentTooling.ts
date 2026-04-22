export const equipmentTooling = {
  layout: {
    title: 'Equipment & Tooling Center',
    tabs: {
      overview: 'Asset Overview',
      furnaces: 'Furnace Assets',
      molds: 'Mold Archive',
      loans: 'Mold Movement',
      drawings: 'Drawing Archive',
      partners: 'Partner Registry',
    },
  },
  common: {
    unknownError: 'Unknown error',
  },
  imageUpload: {
    previewAlt: 'Image preview',
    actions: {
      replace: 'Replace',
    },
    state: {
      uploading: 'Uploading...',
      captureOrUpload: 'Capture or Upload',
      waitForSync: 'Please wait for sync',
      formatHint: 'JPG / PNG / Max 5.0MB',
    },
    toast: {
      uploaded: 'Image uploaded successfully',
      failed: 'Image upload failed: {{message}}',
    },
  },
  furnaces: {
    page: {
      title: 'Furnace Asset Repository',
      description: 'Digital heat-treatment equipment ledger',
      searchPlaceholder: 'Search by furnace serial or name...',
    },
    actions: {
      add: 'Add Furnace Asset',
    },
    confirm: {
      remove: 'Are you sure you want to remove this furnace asset?',
    },
    toast: {
      removed: 'Furnace removed',
      updated: 'Furnace profile updated',
      created: 'New furnace registered',
    },
    status: {
      idle: 'Idle',
      heating: 'Running',
      cooling: 'Cooling',
      maintenance: 'Maintenance',
      fault: 'Fault',
      unknown: 'Unknown',
    },
    card: {
      type: 'Type',
      location: 'Location',
      none: 'None',
      tempLive: 'Live Temp',
      maxTemp: '{{value}}°C max',
      sensorOffline: 'Sensor data offline',
    },
    stats: {
      totalUnits: 'Total Units',
      runningNow: 'Running Now',
      live: 'Live',
      maintenance: 'Maintenance',
      faultAlert: 'Fault Alert',
    },
    dialog: {
      title: {
        edit: 'Edit Equipment Profile',
        create: 'Register New Furnace Asset',
      },
      description: 'Input physical serial, maximum temperature, and location data',
      fields: {
        sn: 'Serial No.',
        name: 'Alias',
        type: 'Category',
        location: 'Location',
        maxTemp: 'Max Temp (°C)',
        description: 'Description',
      },
      placeholders: {
        sn: 'e.g. FURN-2024-01',
        name: 'e.g. Vacuum Furnace #1',
        type: 'e.g. Vacuum Furnace',
        location: 'e.g. Zone A',
        description: 'Detailed notes or history...',
      },
      defaults: {
        type: 'Vacuum Furnace',
      },
      validation: {
        snRequired: 'Please enter a furnace serial ID',
        nameRequired: 'Please enter a furnace name',
        typeRequired: 'Please enter a furnace category',
        maxTempPositive: 'Max temperature must be greater than 0',
      },
      actions: {
        cancel: 'Cancel',
        save: 'Save',
      },
    },
  },
  molds: {
    defaults: {
      uncategorized: 'Uncategorized',
    },
    page: {
      title: 'Mold Asset Master Archive',
      description: 'System-tracked mold lifespan and maintenance status',
      searchPlaceholder: 'Search by mold serial, name, or location...',
    },
    actions: {
      add: 'Add Mold Asset',
      addInGroup: 'Add Asset in This Group',
    },
    confirm: {
      remove: 'Are you sure you want to remove this mold asset? This action cannot be undone.',
    },
    toast: {
      removed: 'Mold asset removed',
      updated: 'Mold profile updated',
      created: 'New mold added to inventory',
    },
    status: {
      idle: 'Idle',
      inUse: 'In Production',
      checking: 'Pending Check',
      maintenance: 'Under Repair',
      retired: 'Retired',
      lentOut: 'Lent Out',
      borrowed: 'Borrowed',
      unknown: 'Unknown',
    },
    group: {
      assets: '{{count}} assets',
      grouping: 'Mold Grouping',
      sku: 'SKU:',
      expired: '{{count}} expired',
      maintain: '{{count}} maintain',
      healthy: 'Healthy',
    },
    card: {
      sn: 'SN: {{sn}}',
      masterSpec: 'Master Spec',
      sku: 'SKU',
      unset: 'Unset',
      location: 'Loc',
      pendingLocation: 'Pending',
      healthIndex: 'Health Index',
      cycles: 'C: {{current}} / L: {{limit}}',
      totalLife: 'T: {{total}}',
    },
    empty: {
      title: 'No Mold Assets',
      description: 'Click below to initialize mold asset records.',
      init: 'Initialize Inventory',
    },
    dialog: {
      title: {
        edit: 'Edit Mold Profile',
        create: 'Register Mold Asset',
      },
      description: {
        prefix: 'Enter mold identifiers and lifespan thresholds. The system will automatically trigger',
        alertCode: 'Maintenance Alert',
        suffix: 'based on cycle counts.',
      },
      healthIndex: 'Health Index',
      realtimeSync: 'Real-time Sync',
      metrics: {
        current: 'REC: {{value}}',
        total: 'MAX: {{value}}',
      },
      fields: {
        sn: 'Serial No.',
        name: 'Asset Name',
        group: 'Group Name',
        location: 'Bin Location',
        currentCycles: 'Current Cycles (Initial)',
        maxCycles: 'Lifespan',
        maintenanceThreshold: 'Alert Point',
        image: 'Main Image',
        description: 'Memo',
      },
      labels: {
        image: 'Main Asset Photo',
        linkedDrawings: 'Linked Drawings ({{count}})',
      },
      placeholders: {
        sn: 'M-2024-XXX',
        name: 'Forming mold / Injection mold...',
        newGroup: 'Enter new group name...',
        selectRegistry: 'Select from registry...',
        location: 'SECTION-A-01',
        currentCycles: 'Enter current cycle count',
        description: 'Enter specification details...',
      },
      emptyLinkedDrawings: 'No linked assets',
      actions: {
        useChooser: 'Chooser',
        newGroup: 'New Group',
        archive: 'Archive',
        cancel: 'Cancel',
        save: 'Save Profile',
      },
      validation: {
        snRequired: 'Please enter a mold serial number',
        nameRequired: 'Please enter a mold name',
        maxCyclesPositive: 'Lifespan must be greater than 0',
        maintenanceThresholdPositive: 'Alert point must be greater than 0',
        duplicateSn: 'Serial {{sn}} already exists. Please use a unique serial.',
      },
    },
  },
  partners: {
    page: {
      title: 'Partner Registry',
      description: 'Internal sites and external partner management',
    },
    actions: {
      add: 'Add Partner',
    },
    confirm: {
      remove: 'Are you sure you want to remove this partner? Historical records may fall back to the raw ID.',
    },
    toast: {
      removed: 'Partner removed',
      updated: 'Partner updated',
      created: 'New partner added',
      loadFailed: 'Failed to load partner data from the telemetry bridge',
    },
    validation: {
      nameRequired: 'Partner name is required',
    },
    types: {
      internal: 'Internal Site',
      external: 'External Partner',
      internalShort: 'Internal',
      externalShort: 'External',
    },
    dialog: {
      title: {
        edit: 'Edit Partner',
        create: 'Add Partner',
      },
      fields: {
        name: 'Partner Name',
        type: 'Partner Type',
        contact: 'Contact',
        phone: 'Phone',
        address: 'Location Notes',
      },
      placeholders: {
        name: 'Plant A / Warehouse Hub',
        contact: 'Name',
        phone: 'Phone number',
        address: 'Location or notes',
      },
      actions: {
        cancel: 'Cancel',
        save: 'Save',
      },
    },
    card: {
      contact: 'Contact',
      phone: 'Phone',
      location: 'Location',
    },
    empty: {
      title: 'Partner registry is empty',
    },
  },
  loans: {
    defaults: {
      homeFactory: 'HQ Plant 1',
    },
    page: {
      title: 'Mold Movement Records',
      description: 'Track temporary movements across plants and workshops',
      searchPlaceholder: 'Search by mold serial, mold name, or handler...',
    },
    actions: {
      add: 'Register Movement Record',
      return: 'Confirm Return',
    },
    dialog: {
      title: {
        edit: 'Edit Movement Record',
        create: 'Register Movement Record',
      },
      description: 'Track physical location changes and status synchronization of molds between units.',
      modes: {
        lend: 'Lend Out',
        borrow: 'Borrow In',
      },
      fields: {
        mold: 'Select Mold',
        fromFactory: 'From Site',
        toFactory: 'To Site',
        externalSn: 'External Mold Serial',
        moldName: 'Mold Name',
        sourceFactory: 'Source Site',
        currentCycles: 'Current Cycle Count',
        contact: 'Contact / Handler',
        loanDate: 'Movement Date',
        expectedReturnDate: 'Expected Return',
        remarks: 'Movement Notes',
        photo: 'Verification Photo',
      },
      placeholders: {
        selectMold: 'Select an idle mold asset',
        selectSourceFactory: 'Select source site',
        selectTargetFactory: 'Select destination site',
        moldSn: 'e.g. M-EXT-001',
        moldName: 'e.g. External cavity mold',
        selectPartner: 'Select partner',
        contact: 'Enter contact name',
        remarks: 'Add notes...',
      },
      actions: {
        loading: 'Loading...',
        close: 'Close',
        save: 'Save',
        create: 'Create Now',
        cancel: 'Cancel',
        submit: 'Submit {{mode}}',
      },
    },
    validation: {
      incompleteLend: 'Please complete the lend-out information.',
      incompleteBorrow: 'Please complete the borrowed-in mold information.',
    },
    confirm: {
      return: 'Confirm this mold has been returned and checked in?',
      createDescription:
        'Registering this mold movement will also synchronize the linked mold inventory status and start movement-window tracking.',
    },
    toast: {
      createdLend: 'Lend-out record created',
      createdBorrow: 'Borrow-in record created',
      returned: 'Return confirmed',
    },
    status: {
      returned: 'Returned',
      overdue: 'Overdue',
      lent: 'Lent',
      borrowed: 'Borrowed',
    },
    card: {
      photoTitle: 'Verification Photo',
      photoDescription: 'Captured during registration for visual verification.',
      path: 'Movement Path',
      agent: 'Handler',
      cycle: 'Date Window',
      returnDate: 'Return Date',
      memo: 'Memo:',
    },
    empty: {
      title: 'No movement records yet',
      description: 'Waiting for active movement records...',
    },
    borrow: {
      autoDescription: 'Borrowed from {{fromFactory}}',
    },
  },
  drawings: {
    page: {
      title: 'Drawing Archive',
      description: 'Centralized management for mold drawings and technical files',
      searchPlaceholder: 'Search by drawing name or linked mold serial...',
    },
    actions: {
      add: 'Register Drawing',
      download: 'Download File',
    },
    tooltips: {
      history: 'Audit history',
      obsolete: 'Mark obsolete',
      activate: 'Set active',
    },
    card: {
      asset: 'Asset',
      date: 'Date',
      unbound: 'Unbound',
    },
    status: {
      active: 'Active',
      obsolete: 'Obsolete',
    },
    empty: {
      title: 'Archive is empty',
    },
    dialog: {
      title: {
        edit: 'Edit Drawing',
        create: 'Upload Drawing',
      },
      fields: {
        name: 'Drawing Name',
        type: 'File Type',
        version: 'Version',
        mold: 'Linked Asset',
        source: 'Source File',
        remarks: 'Archive Notes',
      },
      placeholders: {
        name: 'e.g. 400C mold assembly drawing',
        version: 'V1.0',
        selectMold: 'Select linked asset',
        remarks: 'Revision notes or remarks...',
      },
      warnings: {
        unbindConfirm: 'Asset unbinding detected. This drawing will no longer be linked to the mold. Confirm detachment?',
      },
      actions: {
        cancel: 'Cancel',
        save: 'Save Archive',
      },
    },
    types: {
      twoD: '2D Drawing (DWG/PDF)',
      threeD: '3D Model (STP/XT)',
      techSpec: 'Technical Specification',
      other: 'Other Attachment',
    },
    options: {
      independent: 'Independent File',
    },
    source: {
      ready: 'Ready',
      archived: 'Archived file',
      reupload: 'Reupload',
      clickUpload: 'Click to upload file',
    },
    toast: {
      nameRequired: 'Please enter a drawing name.',
      fileRequired: 'Please upload a drawing file.',
      uploading: 'Uploading source file...',
      uploaded: 'File uploaded',
      updated: 'Drawing updated',
      created: 'Drawing archived',
      conflict: 'The data was updated elsewhere. Refresh and try again.',
      saveFailed: 'Save failed: {{message}}',
      statusObsolete: 'Drawing marked as obsolete',
      statusActive: 'Drawing restored to active',
    },
    validation: {
      nameRequired: 'Please enter a drawing name.',
      fileRequired: 'Please upload a drawing file.',
    },
    audit: {
      title: 'Drawing Lifecycle Audit',
      description: 'FILE_ID: {{fileId}} / ASSET: {{asset}}',
      global: 'GLOBAL_ARCHIVE',
      operator: 'OPERATOR',
      empty: 'No audit trail found for this document',
      close: 'Exit Audit View',
    },
  },
  dashboard: {
    error: {
      title: 'Telemetry link lost',
      description: 'The dashboard aggregation service is unavailable. Check the network or backend containers.',
      retry: 'Retry',
    },
    header: {
      title: 'Mold Asset Telemetry Center',
      systemHealthLabel: 'System Health Index',
      stable: 'System Stable',
      activeSensorsLabel: 'Active Sensors',
      vectors: 'vectors',
    },
    activity: {
      title: 'Activity Stream',
      live: 'Live',
      empty: 'No recent activity',
      item: '{{contactPerson}} handled asset movement - {{status}}',
    },
    summary: {
      avgLifespan: 'Avg Lifespan',
      criticalAlerts: 'Critical Alerts',
    },
    stats: {
      units: 'Units',
      saturation: 'Saturation',
      cards: {
        total: {
          title: 'Mold Inventory',
          subtext: 'Total assets',
        },
        idle: {
          title: 'Idle Assets',
          subtext: 'Waiting in storage',
        },
        production: {
          title: 'Production Active',
          subtext: 'Currently in use',
        },
        maintenance: {
          title: 'Maintenance Log',
          subtext: 'Service queue',
        },
        overdue: {
          title: 'Lending Overdue',
          subtext: 'Pending return alerts',
        },
        retired: {
          title: 'Decommissioned',
          subtext: 'Retired assets',
        },
      },
    },
    detail: {
      statusTitle: 'Status Heatmap',
      lifecycleTitle: 'Lifecycle Scan',
      labels: {
        idle: 'Idle',
        production: 'Production',
        maintenance: 'Service',
        scrapped: 'Scrapped',
      },
      avgLife: 'Average Life Consumption',
      activeAssets: 'Active Assets',
      thermalLoad: 'Thermal Load',
      normal: 'Normal',
      optimal: 'Stable',
      unitsValue: '{{value}} units / {{percentage}}%',
    },
    warnings: {
      title: 'Critical Asset Alerts',
      retired: 'Retired',
    },
  },
} as const
