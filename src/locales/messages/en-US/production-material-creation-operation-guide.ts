export const productionMaterialCreationOperationGuide = {
  title: 'How to create production material records',
  domainLabel: 'Warehouse Management · Handbook',
  introduction:
    'Create the material identity and base unit, then define the purchasing package conversion. Follow a gloves example, used in pairs and purchased in bags, through material fields, BOM quantities, purchasing, and warehouse checks.',
  mobileIntroduction:
    'Use a bag of 10 pairs of gloves to explain material records, units, and package conversion.',
  shortcutDescription:
    'Create production materials, choose the base unit, and define bag-to-pair conversion before continuing to BOM, purchasing, and inventory.',
  entryLabel: 'Material creation and package conversion guide',
  contentsLabel: 'Production material creation guide contents',
  readingAreaLabel: 'Production material creation guide reading area',
  referenceTitle: 'Continue in the business pages',
  referenceDescription:
    'Only destinations you can access are shown. Reading this guide does not save materials or change inventory.',
  references: {
    materials: 'Open production material archive',
    assembly: 'Open assembly rules',
    units: 'Review measurement units',
    bomGuide: 'Read how to create a BOM',
    requirementsGuide: 'Read how to analyze part requirements',
    requirements: 'Review part requirements',
    purchasing: 'Open purchase orders',
    inventory: 'Review Production Material Warehouse inventory',
  },
  chapters: {
    purpose: {
      label: 'Understand the purpose',
      shortLabel: 'Purpose',
      title: 'Separate material identity, recipes, and inventory',
      description:
        'Production material records correspond to the built-in Production Material Warehouse. This guide covers their creation and package conversion before use in BOM, purchasing, and inventory workflows.',
      noticeTitle: 'Actual transactions follow material creation',
      noticeDescription:
        'Saving gloves and a rule of 1 bag = 10 pairs defines identity and measurement. Purchasing, receiving, and inventory quantities must be checked and recorded in their business workflows.',
    },
    record: {
      label: 'Create the material',
      shortLabel: 'Record',
      title: 'Create one material shared by BOM, purchasing, and inventory',
      description:
        'Open Production Material Archive → Production Materials, search by name and specification, then select Register Archive. The example below uses protective gloves.',
      noticeTitle: 'Choose the unit used for actual consumption first',
      noticeDescription:
        'If BOM usage and daily issues use pairs, choose pairs as the primary unit. Define bag-to-pair conversion afterward for purchasing packages; the same gloves do not need a second material record measured in bags.',
    },
    conversion: {
      label: 'Define package conversion',
      shortLabel: 'Conversion',
      title: 'Convert the purchasing package into the material base unit',
      description:
        'After saving the material, open Assembly Rules in the same module, select Add Conversion Rule, and find the saved gloves. Assume the supplier confirms 10 pairs per bag.',
      noticeTitle: 'Read the conversion preview before saving',
      noticeDescription:
        'The example must read 1 bag = 10 pairs. If the base unit appears as a code, check that it means pairs. A preview of 1 pair = 10 bags has the wrong direction; switch direction or correct the factor.',
    },
    gloveExample: {
      label: 'Gloves by the bag',
      shortLabel: 'Example',
      title: 'Calculate BOM usage in pairs and check deliveries by the bag',
      description:
        'Illustrative assumptions: the same gloves use pairs as the base unit, each supplier bag contains 10 pairs, and BOM analysis reports total requirements of 25 pairs.',
      noticeTitle:
        'Check packaging suggestions, purchases, and receipts separately',
      noticeDescription:
        'Part requirements currently uses the rule to show a whole-package suggestion. Purchase order and warehouse forms do not yet read this rule for automatic conversion. Keep quantity and unit consistent and record actual deliveries.',
    },
    handoff: {
      label: 'Check and continue',
      shortLabel: 'Continue',
      title: 'Verify the record before the next business step',
      description:
        'Continue to BOM, part requirements, purchasing, or inventory according to the task. Each guide remains independent and connects through related destinations.',
      noticeTitle: 'Recheck applicability after changes',
      noticeDescription:
        'Before changing the primary unit of a material already in use, check related BOMs, purchases, and inventory. If the supplier changes pairs per bag, review the rule and open transactions; a new conversion cannot establish past actual deliveries.',
    },
  },
  topics: {
    materialIdentity: {
      title: 'Production materials share one identity',
      description:
        'Maintain names, specifications, codes, and primary units for the raw materials, packaging, auxiliaries, consumables, and chemicals associated with the Production Material Warehouse. The archive describes each material; the warehouse records actual stock.',
    },
    warehouseScope: {
      title: 'Records correspond to the built-in Production Material Warehouse',
      description:
        'Open Warehouse Operations → Stock List and find Production Material Warehouse. This built-in warehouse handles purchase receipts, material inbound stock, and inventory for production materials. No additional warehouse with the same name is needed. Finished Goods and R&D warehouses have their own purposes. Creating a material record does not create stock; quantities are recorded through receiving and inbound transactions.',
    },
    classification: {
      title: 'Material category does not change the corresponding warehouse',
      description:
        'Gloves can be Consumables according to company practice. Raw materials, packaging, auxiliaries, consumables, and chemicals are production material categories, not separate warehouses. Everyday production gloves correspond to the Production Material Warehouse; check that warehouse and actual quantities when receiving purchases or recording material inbound stock.',
    },
    workflow: {
      title: 'Continue with the same material',
      description:
        'Check for duplicates and create the record → choose the primary unit → define package conversion if needed → enter BOM usage in that unit → verify packages and actual quantities in purchasing and receiving. Read the independent BOM guide for the full recipe workflow.',
    },
    checkExisting: {
      title: 'Check names and specifications for duplicates',
      description:
        'Search existing gloves and compare material, size, and measurement conventions. Reuse the record for identical gloves; create separate records for distinct specifications to avoid splitting purchasing and inventory across duplicate codes.',
    },
    chooseUnit: {
      title: 'Use pairs as the primary unit and bags as packaging',
      description:
        'Align the primary unit with BOM consumption and inventory checks. Choose pairs here. If missing, maintain the unit through Unit Settings, then verify its name and code before selection.',
    },
    dimensions: {
      title: 'Structured dimensions belong to packaging materials',
      description:
        'The Packaging category displays internal and logistics dimensions. Gloves do not need that category just because they arrive in bags of 10 pairs; maintain the quantity per bag in Assembly Rules.',
    },
    saveRecord: {
      title: 'Save and verify the material',
      description:
        'Check name, specification, category, and unit, save, then find the material in the list and verify its code. New codes are generated by the system with a preview based on name and category. BOMs, purchases, and inventory should reference the saved material.',
    },
    whenToConvert: {
      title: 'When a package conversion is useful',
      description:
        'Use a rule when consumption is in pairs, metres, or square metres and purchasing uses fixed bags, boxes, or rolls. Examples include 10 pairs of gloves per bag, 100 components per box, or 25 m² of film per roll. Confirm the supplier package quantity first.',
    },
    baseUnit: {
      title: 'The material supplies the base unit',
      description:
        'Selecting a material fills the read-only base unit from its record. If the gloves do not show the unit for pairs, return to the material archive and check its primary unit.',
    },
    direction: {
      title: 'Enter the factor according to the preview equation',
      description:
        'Forward means 1 package unit = factor × base units, so enter 10 here. Reverse means 1 base unit = factor × package units. The equivalent reverse factor is 0.1, not 10. Factors must be greater than zero.',
    },
    singleRule: {
      title: 'One conversion rule per material is currently supported',
      description:
        'Edit the existing rule when present. Multiple bag and box rules for the same material and automatic box → bag → pair chains are not supported. Agree on the applicable convention and verify each order when supplier package sizes differ.',
    },
    bomUsage: {
      title: 'Keep BOM usage in pairs',
      description:
        'Select the saved gloves in the BOM and enter the actual standard usage per finished product in the primary unit, pairs. The business determines the usage rate; this example only assumes total analyzed demand of 25 pairs.',
    },
    wholeBags: {
      title: 'Convert 25 pairs into at least 3 bags',
      description:
        'Part requirements rounds the package suggestion upward from total demand: 25 ÷ 10 = 2.5 bags, giving 3 whole bags. Confirm actual purchases against available inventory, shortages, and supplier minimum quantities.',
    },
    purchaseQuantity: {
      title: 'Match quantity and price to the same unit',
      description:
        'Describe the order as 3 bags, 10 pairs each, 30 pairs total. If the purchase line remains measured in pairs, enter 30 and check price per pair; entering 3 while retaining pairs is incorrect. If a document permits purchasing in bags, confirm the unit, pairs per bag, and pricing convention.',
    },
    receivedQuantity: {
      title: 'Check the actual delivery before recording quantities',
      description:
        'If 3 bags arrive and each contains 10 pairs, the base quantity is 30 pairs. Record the count actually received when different. The 5 pairs above the 25-pair requirement are checked against actual inventory after subsequent issues; a suggestion is not evidence of receipt or consumption.',
    },
    checkRecord: {
      title: 'Verify the material record',
      description:
        'No duplicate record for the same specification; correct category; clear name and specification; primary unit consistent with BOM, purchasing, and inventory checks.',
    },
    checkConversion: {
      title: 'Verify the conversion',
      description:
        'Correct material; supplier package quantity confirmed; base unit matches the primary unit; positive factor; preview reads 1 bag = 10 pairs, or equivalently 1 pair = 0.1 bags in reverse.',
    },
    followBusinessFlow: {
      title: 'Continue with BOM, requirements, purchases, or receipts',
      description:
        'Use the BOM guide to establish a recipe, and the part requirements guide or page to review order demand and whole-package suggestions. Conduct purchases and inventory operations in their business pages. Reading these examples does not create transactions.',
    },
    relatedPackaging: {
      title: 'Other packaging tasks belong to their business modules',
      description:
        'Assembly Rules here defines unit conversion. Warehouse Configuration → Packaging Assembly binds package codes to product barcodes. Logistics Packaging Management maintains dimensions and capacities used by loading calculations. Their complete workflows will have separate guides.',
    },
  },
  materialFields: {
    title: 'Glove material field example',
    headers: {
      field: 'Interface field',
      value: 'Example value',
      explanation: 'Reason',
    },
    category: {
      field: 'Category',
      value: 'Consumables',
      explanation:
        'Classify by actual use; purchasing by the bag does not change the category.',
    },
    name: {
      field: 'Material name',
      value: 'Protective gloves',
      explanation: 'A clear name for BOM, purchasing, and warehouse searches.',
    },
    specification: {
      field: 'Specification',
      value: 'Cotton yarn, size L',
      explanation:
        'Specify material and size relevant to purchasing and consumption.',
    },
    unit: {
      field: 'Measurement unit',
      value: 'Pairs',
      explanation:
        'BOM and usage are measured in pairs; the conversion base unit comes from here.',
    },
    code: {
      field: 'System code',
      value: 'Use the generated code',
      explanation:
        'Verify the saved code and reference the same material downstream.',
    },
    remarks: {
      field: 'Remarks',
      value: 'Supplier standard packaging: 10 pairs per bag',
      explanation:
        'Remarks help checks; save the formal conversion in Assembly Rules as well.',
    },
  },
  conversionFields: {
    title: 'Fill in 1 bag = 10 pairs',
    headers: {
      field: 'Interface field',
      value: 'Enter or verify',
      explanation: 'Meaning',
    },
    material: {
      field: 'Target material',
      value: 'Saved protective gloves',
      explanation: 'Match name, specification, and code.',
    },
    baseUnit: {
      field: 'Base unit',
      value: 'Automatically filled unit for pairs',
      explanation: 'Read-only, from the material primary unit.',
    },
    packUnit: {
      field: 'Package unit',
      value: 'Bag',
      explanation:
        'Enter the package name; put quantity per bag in the factor.',
    },
    factor: {
      field: 'Factor and direction',
      value: '10',
      explanation: 'Forward: 1 bag contains 10 pairs.',
    },
    direction: {
      field: 'Switch direction',
      value: 'Keep forward: 1 bag = 10 pairs',
      explanation: 'The equivalent reverse factor would be 0.1.',
    },
    preview: {
      field: 'Conversion preview',
      value: '1 bag = 10 pairs',
      explanation: 'Verify the equation before selecting Save.',
    },
  },
  gloveExample: {
    title: 'Assume 10 pairs per bag and demand of 25 pairs',
    headers: {
      step: 'Check',
      value: 'Example quantity',
      explanation: 'Convention',
    },
    requirement: {
      field: 'BOM total requirements',
      value: '25 pairs',
      explanation: 'Aggregated in the material base unit.',
    },
    rule: {
      field: 'Confirmed conversion',
      value: '1 bag = 10 pairs',
      explanation: 'Confirmed from supplier packaging.',
    },
    wholeBags: {
      field: 'Whole-package suggestion',
      value: '25 ÷ 10 = 2.5 → 3 bags',
      explanation:
        'Round up, then verify inventory and the actual purchase quantity.',
    },
    received: {
      field: 'Assumed actual delivery',
      value: '3 bags × 10 = 30 pairs',
      explanation: 'Match actual quantity and unit; count the delivered goods.',
    },
    remainder: {
      field: 'Assume 25 pairs are subsequently issued',
      value: '30 − 25 = 5 pairs',
      explanation:
        'Illustrative remainder; actual balances come from inventory transactions.',
    },
  },
}
