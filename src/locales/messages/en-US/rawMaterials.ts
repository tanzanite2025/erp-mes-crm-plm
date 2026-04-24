export const rawMaterials = {
  moduleTitle: 'Raw Material Management',
  tabs: {
    catalog: 'Prepreg',
    batchEngine: 'Batch Split Engine',
    cutSizeLibrary: 'Cut Size Library',
    cuttingPlan: 'Cutting Plan',
  },
  catalog: {
    hero: {
      title: 'Prepreg Master Catalog',
      description:
        'Maintain prepreg material definitions only: product code, name, display alias, supplier mapping, resin content, width, and qualified area.',
    },
    metrics: {
      total: 'Specs',
      active: 'Active',
      dimensionReady: 'Dimension Ready',
    },
    flow: {
      definition: {
        label: 'Definition',
        value: 'Code / Name / Display Alias / Supplier',
      },
      dimension: {
        label: 'Dimension',
        value: 'Width / Qualified Area / Derived Roll Length',
      },
      recognition: {
        label: 'Recognition Rule',
        value: 'No conversion in OCR, clean before save',
      },
      scope: {
        label: 'Current Scope',
        value: 'Raw-material definition only',
      },
    },
    searchPlaceholder:
      'Search by product code, name, display alias, or supplier label',
    loading: 'Loading prepreg specs...',
    empty: {
      title: 'No prepreg specs yet',
      description:
        'Start with product code, product name, width, and resin/batch fields from the supplier label.',
    },
    table: {
      columns: {
        product: 'Product & Alias',
        material: 'Fiber / Resin',
        dimension: 'Width / Qualified Area',
        production: 'Production',
        actions: 'Actions',
      },
      summaryEmpty: 'No summary',
      length: 'Derived Length',
      inspector: 'Inspector',
      boxNo: 'Box',
      fallback: {
        fiberModel: 'Fiber model not filled',
        resin: 'Resin info not filled',
        width: 'Width not filled',
        area: 'Qualified area not filled',
        productionDate: 'Production date not filled',
        inspection: 'Inspection info not filled',
      },
    },
    dialog: {
      titleCreate: 'New Prepreg Spec',
      titleEdit: 'Edit Prepreg Spec',
    },
    form: {
      code: {
        label: 'Product Code',
        placeholder: 'e.g. CFS-247-75',
      },
      name: {
        label: 'Product Name',
        placeholder: 'e.g. UD prepreg',
      },
      displayAlias: {
        label: 'Display Alias (for issuance/print)',
        placeholder: 'e.g. C24T-75 Main Ply',
      },
      supplier: {
        label: 'Supplier (system reference)',
        placeholder: 'Select supplier',
        loading: 'Loading suppliers...',
        empty: 'No selectable supplier',
        legacyPrefix: 'Legacy',
        legacyIdPrefix: 'Legacy supplier',
      },
      fiberModel: {
        label: 'Fiber Model',
        placeholder: 'e.g. T700 / T800 / 40F',
      },
      resinContentBatchRaw: {
        label: 'Resin Content / Batch (label raw)',
        placeholder: 'e.g. 37%/260204',
      },
      widthMm: {
        label: 'Width',
        placeholder: 'e.g. 1000',
      },
      nominalAreaM2: {
        label: 'Qualified Area (m2)',
        placeholder: 'e.g. 150',
      },
      inspector: {
        label: 'Inspector',
        placeholder: 'e.g. Z',
      },
      boxNo: {
        label: 'Box No',
        placeholder: 'e.g. 23',
      },
      productionDate: {
        label: 'Production Date',
        placeholder: 'e.g. 2026-03-06',
      },
      status: {
        label: 'Status',
      },
      description: {
        label: 'Remarks',
        placeholder: 'Optional notes for supplier, quality, or usage constraints',
      },
    },
    cleanedPreview: {
      title: 'Normalized Data (saved as below)',
      description:
        'OCR keeps label values as-is. This section unifies units and derives dimensions for downstream use.',
      resinContent: 'Normalized Resin Content',
      supplierBatchNo: 'Normalized Batch No',
      widthMm: 'Normalized Width',
      lengthM: 'Normalized Roll Length',
      nominalAreaM2: 'Normalized Qualified Area',
      resinDerivation: 'Resin source: ',
      resinDerivationManual: 'manual split fields',
      resinDerivationFromRaw: 'split from raw "resin content/batch" text',
      dimensionDerivationLabel: 'Dimension source: ',
      dimensionDerivation: {
        manual: 'manual / label direct input',
        lengthFromArea: 'derive length from area + width',
        areaFromLength: 'derive area from length + width',
        widthFromAreaAndLength: 'derive width from area + length',
      },
      notes: {
        resinContentMissing:
          'Resin content could not be parsed from label text. Please verify manually.',
        supplierBatchMissing:
          'Batch number could not be parsed from label text. Please verify manually.',
        areaMismatch:
          'Area and width/length are inconsistent. Manual values were kept. Please verify label units.',
      },
    },
    status: {
      active: 'Active',
      inactive: 'Inactive',
      archived: 'Archived',
    },
    actions: {
      create: 'Add Prepreg Spec',
      save: 'Save Spec',
      saving: 'Saving...',
      cancel: 'Cancel',
    },
    toasts: {
      created: 'Prepreg spec created',
      updated: 'Prepreg spec updated',
      recognizedApplied: 'Recognized fields applied. Please verify before saving.',
      requiredCodeAndName: 'Please fill in product code and product name first.',
    },
    ocr: {
      title: 'Label Photo Recognition',
      description:
        'Upload directly on desktop, or generate a mobile capture link and submit back to this dialog.',
      waitingImage: 'Waiting for label image',
      previewAlt: 'Prepreg label preview',
      textPlaceholder:
        'Paste OCR text, for example: Product code CFS-247-75, resin content/batch 37%/260204, width 1000MM, qualified area 150m2, inspector Z, box 23, production date 2026-03-06.',
      emptyParsedFields: 'No parsed fields',
      mobile: {
        title: 'Scan by Mobile',
        description:
          'The link is valid for 30 minutes. This dialog will receive fields automatically after submit.',
      },
      message: {
        idle:
          'After upload, you can paste/correct OCR text, then apply fields into the form in one click.',
        mobileSubmitted:
          'Mobile result received. Please verify fields before saving.',
        mobilePollingFailed:
          'Polling mobile session failed. You can regenerate a new link.',
        localUploaded:
          'Label image loaded. Please verify OCR text and then apply.',
        localUploadFailed:
          'Failed to read label image. Please retry or fill manually.',
        mobileSessionCreated:
          'Mobile capture link generated. Scan and submit from your phone.',
      },
      actions: {
        localUpload: 'Upload Local',
        mobileCapture: 'Mobile Capture',
        parseAndApply: 'Parse & Apply',
        copyLink: 'Copy Link',
        reading: 'Reading...',
      },
      toasts: {
        noFields: 'No parsed fields yet. Please paste or edit OCR text first.',
        mobileApplied: 'Mobile recognized fields have been applied.',
        mobileSessionFailed: 'Failed to create mobile capture link.',
        linkCopied: 'Capture link copied',
        copyFailed: 'Copy failed. Please copy the link manually.',
      },
    },
    mobileCapture: {
      title: 'Prepreg Label Capture',
      description:
        'Take a photo for traceability, then paste or type label text. The system extracts fixed fields.',
      previewAlt: 'Label photo preview',
      imagePlaceholder: 'Take or upload label',
      textTitle: 'Label Text',
      textPlaceholder:
        'Paste OCR text here or type manually: product code CFS-247-75, resin content/batch 37%/260204, width 1000MM, qualified area 150m2, inspector Z, box 23, production date 2026-03-06.',
      actions: {
        submit: 'Submit to Desktop',
      },
      submitted: {
        title: 'Submitted',
        description:
          'The desktop prepreg dialog will receive the recognized fields automatically.',
      },
      errors: {
        missingToken:
          'Capture link is missing token. Please regenerate from desktop.',
        emptyFields:
          'No parsed fields yet. Please input or paste label text first.',
        submitFailed: 'Submit failed. Please retry.',
      },
    },
  },
  batchEngine: {
    title: 'Batch Split Engine',
    description:
      'Reserve a dedicated workspace for roll-based cutting simulation, strip-first planning, and issuance linkage.',
    status: 'Structure Ready',
    sections: {
      control: {
        kicker: 'Input Side',
        title: 'Roll and Rule Setup',
        description:
          'This side will later host roll selection, NFC binding, cutting-plan selection, and rule inputs.',
        fields: {
          prepregRef: 'Reference Prepreg Roll Spec',
          rollWidth: 'Roll Width (mm)',
          rollLength: 'Roll Length (m)',
          knifeGap: 'Knife Gap (mm)',
          edgeTrim: 'Edge Trim (mm)',
          cutSizeRef: 'Reference Cut-Size Unit',
        },
        placeholders: {
          loading: 'Loading...',
          selectPrepreg: 'Select prepreg spec',
          selectCutSize: 'Select size unit',
          none: 'No reference (allow empty)',
        },
        prepregSummary: {
          prefix: 'Referenced roll spec',
          empty: 'Empty is allowed. Once selected, this page only reads roll width and roll length from prepreg master data.',
        },
        cutSizeSummary: {
          angle: 'Angle',
          layup: 'Layup',
          usage: 'Usage',
          empty: 'After selecting a size unit, the simulation updates in real time using strip-first rules.',
        },
        blocks: {
          roll: {
            title: 'Active Roll',
            value: 'Select the specific prepreg roll before calculation',
            hint: 'Roll instance, NFC tag, remaining area/length, thaw window, and storage state will be surfaced here.',
          },
          rollSpec: {
            title: 'Read-Only Roll Dimensions',
          },
          plan: {
            title: 'Cutting Sheet',
            value: 'Load one cutting plan and structure the cut rules line by line',
            hint: 'Angle, layup count, strip-first mode, edge trim, and stagger offsets will be converted into structured rules.',
          },
          engine: {
            title: 'Engine Assumptions',
          },
        },
      },
      stage: {
        kicker: 'Simulation Stage',
        title: 'Roll-to-Strip Cutting Preview',
        description:
          'The center stage is reserved for visual simulation instead of simple table math, because the real process is strip-first cutting with visible loss.',
        rollCanvasLabel: 'Simulation Canvas',
        rollCanvasHint: 'A future visual engine will show one roll, first cuts, strip layout, piece splitting, and loss areas.',
        simulationStatus: 'Preview Skeleton',
        computedStatus: 'Strip-First Calculated',
        openCanvas: 'Open CANVAS Preview',
        pendingHint: 'Waiting for input parameters',
        unitPrefix: 'Size Unit',
        pieceCountPrefix: 'Pieces',
        stats: {
          stripCount: 'Strip Count',
          piecesPerStrip: 'Pieces / Strip',
          executableSets: 'Executable Sets',
          leftoverWidth: 'Leftover Width (mm)',
          leftoverLength: 'Leftover Length (mm)',
        },
      },
      summary: {
        kicker: 'Output Side',
        title: 'Execution Summary and Linkage',
        description:
          'This side will summarize executable quantities, loss notes, and how the result flows into cutting issuance.',
        cards: {
          output: {
            title: 'Planned Output',
            value: 'Keep this area for executable quantity, remaining roll capacity, and loss breakdown.',
            hint: 'The first version should report the maximum executable quantity for the selected roll instead of the whole order quantity.',
          },
          linkage: {
            title: 'Issuance Flow',
            step1: '1. Select the actual prepreg roll and cutting sheet.',
            step2: '2. Simulate strip cuts, layup, angle cuts, and loss.',
            step3: '3. Send the executable quantity into cutting issuance as the current run.',
          },
        },
        todoTitle: 'Reserved Topics',
      },
    },
    metrics: {
      roll: {
        label: 'Roll Basis',
        value: 'One physical roll',
        hint: 'Do not calculate against the full sales-order quantity by default.',
      },
      mode: {
        label: 'Planning Mode',
        value: 'Strip first, then split',
        hint: 'Model the real cutting path: first long strips, then secondary piece splitting.',
      },
      loss: {
        label: 'Loss Model',
        value: 'Angle / layup / trim',
        hint: 'Loss is not just net area. Fold corners, staggered cuts, and angle envelopes must be included.',
      },
    },
    rules: {
      stripFirst: 'Strip-First Planning',
      angleAware: 'Angle-Aware Cutting',
      layupAware: 'Layup-Aware Rules',
      lossAware: 'Loss Included',
    },
    legend: {
      roll: 'Roll body',
      strip: 'Primary strip',
      piece: 'Split piece',
      loss: 'Loss zone',
    },
    preview: {
      roll: {
        title: 'Prepreg Roll Mockup',
        size: '150m x fixed width',
      },
      strips: {
        primary: {
          title: 'Primary strip path',
          subtitle: 'Cut one long strip first, then split blocks from the strip.',
          lossHint: 'Edge trim + knife gap',
        },
        angle: {
          title: 'Angle-cut path',
          subtitle: 'Reserve extra envelope for 45 degree cuts instead of treating them as plain net area.',
          lossHint: 'Angle envelope loss',
        },
        layup: {
          title: 'Layup path',
          subtitle: 'FAW changes may come from layup rather than a different raw material.',
          lossHint: 'Fold corner + layup trim',
        },
      },
    },
    todo: {
      rollBinding: 'Roll binding',
      cutRule: 'Cut rules',
      lossModel: 'Loss model',
      issuanceLink: 'Issuance linkage',
    },
    canvasPreview: {
      title: 'CANVAS Cutting Preview',
      description:
        'Visual strip-first simulation. Use wheel to zoom, drag to pan, and click a zone to inspect details.',
      close: 'Close Preview',
      summary: {
        roll: 'Roll',
        unit: 'Size Unit',
        executableSets: 'Executable Sets',
        executablePieces: 'Executable Pieces',
        utilization: 'Utilization',
      },
      legend: {
        roll: 'Roll body',
        strip: 'Primary strip',
        piece: 'Split piece',
        loss: 'Loss zone',
        aggregate: 'Aggregate placeholder',
      },
    },
    canvas: {
      scale: 'Scale',
      zones: 'Zones',
      selection: 'Selection',
      hoverHint: 'Hover or click a strip / piece / loss area to inspect details.',
      type: 'Type',
      position: 'Position (mm)',
      size: 'Size (mm)',
    },
  },
  cutSizeLibrary: {
    title: 'Cut Size Library',
    description:
      'Manage standardized cut-size units as controlled master data for simulation and issuance.',
    status: 'Scaffold Ready',
    actions: {
      add: 'Add Size Unit',
    },
    sections: {
      dataset: {
        kicker: 'Master Dataset',
        title: 'Structured Cut-Size Units',
        description:
          'Replace free-form strings like 1x20x9 with structured dimensions, angles, layup, and loss attributes.',
      },
    },
    columns: {
      code: 'Code',
      name: 'Name',
      size: 'Width x Length x Count',
      angle: 'Cut Angle',
      layup: 'Layup',
      loss: 'Loss Profile',
      usage: 'Usage Type',
      status: 'Status',
    },
    empty: {
      title: 'No cut-size units yet',
      description:
        'Create standard units here first, then let cutting plans and simulation reference them instead of manual string input.',
    },
    fields: {
      size: {
        label: 'Dimension fields',
        hint: 'Store width, length, and piece count as independent numeric fields.',
      },
      angle: {
        label: 'Angle fields',
        hint: 'Store 0 / 45 / custom angle in a dedicated field, not in notes.',
      },
      layup: {
        label: 'Layup fields',
        hint: 'Store layup count and layup mode to represent FAW stacking semantics.',
      },
      loss: {
        label: 'Loss fields',
        hint: 'Store edge trim, knife gap, and extra angle envelope loss attributes.',
      },
      usage: {
        label: 'Usage tags',
        hint: 'Classify units as main ply, reinforcement, patch, ring, or custom usage.',
      },
      trace: {
        label: 'Trace linkage',
        hint: 'Reserve source references for print sheets, templates, and issuance chain.',
      },
    },
  },
} as const
