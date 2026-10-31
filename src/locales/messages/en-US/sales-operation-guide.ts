export const salesOperationGuide = {
  title: 'Sales operation guide',
  domainLabel: 'Sales · Online handbook',
  introduction:
    'Read about customer and product preparation, sales orders, delivery, returns and exchanges, and collection checks. Continue in the relevant business page when needed.',
  mobileIntroduction:
    'Start with customers and products, then learn ordering, delivery, after-sales work, and collection checks.',
  shortcutDescription:
    'Learn sales ordering, delivery follow-up, returns, exchanges, and receivable reconciliation.',
  contentsLabel: 'Sales guide chapters',
  readingAreaLabel: 'Sales guide reading area',
  prerequisiteLabel: 'Before you start',
  stepsLabel: 'Steps',
  resultLabel: 'Check the result',
  questionLabel: 'Common question',
  referenceTitle: 'Related business pages',
  referenceDescription:
    'Continue in the original business page. Available actions depend on your permissions, document status, and page instructions.',
  references: {
    customers: 'Manage customers',
    products: 'View products',
    productGuide: 'Read the product creation guide',
    quotes: 'Open quotation management',
    orders: 'Open sales orders',
    shipment: 'Open warehouse shipments',
    vehicleMatch: 'Open vehicle matching',
    logistics: 'View sales logistics',
    returns: 'Open sales returns',
    exchanges: 'Open sales exchanges',
    settlements: 'Open receivables and payables',
  },
  chapters: {
    preparation: {
      label: 'Customers and products',
      shortLabel: 'Prepare',
      title: 'Confirm the customer, specific product, and sales terms',
      description:
        'Customer records identify the trading party, specific product cards define the goods, and quotations and settlement terms establish pricing and delivery expectations.',
      prerequisite:
        'Prepare the customer and contact, product specifications, quantities, agreed prices, delivery dates, and collection terms.',
      result:
        'Identify the correct customer and specific products and confirm the basis for prices, units, currency, delivery, and collection terms.',
      question: 'Why check a specific product if a base model already exists?',
      answer:
        'A base model classifies products. Different specifications or BOMs can have separate product cards under the same base model. Check the actual product on each sales line. For missing products, use product management and its creation guide.',
    },
    orders: {
      label: 'Create and advance orders',
      shortLabel: 'Order',
      title: 'Create the sales order and review fulfillment requirements',
      description:
        'Record the customer agreement in the order and its lines, then advance status and production or delivery work according to actual progress.',
      prerequisite:
        'Confirm customers and products and prepare quantities, prices, delivery dates, packaging, and required contract evidence.',
      result:
        'Check the order number, customer, products, quantities, prices, dates, packaging, and status. Hand over the work after saving successfully.',
      question: 'Does marking an order complete mean it was shipped and paid?',
      answer:
        'Order status, warehouse shipment, logistics execution, and financial collection are separate records. Review each to verify actual results. For unavailable actions, check status, permissions, and the page’s reason.',
    },
    delivery: {
      label: 'Preparation and delivery',
      shortLabel: 'Deliver',
      title: 'Connect order demand with warehouse, vehicle, and logistics work',
      description:
        'Delivery spans order lines, warehouse shipment records, vehicle loading, and logistics tracking. Reconcile them against the same source document.',
      prerequisite:
        'Identify the source order and lines, available goods, shipment quantities, packaging, and recipient information. The responsible roles carry out each operation.',
      result:
        'Check the order lines, quantities, warehouse records, vehicle arrangements, and logistics for this shipment. Retain separate records for partial deliveries.',
      question:
        'Why is vehicle matching empty, or why do tracking quantities differ?',
      answer:
        'Vehicle matching reads actual shipment records from the virtual shipment warehouse. First check transfer against the correct order lines. A tracking number establishes transport linkage, not stock, order quantities, or final delivery completion.',
    },
    afterSales: {
      label: 'Returns and exchanges',
      shortLabel: 'After-sales',
      title: 'Handle after-sales work against the source sales order',
      description:
        'Returns and exchanges have separate records and execution steps. Check quantities, physical inbound receipts, and actual amount registration individually.',
      prerequisite:
        'Locate the source order and lines and prepare after-sales quantities, reasons, relevant barcodes, and evidence.',
      result:
        'For returns, check the return document, inbound receipts, and actual amounts. For exchanges, check old-item receipts, replacement preparation, and replacement shipments, preserving source links.',
      question:
        'Why did saving a return not produce the expected stock or receivable result?',
      answer:
        'Creating a return, confirming physical inbound receipt, and registering actual return amounts are separate operations. Check inbound and amount records before reviewing receivable adjustments. Track old-item and replacement execution separately for exchanges.',
    },
    settlement: {
      label: 'Receivables and collections',
      shortLabel: 'Collect',
      title:
        'Reconcile receivables, collection allocations, and return adjustments',
      description:
        'Use receivable ledgers to reconcile source sales documents, actual collections, and return amounts with traceable records.',
      prerequisite:
        'Confirm the customer, source order, currency, and actual collection evidence and have the relevant finance permissions.',
      result:
        'Check receivable amounts, collected amounts, outstanding balances, allocations, and source records for after-sales adjustments.',
      question: 'Why is there a balance or no ledger after shipment?',
      answer:
        'Delivery completion does not establish collection or allocation. Reconcile balances with actual collections, allocations, and after-sales amounts. Ask finance to verify the source and ledger status if missing; avoid duplicate orders or collection registrations.',
    },
  },
  topics: {
    customers: {
      title: 'Review customer records',
      description:
        'Find the existing customer and confirm its name, contact details, and address. Maintain changes through the original customer editor.',
    },
    products: {
      title: 'Confirm the specific products and specifications',
      description:
        'Check each actual product card, model, specification, and relevant configuration. Verify suitability before reuse rather than relying on the base model name alone.',
    },
    terms: {
      title: 'Confirm quotations and trading terms',
      description:
        'Use the separate quotation management page when a quote is needed. Check prices, currency, delivery dates, collection method, and payment terms before ordering. The saved order is authoritative.',
    },
    header: {
      title: 'Create the order header',
      description:
        'Create a sales order, select the customer, and enter date, responsible person, currency, and settlement terms. Add contract or order evidence.',
    },
    lines: {
      title: 'Enter products and fulfillment details',
      description:
        'Confirm products, specifications, quantities, prices, dates, and packaging line by line. Review line and total amounts before saving. Check for an existing order before creating another.',
    },
    workflow: {
      title: 'Advance and hand over the order',
      description:
        'After confirmation, select active orders directly in MRP, cutting, or barcode printing. Production plans and tasks update scheduling and production progress; full delivery completes the order. Assignment only records responsibility.',
    },
    stock: {
      title: 'Review warehouse shipment demand',
      description:
        'Find sales-order demand in warehouse shipments. Warehouse staff verify goods and quantities, then transfer against the order lines into the virtual shipment warehouse.',
    },
    shipping: {
      title: 'Arrange vehicles using actual shipment records',
      description:
        'Use actual virtual-warehouse shipment records for vehicle matching. Verify the load, quantities, and packaging before arranging transport.',
    },
    tracking: {
      title: 'Track logistics and reconcile delivery records',
      description:
        'Review transport records, tracking numbers, and source links in sales logistics. Verify shipment quantities, stock changes, and transport status separately and trace differences to their source.',
    },
    returns: {
      title: 'Handle returns and physical inbound receipts',
      description:
        'Search the source order in sales returns, select lines and quantities, and enter reasons. When goods arrive, confirm inbound against the return and verify target category, batch, and required barcodes.',
    },
    exchanges: {
      title: 'Track old items and replacements',
      description:
        'Confirm source lines, quantities, and the replacement plan in sales exchanges. Handle old-item inbound, replacement preparation, and replacement shipment separately. A saved exchange does not establish shipment.',
    },
    returnAmounts: {
      title: 'Record and verify actual return amounts',
      description:
        'Register actual return amounts using the agreement and evidence, checking each amount and source. Then verify the matching receivable adjustments. Return quantities alone do not establish financial completion.',
    },
    receivableSource: {
      title: 'Locate the source receivable ledger',
      description:
        'Use “View Receivable” from the sales order or find the customer and source sales document in finance receivables and payables.',
    },
    collection: {
      title: 'Register actual collections and review allocations',
      description:
        'Register collections using actual evidence in receivable details. Check dates, currency, amounts, and allocated source documents. Follow the finance page’s required fields and actions.',
    },
    reconciliation: {
      title: 'Reconcile balances and after-sales adjustments',
      description:
        'Check collected and outstanding amounts and allocation records. For sales returns, verify adjustment sources and supporting evidence. Trace discrepancies before registering another collection.',
    },
  },
} as const
