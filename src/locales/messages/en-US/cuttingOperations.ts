export const cuttingOperations = {
  tabs: {
    cuttingIssuance: 'Cutting Issuance',
    productBinding: 'Product Binding',
    sizeInventory: 'Cutting Size Inventory',
  },
  productBinding: {
    header: {
      title: 'Product Binding',
      description:
        'This page binds code-center product barcodes to prepreg roll-instance QR labels that have already been activated in the prepreg page through scan plus OCR.',
    },
    cards: {
      scope: {
        title: 'Formal Business Position',
        description:
          'The formal binding target is an activated prepreg roll-instance QR record rather than a cutting issuance execution or a bare specification token.',
      },
      nextStep: {
        title: 'Current Work Object',
        description:
          'Each binding submits a product barcode together with a roll-instance QR code. One roll may serve multiple product barcodes, while one product barcode keeps only one current binding.',
      },
      boundary: {
        title: 'Stability Boundary',
        description:
          'This page prioritizes product barcode uniqueness, roll-instance validity, and consistent event history over the same roll instance.',
      },
    },
    form: {
      title: 'Formal Binding Work Area',
      description:
        'Submit the product barcode together with an activated prepreg roll-instance QR code. The system validates the roll instance and records the binding event.',
      steps: {
        step0: 'Step 00',
        step1: 'Step 01',
        step2: 'Step 02',
      },
      execution: {
        label: 'Cutting Issuance Execution',
        placeholder: 'Select a cutting issuance execution',
        hint: 'Under the formal scheme, every binding record must be attached to a cutting issuance execution.',
        loadingHint: 'Loading cutting issuance execution options...',
      },
      barcode: {
        label: 'Code-Center Linear Barcode',
        placeholder: 'Scan or enter the code-center linear barcode',
        hint: 'Supports the local camera scanner, photo recognition, a scan gun, or manual typing; use the mobile session below when no camera is available.',
      },
      qr: {
        label: 'Prepreg QR Code',
        placeholder: 'Scan or enter the prepreg QR code',
        hint: 'The system extracts the prepreg binding token from the QR content and validates its occupancy state.',
      },
      actions: {
        submit: 'Submit Binding',
        submitting: 'Submitting',
      },
    },
    mobileCapture: {
      title: 'Mobile Scan Fill-Back (Fallback)',
      description:
        'Use this fallback when the computer has no usable camera or another device should perform the scan, then fill the result back here.',
      actions: {
        create: 'Create Mobile Session',
        copyLink: 'Copy Mobile Link',
        expand: 'Expand mobile scan fill-back',
        collapse: 'Collapse mobile scan fill-back',
      },
      status: {
        idle: 'No mobile capture session has been created yet',
        created:
          'Mobile capture session created. Scan the QR code with your phone.',
        filled:
          'The mobile scan result has been received and filled back automatically.',
        expired:
          'The mobile capture session has expired. Please create a new one.',
        pollingFailed: 'Mobile capture polling failed. Please try again later.',
      },
      toasts: {
        filled: 'Mobile scan has filled back the barcode',
        createFailed: 'Failed to create the mobile capture session',
        linkCopied: 'The mobile capture link has been copied',
        copyFailed: 'Copy failed. Please copy the link manually.',
      },
      link: {
        title: 'Mobile Capture Link',
        description:
          'Open this link on your phone to launch the camera scanner and fill the result back to this page.',
      },
      page: {
        title: 'Product Barcode Scan',
        description:
          'Scan the code-center linear barcode directly. Once recognized, the result will be submitted back to the current product-binding page.',
        placeholder: 'Scan or enter the code-center linear barcode',
        actions: {
          submit: 'Submit Scan Result',
        },
        submitted: {
          title: 'Scan Result Submitted',
          description:
            'Return to the desktop page and continue the roll-instance product binding flow.',
        },
        errors: {
          missingToken:
            'The capture token is missing. Reopen the mobile capture link.',
          missingBarcode: 'Scan or enter the code-center linear barcode first.',
          submitFailed: 'Failed to submit the scan result. Please try again.',
        },
      },
    },
    feedback: {
      idle: {
        title: 'Waiting for Binding Input',
        description:
          'Provide the product barcode and an activated prepreg roll-instance QR code before submitting the formal binding.',
      },
      missingExecution: {
        title: 'Execution Missing',
        description:
          'The formal scheme requires each binding to be attached to a cutting issuance execution. Select one first.',
      },
      missingBarcode: {
        title: 'Barcode Missing',
        description:
          'Enter the code-center product barcode before submitting the formal binding.',
      },
      missingQr: {
        title: 'QR Code Missing',
        description:
          'Enter the prepreg roll-instance QR code before submitting the formal binding.',
      },
      submitting: {
        title: 'Submitting Formal Binding',
        description:
          'The system is validating product-barcode uniqueness, roll-instance activation status, and binding-event persistence. Please wait.',
      },
      success: {
        title: 'Binding Submitted Successfully',
        description:
          'The current binding state and roll-instance event trail have been written, and the page has already refreshed the latest result.',
      },
      duplicate: {
        title: 'Duplicate Submission Detected',
        description:
          'This submission matched an existing binding on the same roll, and the system has replayed the formal result from the existing event.',
      },
      conflict: {
        title: 'Product Barcode Conflict Detected',
        description:
          'This product barcode is already bound to another prepreg roll, and the system has replayed the existing binding record for review.',
      },
      error: {
        title: 'Binding Submission Failed',
        description:
          'The formal binding did not succeed. Check whether the roll-instance QR is activated, the barcode content, or the product-barcode conflict details.',
      },
      snapshot: {
        executionLabel: 'Roll Spec Snapshot',
        executionDetailLabel: 'Roll Detail Snapshot',
        barcodeLabel: 'Barcode Input Snapshot',
        qrLabel: 'QR Input Snapshot',
        tokenLabel: 'Prepreg Binding Token',
        protocolLabel: 'Barcode Protocol',
        summaryLabel: 'Barcode Summary',
        boundByLabel: 'Operator',
        bindingIdLabel: 'Binding Record ID',
        boundAtLabel: 'Bound At',
        statusLabel: 'Binding Status',
        errorLabel: 'Error Message',
      },
    },
    history: {
      title: 'Roll-Instance Binding Records',
      description:
        '{{count}} binding records are loaded for the current filters to verify roll-instance binding events.',
      loading: 'Loading roll-instance binding records...',
      empty:
        'No matching roll-instance binding records yet. Submit a formal binding first.',
      error: 'Failed to load binding records: {{message}}',
      latestBadge: 'Latest Submission',
      actions: {
        openDialog: 'View Roll-Instance Binding Records',
        copyProductBarcode: 'Copy Product Barcode',
      },
      toasts: {
        productBarcodeCopied: 'Product barcode copied.',
        copyFailed: 'Copy failed. Please try again later.',
      },
      columns: {
        prepregQrCode: 'QR Code',
        productBarcode: 'Product Barcode',
        supplierBatchNo: 'Roll Batch No',
        productionDate: 'Production Date',
        boundBy: 'Operator',
        status: 'Status',
        boundAt: 'Bound At',
      },
    },
    placeholders: {
      title: 'Reserved Capability Slots',
      barcode: 'Code-center barcode input area (pending)',
      qr: 'Prepreg QR input area (pending)',
      submit: 'Binding confirmation action area (pending)',
    },
  },
  sizeInventory: {
    header: {
      title: 'Cutting Size Inventory',
      description:
        'Size master data is read directly from the cut-size library. Pick active size units to record inventory and show current on-hand quantity.',
    },
    actions: {
      recordInventory: 'Record Inventory',
      openLibrary: 'Open Cut-Size Library',
    },
    metrics: {
      total: 'Total Sizes',
      active: 'Active Sizes',
      usageTypes: 'Usage Types',
    },
    table: {
      title: 'Size Inventory Ledger (sourced from Cut-Size Library)',
      hint: 'Inventory records are selected from cut-size library units and accumulated by inbound entry.',
      loading: 'Loading cut-size library records...',
      empty:
        'No available sizes yet. Maintain size units in Cut-Size Library first.',
      noInventory: 'No inventory record',
      noLocation: 'No location',
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
    dialog: {
      title: 'Record Cutting Size Inventory',
      unit: 'Size Unit',
      unitPlaceholder: 'Select an active cut-size library unit',
      quantity: 'Inbound Quantity',
      location: 'Location',
      locationPlaceholder: 'e.g. A-01 / cutting buffer',
      remarks: 'Remarks',
      remarksPlaceholder: 'Source, batch, or note for this entry',
      cancel: 'Cancel',
      save: 'Record',
      saving: 'Recording...',
    },
    toasts: {
      noActiveUnit:
        'No active cut-size unit is available. Maintain the cut-size library first.',
      noLibraryAccess:
        'The current account does not have access to the cut-size library.',
      selectUnit: 'Select a size unit first.',
      invalidQuantity: 'Enter an inbound quantity greater than 0.',
      recordSuccess: 'Size inventory recorded.',
    },
    status: {
      Active: 'Active',
      Inactive: 'Inactive',
      Archived: 'Archived',
    },
  },
} as const
