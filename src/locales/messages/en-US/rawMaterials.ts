export const rawMaterials = {
  moduleTitle: 'Raw Material Management',
  tabs: {
    catalog: 'Prepreg',
    batchEngine: 'Batch Split Engine',
    cutSizeLibrary: 'Cut Size Library',
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
        blocks: {
          roll: {
            title: 'Active Roll',
            value: 'Select the specific prepreg roll before calculation',
            hint: 'Roll instance, NFC tag, remaining area/length, thaw window, and storage state will be surfaced here.',
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
