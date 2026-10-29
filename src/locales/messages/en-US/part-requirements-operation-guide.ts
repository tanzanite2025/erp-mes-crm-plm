export const partRequirementsOperationGuide = {
  domainLabel: 'Production handbook · Part requirements',
  title: 'How to analyze part requirements',
  shortcutDescription:
    'Understand how orders, manufacturing BOMs, materials, and inventory determine demand and gaps.',
  mobileIntroduction:
    'Five steps from orders and BOMs to material demand and inventory gaps.',
  introduction:
    'Select sales orders, expand materials from manufacturing BOMs, then compare demand with inventory. Follow these five steps to understand the sources, calculations, and checks needed before acting on the result.',
  contentsLabel: 'Part requirements guide chapters',
  readingAreaLabel: 'Part requirements guide reading area',
  referenceTitle: 'Where to review or maintain data',
  referenceDescription:
    'Open the relevant business page to work on data. This guide explains the rules without running calculations or changing records.',
  openGuide: 'Read the part requirements guide',
  chapters: {
    preparation: {
      label: 'Select and prepare',
      shortLabel: 'Select',
      title: 'Choose the order lines to analyze',
      description:
        'Part requirements convert selected finished-product orders into quantities of raw materials and components. Finished-product quantities and material usage are different measures.',
      noticeTitle: 'Check the scope before selecting Analyze Demand',
      noticeDescription:
        'The calculation uses each order line’s full quantity. It does not subtract completed or shipped quantities or split demand by delivery date. Manually check the intended preparation scope for partially fulfilled orders.',
    },
    sources: {
      label: 'Data sources',
      shortLabel: 'Sources',
      title: 'What orders, BOMs, materials, and inventory provide',
      description:
        'This page aggregates existing data. Maintain quantities in sales orders, recipes in BOMs, material identities and units in material records, and inventory through warehouse transactions.',
      noticeTitle: 'Verify the recipe when performance variants coexist',
      noticeDescription:
        'Use released manufacturing BOMs effective on the analysis date. Prefer customer-specific candidates, then internal candidates. If multiple recipes qualify, choose the performance variant for each order line in the analysis panel, review revision and weight, then recalculate. Creation time does not choose the recipe.',
    },
    calculation: {
      label: 'Usage calculation',
      shortLabel: 'Calculate',
      title: 'Expand each order, then aggregate by group and material',
      description:
        'Multiply finished-product order quantity by BOM standard usage, then add requirements for the same group and material. The example below follows two orders.',
      noticeTitle: 'Material demand is separate from finished-product weight',
      noticeDescription:
        'BOM finished-product weight describes a particular product and performance variant. Requirements use the standard usage on each material line, without inferring usage from product weight, converting units, or recursively expanding child BOMs.',
    },
    supply: {
      label: 'Inventory and gaps',
      shortLabel: 'Gaps',
      title: 'Subtract effective supply from demand to find the gap',
      description:
        'Review demand and the effective supply allocated to each group. Read only the system Production Material Warehouse, subtract active reservations, and allocate the same available stock once across groups in a fixed order.',
      noticeTitle: 'A displayed zero can mean integration is pending',
      noticeDescription:
        'Inbound purchases and work in progress are not connected and contribute no supply. This does not mean the company has none. Active reservations now come from warehouse records; they are not a separate quality-inspection eligibility check.',
    },
    verification: {
      label: 'Verify and proceed',
      shortLabel: 'Verify',
      title: 'Check completeness before preparing, purchasing, or exporting',
      description:
        'Use the analysis as decision support. Verify orders, recipes, and units, reconcile inventory, incoming supply, and allocations, then use the relevant business process for preparation or purchasing.',
      noticeTitle: 'Complete the sources before generating the full list',
      noticeDescription:
        'Missing BOMs, unresolved variant choices, inactive materials or inconsistent units are shown against specific order lines. Full requirement totals, printing and export remain unavailable until the sources are corrected and analysis is run again.',
    },
  },
  topics: {
    purpose: {
      title: 'What this page answers',
      description:
        'For example, an order for 100 finished products is expanded into the required quantities of each material and compared with current inventory. Analysis does not create purchase orders or production plans, reserve stock, or deduct inventory.',
    },
    selectOrders: {
      title: 'Start an analysis',
      description:
        'Expand a sales order in Part Requirements and select lines, or select the whole order. Verify product codes, models, quantities and delivery dates, then choose Analyze Demand. When multiple BOMs qualify, select a performance variant, review its weight and recalculate in the results panel.',
    },
    quantityScope: {
      title: 'Which orders are listed',
      description:
        'Load all pending, scheduling and in-progress orders through pagination. Missing orders require checking status, product links and lines in Sales Orders. Loading failures are visible rather than presenting a partial list as complete.',
    },
    prerequisites: {
      title: 'Prepare three kinds of source data',
      description:
        'Order lines need a specific linked product and correct quantity. Products need an eligible released manufacturing BOM with material lines and standard usage. Units in recipes, material records, and inventory must agree. Engineering-only or draft BOMs do not qualify for the calculation.',
    },
    salesSource: {
      title: 'Sales orders → product, quantity, and customer',
      description:
        'Lines provide products and finished-product quantities; orders provide the customer used to prioritize a customer-specific BOM. Delivery dates help people plan, but the calculation does not split demand into date periods.',
    },
    bomSource: {
      title: 'Released manufacturing BOM → materials per product',
      description:
        'The manufacturing BOM (MBOM) provides materials, groups, and standard usage. Engineering BOMs (EBOMs), drafts, and obsolete recipes are excluded by the calculation. Derive, review, and release a manufacturing BOM from an engineering recipe first; see How to create a BOM.',
    },
    bomPriority: {
      title: 'Which BOM is used when several exist',
      description:
        'Keep released manufacturing BOMs effective on the analysis date, including the final effective day. Prefer matching customer-specific candidates; otherwise use internal candidates. Use a unique candidate automatically, or require an explicit per-line choice. Missing or stale choices are flagged without silently selecting another variant.',
    },
    materialSource: {
      title:
        'Production material archive → codes, names, specifications, and units',
      description:
        'Read codes, names, specifications and primary units by material ID. Recipe and inventory units must match the primary unit; no conversion is inferred. Missing or inactive materials and unit mismatches block complete analysis.',
    },
    weightBoundary: {
      title: 'BOM weight and product specifications',
      description:
        'BOMs own ownership, performance variants, finished-product weight, and material recipes. Product records own identity information such as models, specifications, and finishes. A 420g product variant does not mean every material requires 420g; each line uses its own standard usage.',
    },
    standardUsage: {
      title: 'Include wastage in standard usage once',
      description:
        'A BOM normally calculates standard usage as unit usage × (1 + wastage rate). Requirements multiply by this existing standard usage without applying wastage again. With 2 m² per product and 5% wastage, standard usage is 2.1 m² per product.',
    },
    aggregation: {
      title: 'Combine the same material within the same group',
      description:
        'Sum standard requirements for the same group and material, retaining separate rows across groups. BOM groups classify materials and do not establish routing operations. The headline material count uses distinct IDs; the list may still repeat a material across groups.',
    },
    units: {
      title: 'Keep units consistent',
      description:
        'For example, 100 products × 2.1 m² per product = 210 m². The system does not convert kg to g or rolls to m² before comparing inventory. Align units in BOMs, material records, and inventory first. Packaging conversion is a separate suggestion.',
    },
    flatRecipe: {
      title: 'The calculation reads this BOM’s material lines',
      description:
        'It reads saved material lines directly from the selected manufacturing BOM, without recursively expanding child BOMs. If a recipe contains a semi-finished product, verify that this level sufficiently describes the preparation scope; do not assume all underlying raw materials will be calculated.',
    },
    inventorySource: {
      title: 'Where physical inventory comes from',
      description:
        'Read only the system Production Material Warehouse (MATERIAL), excluding R&D and other warehouses. For each material, warehouse and batch, subtract active RESERVED quantities from the balance, with a minimum of zero, then sum. Separate inspection eligibility is not checked; the warehouse must still verify actual picking.',
    },
    pendingSupply: {
      title: 'What the supply buckets mean',
      description:
        'Physical stock is the balance in the selected warehouse. Active reservations include RESERVED records and exclude released or consumed records. Inbound purchases and work in progress remain unconnected. Each group’s effective supply uses the available stock allocated to that group.',
    },
    sharedInventory: {
      title: 'Reconcile shared inventory across groups',
      description:
        'Share one available quantity per material in a fixed group/material-ID order. If two groups each need 80 and available stock is 100, allocate 80 and 20, leaving a total gap of 60. This is a read-only preview; it neither reserves stock nor establishes warehouse issue priority.',
    },
    snapshot: {
      title: 'When to analyze again',
      description:
        'Results reflect data read when analysis was requested. The open panel does not continuously recalculate. Run analysis again after changing order quantities, BOMs, inventory, or packaging rules. Repeated analysis does not deduct inventory.',
    },
    checkCompleteness: {
      title: 'Check omissions and anomalies before gaps',
      description:
        'Review Order-line and BOM basis verification first. Each line needs an explicit BOM, performance variant, revision and weight. Resolve multiple candidates or source errors before recalculating. The selection tree establishes order scope and does not use a separate recipe preview.',
    },
    sourceOrders: {
      title: 'Trace a material back to orders',
      description:
        'Expand associated orders to review customers, products and sources. Finished quantities and material contributions are separate: repeated material recipe lines in the same group count the finished quantity once and add usage and material demand. Recipe-line IDs, order-line IDs and BOM versions are retained for traceability.',
    },
    packaging: {
      title: 'Packaging suggestions are separate from purchasing quantities',
      description:
        'Material packaging rules convert total demand to a package count, rounded up. Forward rules divide demand by quantity per package; reverse rules multiply demand by packages per unit. For 315 m² at 25 m² per roll, the suggestion is at least 13 rolls, even when the shortage is only 215 m². It is based on demand rather than the gap.',
    },
    molds: {
      title: 'Mold life is a separate production constraint',
      description:
        'The result checks associated mold capacity and remaining-life alerts using order models and finished-product quantities. These checks help assess production readiness without affecting material demand or inventory gaps. No alert alone does not prove all mold conditions are satisfied.',
    },
    export: {
      title: 'Filter, export, and proceed',
      description:
        'Search materials, select Shortages Only, print, or export Excel. Shortages Only uses the effective gap. Excel exports the full analysis rather than following the list’s search or shortage filters. Export creates a report, not a purchase request, stock issue, or production task. Reconcile gaps before using the relevant business process.',
    },
    issuanceProgress: {
      title: 'Continue with overall and order-line issuance progress',
      description:
        'Part Requirements retains theoretical calculation, dispatch and printing entry points. Production issuance combines the same bases with confirmed handovers, summarizes materials and expands order lines, including undispatched sources. Dispatched sources use frozen recipes. Sum outstanding quantities per line and show excess separately; unresolved sources clearly mark totals as partial. Warehouse Production handovers handles issues, supplements and returns. See the production issuance guide.',
    },
  },
  example: {
    title: 'Worked example: two orders need the same material',
    assumption:
      'Assume the same material, group, and recipe, with 2 m² unit usage and 5% wastage.',
    headers: {
      step: 'Stage',
      calculation: 'Calculation and result',
    },
    rows: {
      standard: {
        label: 'Standard usage',
        value: '2 × (1 + 5%) = 2.1 m²/product',
      },
      firstOrder: {
        label: 'Order A: 100 products',
        value: '100 × 2.1 = 210 m²',
      },
      secondOrder: {
        label: 'Order B: 50 products',
        value: '50 × 2.1 = 105 m²',
      },
      combined: {
        label: 'Total demand',
        value: '210 + 105 = 315 m²',
      },
    },
    conclusion:
      '315 m² is combined material demand for both orders. Inventory changes the gap, without changing this demand total.',
  },
  supplyFormula: {
    title: 'Reading supply and gaps',
    usable:
      'Available stock = sum of max(batch balance − active reservations, 0)',
    total:
      'Group effective supply = available stock allocated to the group; purchases and WIP are pending',
    gap: 'Group effective gap = max(group demand − group effective supply, 0)',
    theoretical:
      'The theoretical gap allocates physical balances in the same group order without subtracting reservations. Shortage-only filtering uses the effective gap. Combined allocations cannot exceed the shared stock.',
    example:
      'For demand of 315 m² and a Production Material Warehouse balance of 100 m² with no reservations, the effective gap is 215 m². With 20 m² actively reserved, availability is 80 m² and the gap is 235 m². Packaging still converts total demand of 315 m².',
  },
  references: {
    requirements: 'Open Part Requirements',
    orders: 'Review sales orders',
    bomGuide: 'Read How to create a BOM',
    bom: 'Review BOM recipes',
    materials: 'Review production material archive',
    inventory: 'Check current inventory',
    packaging: 'Review material package conversion rules',
    materialGuide: 'Read how to create production material records',
    issuanceGuide: 'Read production issuance guide',
  },
}
