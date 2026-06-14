export const rawMaterials = {
  moduleTitle: 'Raw Material Management',
  tabs: {
    catalog: 'Prepreg',
    bindingQr: 'Binding QR',
    batchEngine: 'Cutting Simulation',
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
        placeholder:
          'Optional notes for supplier, quality, or usage constraints',
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
      scanBind: 'Scan & Bind',
      save: 'Save Spec',
      saveAndBind: 'Save & Bind',
      saving: 'Saving...',
      binding: 'Binding...',
      cancel: 'Cancel',
    },
    toasts: {
      created: 'Prepreg spec created',
      updated: 'Prepreg spec updated',
      saveFailed: 'Failed to save the prepreg spec. Please retry later.',
      recognizedApplied:
        'Recognized fields applied. Please verify before saving.',
      requiredCodeAndName:
        'Please fill in product code and product name first.',
      bindingActivated:
        'The binding QR code was recognized and the dialog is now in binding mode.',
      bindingInvalid:
        'The current content is not a valid prepreg binding QR code.',
      bindingExpired:
        'This binding QR code has expired. Please generate a new one before binding.',
      bindingAlreadyBound:
        'This binding QR code has already been linked to an existing prepreg spec.',
      bindingLookupFailed:
        'Failed to read the binding QR status. Please retry later.',
      bindingSaved: 'The prepreg spec has been saved and bound successfully.',
      qrGenerated: 'QR code generated from the current normalized payload.',
      qrGenerateFailed: 'Failed to generate QR code. Please retry.',
      qrPrintBlocked: 'Generate the QR code before printing.',
    },
    binding: {
      title: 'The dialog is currently in QR binding mode',
      description:
        'Finish the prepreg spec entry and the current QR code will be linked to the saved spec.',
      tokenLabel: 'Current Binding Token',
    },
    scanBinding: {
      title: 'Scan to Bind Prepreg',
      description:
        'Scan or paste an unbound QR code. Once recognized, the system will automatically open the new prepreg spec dialog in binding mode.',
      placeholder: 'Scan QR content, or paste a bindToken link / TOKEN',
      hint: 'Supports scanner input, manual token paste, or the full QR deep-link URL.',
    },
    qr: {
      title: 'QR Generate / Print',
      description:
        'Generate a QR code from the current dialog fields and normalized result, then print it directly for labeling.',
      empty: 'QR code has not been generated yet',
      requirements:
        'Fill in at least product code and product name before clicking "Generate QR". The QR payload always follows the current normalized result.',
      previewTitle: 'Label Preview',
      previewDescription: 'Current QR code and field snapshot',
      previewAlt: 'Prepreg spec QR code',
      payload: 'QR Payload',
      generatedFromCleaned:
        'The content below is generated from the current form and normalized result.',
      actions: {
        generate: 'Generate QR',
        regenerate: 'Regenerate',
        generating: 'Generating...',
        print: 'Print Label',
        close: 'Close',
      },
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
        idle: 'After upload, you can paste/correct OCR text, then apply fields into the form in one click.',
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
  bindingQr: {
    hero: {
      kicker: 'Independent Workspace',
      title: 'Prepreg Batch Binding QR',
      description:
        'Generate and print unbound prepreg binding QR codes in a standalone page without interfering with the current prepreg spec dialog. Unbound QR codes carry no bound spec content and expire automatically after 5 days if unused.',
    },
    actions: {
      generate: 'Generate Batch QR',
      generating: 'Generating...',
      print: 'Print Current Batch',
      clear: 'Clear Current Batch',
    },
    form: {
      title: 'Batch Parameters',
      description:
        'Enter how many unbound QR labels should be printed in this batch. The page requests backend-issued tokens and renders printable QR cards immediately.',
      quantityLabel: 'Batch Quantity',
      quantityHint:
        'The current page allows 1-200 labels per batch for workshop or manual labeling preparation.',
      rulesTitle: 'Current Rules',
      ruleUnbound:
        'QR codes are unbound by default and only enter binding flow after scanning',
      ruleNoLeak: 'Unbound QR codes do not carry prepreg spec information',
      rulePrintable:
        'This page only focuses on batch generation, printing, and UI clearing',
      ruleExpiry:
        'Unbound QR codes expire after 5 days and are cleaned up automatically',
    },
    grid: {
      title: 'Current Batch',
      emptyTitle: 'No QR codes generated yet',
      emptyDescription:
        'Enter a quantity and generate the batch before printing.',
      tokenLabel: 'Binding Token',
      expiresAtLabel: 'Expires At',
      cardTip: 'UNBOUND TOKEN / BIND WITHIN 5 DAYS',
    },
    batchValidity: {
      title: 'Batch Validity Window',
      remainingLabel: 'Remaining Validity',
      remainingValue: 'Approx. {{value}} left',
      expiresAtLabel: 'Batch Expiration Time',
    },
    toasts: {
      generated: 'The current batch of binding QR codes has been generated.',
      generateFailed: 'Failed to generate the batch QR codes. Please retry.',
      printBlocked: 'Generate QR codes before printing.',
      cleared: 'The current batch has been cleared from the page.',
    },
  },
  batchEngine: {
    title: 'Cutting Simulation',
    description:
      'Estimate sheet-level loss and generate formal solve candidates from the current roll spec and the full cutting plan.',
    sections: {
      control: {
        kicker: 'Input Side',
        title: 'Roll and Rule Setup',
        description:
          'Select the roll spec and cutting plan, then reuse the cutting engine rule parameters.',
        fields: {
          prepregRef: 'Reference Prepreg Roll Spec',
          rollWidth: 'Roll Width (mm)',
          rollLength: 'Roll Length (m)',
          cuttingPlanRef: 'Reference Cutting Plan',
        },
        placeholders: {
          loading: 'Loading...',
          selectPrepreg: 'Select prepreg spec',
          selectCuttingPlan: 'Select cutting plan',
          none: 'No reference (allow empty)',
        },
        prepregSummary: {
          prefix: 'Referenced roll spec',
          empty:
            'Empty is allowed. Once selected, this page only reads roll width and roll length from prepreg master data.',
        },
        cuttingPlanSummary: {
          document: 'Document',
          revision: 'Revision',
          lines: 'Demand Lines',
          invalidLines: 'Invalid Lines',
          empty:
            'After selecting a cutting plan, the system reads every valid row in the sheet into the solve request.',
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
            value:
              'Load one cutting plan and turn every valid row into structured demand lines',
            hint: 'The whole sheet participates in the solve request so the optimizer can minimize overall loss.',
          },
        },
      },
      stage: {
        kicker: 'Simulation Stage',
        title: 'Sheet-Level Preview',
        description:
          'The center stage shows a sheet-level aggregated preview. The formal optimized layout still comes from backend solve results.',
        rollCanvasLabel: 'Simulation Canvas',
        rollCanvasHint:
          'Select a cutting plan to inspect the sheet-level preview summary and representative strip-first canvas.',
        simulationStatus: 'Pending Calculation',
        computedStatus: 'Sheet Preview Ready',
        openCanvas: 'Open CANVAS Preview',
        pendingHint: 'Waiting for input parameters',
        planPrefix: 'Cutting Plan',
        stats: {
          demandLines: 'Demand Lines',
          validDemandLines: 'Valid Demand Lines',
          totalRequiredPieces: 'Required Pieces',
          totalDemandArea: 'Actual Piece Area (m2)',
          totalOccupiedArea: 'Occupied Envelope Area (m2)',
          leftoverWidth: 'Leftover Width (mm)',
          leftoverLength: 'Leftover Length (mm)',
        },
      },
      summary: {
        kicker: 'Output Side',
        title: 'Execution Summary',
        description:
          'Review output and loss summary for the current roll under the active parameters.',
        cards: {
          output: {
            title: 'Planned Output',
            value:
              'Complete the required inputs to generate the result summary.',
            hint: 'This summary is calculated in real time from the current page inputs only.',
          },
        },
      },
    },
    debug: {
      kicker: 'Engine Linkage',
      title: 'Current Applied Config',
      description:
        'Shows the cutting engine config currently used by the batch engine and the Rust/WASM request payload.',
      resultStale: 'Configuration changed, solve again',
      fields: {
        preset: 'Objective Preset',
        weights: 'Weights U/S/P',
        geometry: 'Knife / Trim',
        lengthRules: 'Length Boundary',
        directionRules: 'Direction / Angle',
      },
      payload: {
        title: 'CuttingEngineInput Payload',
        description:
          'Expand to inspect the real JSON sent into Rust/WASM for this formal solve.',
        empty:
          'Input is incomplete; CuttingEngineInput has not been generated yet.',
      },
    },
    metrics: {
      roll: {
        label: 'Roll Spec Basis',
        value: 'Spec width and length',
        hint: 'The current display comes from prepreg spec master data, not a real inventory roll instance.',
      },
      mode: {
        label: 'Planning Strategy',
        value: 'Strip first, then split',
        hint: 'The current planning strategy cuts strips first and splits pieces afterwards.',
        currentCuttingPlan: 'Current cutting plan: {name} / {lineCount} rows',
      },
      loss: {
        label: 'Estimated Loss',
        value: 'Local preview result',
        hint: 'A local preview result based on the current roll spec, size unit, knife gap, and trim, not the final optimized loss.',
        utilizationHint:
          'Occupied-area preview utilization {percent}% / occupied area {occupiedArea} m2',
      },
    },
    scoreBreakdown: {
      title: 'Score Breakdown',
      subtitle: 'area objective / contribution / penalty',
      fields: {
        finalScore: 'Final Score',
        fulfilledRate: 'Fulfillment Rate',
        structuredRuleRisk: 'Rule Risk Count',
        fulfilledContribution: 'Fulfillment Contribution',
        utilizationContribution: 'Area Utilization Contribution',
        assignmentPenalty: 'Assignment Penalty',
        unfulfilledPenalty: 'Unfulfilled Penalty',
        splitPenalty: 'Cross-Roll Penalty',
        mustPenalty: 'Must-Fulfill Penalty',
        groupSplit: 'Group Split',
        sequenceViolation: 'Sequence Violation',
        directionSwitch: 'Direction Switch',
        mixViolation: 'Mix Conflict',
      },
    },
    comparePanel: {
      title: 'Candidate Comparison',
      scoreChip: 'Score {score}',
      mustOk: 'Must OK',
      mustRisk: 'Must Risk',
      ruleRisk: 'Rule Risk {count}',
      ruleStable: 'Rule Stable',
      metrics: {
        utilization: 'Utilization',
        fulfilledDemand: 'Fulfilled Demand',
        splitDemand: 'Cross-Roll Demand',
        usedRolls: 'Used Rolls',
        remainingRollArea: 'Remaining Roll Area',
        unfulfilledArea: 'Unfulfilled Area',
        fulfilledContribution: 'Fulfillment Contribution',
        mustPenalty: 'Must-Fulfill Penalty',
        groupSplit: 'Group Split',
        sequenceViolation: 'Sequence Violation',
        directionSwitch: 'Direction Switch',
        mixViolation: 'Mix Conflict',
        diffDemand: 'Changed Demand',
        diffZones: 'Changed Zones',
      },
      baseline: 'Baseline: Top{rank}',
      mustDiagnostics: 'Must diagnostics: {count}',
    },
    mustReview: {
      title: 'Must Failure Review',
      empty: 'No mustFulfill diagnostics for the current plan.',
      statuses: {
        fulfilled: 'Fulfilled',
        unfulfilled: 'Unfulfilled',
      },
      labels: {
        constraint: 'Constraint',
        suggestion: 'Suggestion',
      },
      constraints: {
        none: 'No Blocking Constraint',
        group: 'Group Constraint',
        sequence: 'Sequence Constraint',
        direction: 'Direction Constraint',
        mix: 'Mix Constraint',
        capacity: 'Capacity Constraint',
      },
    },
    solutionOverview: {
      title: 'Formal Solve Overview',
      solving: 'Backend is generating formal candidate plans...',
      empty: 'Formal solve has not been started yet.',
      currentPlan: 'Current Plan',
      optionalPlan: 'Optional Plan',
      currentPlanDetail: 'Current Plan Detail',
      summary: {
        solverStatus: 'Solver Status',
        planCount: 'Returned Plans',
        message: 'Summary',
      },
      metrics: {
        strategy: 'Strategy',
        score: 'Score',
        utilization: 'Utilization',
        loss: 'Loss',
        assignments: 'Assignments',
        unfulfilledLines: 'Unfulfilled Lines',
        splitDemand: 'Split Demand',
        usedRolls: 'Used Rolls',
        structuredRuleRisk: 'Rule Risk {count}',
        mustRisk: 'Must Risk {count}',
        groupSplit: 'Group Split',
        sequenceViolation: 'Sequence Violation',
        directionSwitch: 'Direction Switch',
        mixViolation: 'Mix Conflict',
        baseline: 'Baseline',
      },
    },
    legend: {
      roll: 'Roll body',
      strip: 'Primary strip',
      piece: 'Split piece',
      loss: 'Loss zone',
    },
    canvasPreview: {
      title: 'CANVAS Cutting Preview',
      description:
        'Visual strip-first simulation. Use wheel to zoom, drag to pan, and click a zone to inspect details.',
      close: 'Close Preview',
      summary: {
        roll: 'Roll Spec',
        unit: 'Cutting Plan',
        executableSets: 'Demand Lines',
        executablePieces: 'Required Pieces',
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
      hoverHint:
        'Hover or click a strip / piece / loss area to inspect details.',
      type: 'Type',
      position: 'Position (mm)',
      size: 'Size (mm)',
    },
  },
  engineConfig: {
    tab: 'Cutting Engine Config',
    hero: {
      title: 'Raw Materials Engine Configuration',
      description:
        'Configure rule boundaries for the cutting geometry solver: knife gap, edge trim, length boundaries, angle/yarn rules, and soft-constraint penalties. The solve objective is fixed to maximizing usable cutting area.',
    },
    weights: {
      title: 'Soft Constraint Penalty Boundaries',
      description:
        'The solve objective is fixed to maximizing usable cutting area. This section only maintains penalty boundaries for unmet soft rules.',
      splitPenalty: 'Physical Split Penalty',
      mustFulfillPenalty: 'Must-Fulfill Penalty Weight',
    },
    constraints: {
      title: 'Geometry & Physical Constraints',
      description: 'Configure equipment limits and physical cutter dimensions.',
      lengthRules: {
        title: 'Cut Length Rules',
        description:
          'Use minimum and maximum lengths to constrain calculation boundaries, and use a fixed decision length for process-tuning overrides.',
        minSupportedLength: {
          label: 'Min Supported Length',
          hint: 'Lengths below this value are excluded from cutting candidates.',
        },
        maxSupportedLength: {
          label: 'Max Supported Length',
          hint: 'Lengths above this value are excluded from cutting candidates.',
        },
        fixedDecisionLength: {
          label: 'Fixed Decision Length',
          hint: 'Overrides the final cutting-length decision for process tuning.',
        },
      },
      angleRules: {
        title: 'Supported Cut Angles',
        description:
          'Declares the cut-angle set supported by the size library and cutting input chain.',
        hint: 'Angles are maintained in the size library and flow into engine input with demand lines; the core only receives projected geometry and angle metadata.',
      },
      directionRules: {
        title: 'Direction & Angle Rules',
        description:
          'Controls same-direction preference, angle mixing, and direction-switch penalties. These rules are included in the formal WASM solver input.',
        angleMixMode: {
          label: 'Angle Mix Mode',
          options: {
            allow: 'Allow Mix',
            'prefer-same-angle': 'Prefer Same',
            'strict-same-angle': 'Strict Same',
          },
        },
        sameDirectionPreferred: {
          label: 'Same Direction Preferred',
          hint: 'When enabled, candidates with the same yarn direction or angle receive a light score advantage.',
        },
        directionSwitchPenalty: {
          label: 'Direction Switch Penalty',
          hint: 'Score penalty weight applied for each yarn-direction or angle switch.',
        },
      },
      ruleStrategy: {
        title: 'Rule Switches / Constraint Strategy',
        description:
          'Defines how the engine consumes must-fulfill, mixing, order, and yarn-direction rules. This stage sends the strategy into the WASM contract as diagnostics signals.',
        mustFulfillMode: {
          label: 'Must Fulfill Mode',
          options: {
            strict: {
              label: 'Strict',
              description: 'Treat as a hard constraint.',
            },
            'soft-penalty': {
              label: 'Soft Penalty',
              description: 'Treat as score penalty.',
            },
            ignore: {
              label: 'Ignore',
              description: 'Ignore must markers.',
            },
          },
        },
        mixingStrategy: {
          label: 'Mixing Strategy',
          options: {
            allow: {
              label: 'Allow',
              description: 'Allow cross-group mixing.',
            },
            sameGroupOnly: {
              label: 'Same Group',
              description: 'Prefer same-group mixing.',
            },
            strictNoMix: {
              label: 'No Mix',
              description: 'Strictly block mixing.',
            },
          },
        },
        orderStrategy: {
          label: 'Order Strategy',
          options: {
            respectOrder: {
              label: 'Respect',
              description: 'Strictly respect order.',
            },
            softPenalty: {
              label: 'Soft',
              description: 'Penalize order drift.',
            },
            ignore: {
              label: 'Ignore',
              description: 'Ignore order fields.',
            },
          },
        },
        directionStrategy: {
          label: 'Yarn / Angle Strategy',
          options: {
            sameDirectionPreferred: {
              label: 'Preferred',
              description: 'Prefer same direction.',
            },
            sameDirectionRequired: {
              label: 'Required',
              description: 'Require same direction.',
            },
            allowSwitch: {
              label: 'Allow Switch',
              description: 'Allow direction switches.',
            },
          },
        },
      },
      knifeGap: {
        label: 'Knife Gap',
        hint: 'Cutter width consumed by each cut.',
      },
      edgeTrim: {
        label: 'Edge Trim',
        hint: 'Non-reactive width that must be removed from both roll edges.',
      },
      timeout: {
        label: 'Max Solver Timeout',
        hint: 'Maximum runtime for a single layout calculation.',
      },
      units: {
        mm: 'MM',
        sec: 'SEC',
      },
    },
    security: {
      title: 'Configuration Security Alert',
      description:
        'The cutting geometry model directly affects shopfloor yield and cutting qualification. Changes apply to newly generated cutting calculations. Do not modify these parameters without process authorization.',
    },
    actions: {
      reset: 'Reset Defaults',
      save: 'Save Config',
      saving: 'Saving...',
    },
    toasts: {
      presetChanged:
        'Switched to the official process-recommended weight parameters for {{preset}}.',
      saveSuccess:
        'Cutting engine calculation configuration saved. New cutting calculation jobs will automatically load this parameter asset.',
      reset:
        'Configuration parameters have been reset to system factory defaults.',
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
