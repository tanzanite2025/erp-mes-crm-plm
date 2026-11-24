export const productCodeLinearBarcodeAndQrCodeOperationGuide = {
  title: 'Product Code (Linear Barcode / QR Code) Handbook',
  domainLabel: 'Product Handbook',
  introduction:
    'Follow the product-code workflows currently implemented: prepare data, configure rules, print labels, bind codes, and review status. Each code is issued once and rendered as matching linear-barcode and QR symbols; this does not mean every process or cross-domain history is connected.',
  mobileIntroduction:
    'Review the implemented product-code workflows by chapter. Printing, binding, and production records use one code; cross-domain history is not yet unified.',
  contentsLabel: 'Product code handbook chapters',
  readingAreaLabel: 'Product code handbook content',
  prerequisiteLabel: 'Before you start',
  stepsLabel: 'Steps',
  resultLabel: 'Expected result',
  questionLabel: 'Common question',
  referenceTitle: 'Open related pages',
  referenceDescription:
    'These links reuse the existing business pages and their validation and save logic. Only pages accessible to the current account are shown; the handbook does not duplicate business forms.',
  businessEntryHint: 'Open existing code business pages:',
  entries: {
    protocol: 'Configure protocol rules',
    holeCodes: 'Maintain hole codes',
    numberingEngine: 'View shared numbering engine',
    print: 'Open code printing',
    productBinding: 'Open product binding',
    productionExecution: 'Open production execution',
  },
  references: {
    protocol: 'Protocol rules',
    print: 'Code printing center',
    status: 'Product code status definitions',
    holeCodes: 'Hole code source',
    numberingEngine: 'Shared numbering engine',
    products: 'Product data',
    productBinding: 'Product binding',
    productionExecution: 'Production execution',
  },
  chapters: {
    overview: {
      label: 'Understand the code',
      shortLabel: 'Overview',
      title:
        'A linear barcode and a QR code are two symbols for one product code',
      description:
        'The product code is the unique identity used for printing, binding, and later traceability. A linear barcode is suited to scanner guns, while a QR code is suited to cameras or mobile terminals; both carry the same content and do not create separate serials.',
      prerequisite:
        'Confirm that the business needs a product-code label rather than a separate QR inventory or state machine.',
      result:
        'The team knows which page owns protocol, printing, status, binding, and on-site execution.',
      question: 'Does dual-symbol printing issue two codes?',
      answer:
        'No. One product code is rendered as both Code128 and QR symbols. Single or dual-symbol selection changes label layout only.',
    },
    preparation: {
      label: 'Prepare data',
      shortLabel: 'Prepare',
      title: 'Prepare the product and code sources first',
      description:
        'Before printing, prepare the product data, appearance value, hole-code sources, and an available shared numbering rule. This handbook describes dependencies without duplicating maintenance forms.',
      prerequisite:
        'The product exists, the order line can provide model, appearance, and hole-count snapshots, and code sources are enabled.',
      result:
        'Every print input has a clear source and missing values can be identified in the print analysis area.',
      question: 'Can we print first and fill missing data later?',
      answer:
        'No. Resolve print blockers first, then return to print analysis after product or source data is complete.',
    },
    rules: {
      label: 'Configure rules',
      shortLabel: 'Rules',
      title: 'Verify field sources in protocol and shared numbering pages',
      description:
        'Protocol rules define the protocol version and numbering-rule key. The hole-code page maintains shared sources, while the shared numbering engine owns centralized numbering configuration. Printing must not override these rules temporarily.',
      prerequisite:
        'You can access protocol rules, hole-code sources, and the shared numbering engine and know which rule applies to this product.',
      result:
        'The protocol version, numbering key, and field sources are clear and the print page reads the same configuration.',
      question: 'Can QR codes use a separate numbering rule?',
      answer:
        'No. A QR code is another symbol for the same product code and has no separate serial or inventory.',
    },
    printing: {
      label: 'Generate and print',
      shortLabel: 'Print',
      title: 'Select a sales order, analyze it, then preview labels',
      description:
        'In the code printing center, select a sales order and line, set an independent preprint quantity, review field analysis and blockers, then generate a preview. The label can use a linear symbol, QR symbol, or both.',
      prerequisite:
        'The order is printable, order-line snapshots are complete, the protocol is configured, and the preprint quantity is an integer from 1 to 200.',
      result:
        'The preview shows one unique product code per label and the selected symbol representation for that code.',
      question:
        'Can I click print again immediately after closing the preview?',
      answer:
        'Check the task result and inventory status first. A closed preview follows the existing batch-safety rules; do not assume the action will issue or reuse a number again.',
    },
    bindingAndUse: {
      label: 'Bind and use',
      shortLabel: 'Use',
      title: 'Binding and on-site scanning have separate boundaries',
      description:
        'Product binding links an issued product code to an activated prepreg roll-instance QR code; this material-trace relation is not a production-start prerequisite. Production Execution reads the code and shows its current state and process, plus production state events, operations, and transfers. This history does not include binding events, and reading does not submit an operation or perform inspection entry.',
      prerequisite:
        'Product binding requires an available issued product code, an activated prepreg roll-instance QR code, and access to the product-binding page. Recording a process operation also requires production execution permission.',
      result:
        'Review the current production state and recorded production history; confirm each process operation explicitly. Do not start a process that is already in progress. A completed process requires an explicit rework operation before it can start again; a held or rework process can resume with Start.',
      question:
        'Does the lifecycle history include complete inspection and warehouse records?',
      answer:
        'It currently shows production state events, process operations, and production transfers. Product-binding records must be queried separately; the two histories are not yet combined. This also does not represent complete inspection entry, quality decisions, warehouse, or after-sales history. Scanning only reads data and does not advance a process.',
    },
    statusAndExceptions: {
      label: 'Status and exceptions',
      shortLabel: 'Exceptions',
      title: 'Handle reprints, expiry, and scrap by inventory status',
      description:
        'The status page defines available, bound, expired, and scrapped codes. Reprints use the original code; rendering failures, closed batches, and bound codes follow the displayed status boundaries.',
      prerequisite:
        'Review the code inventory status and task result before choosing reprint, retry, or manual handling.',
      result:
        'Exception handling does not issue another number or create a new product relation for a bound or scrapped code.',
      question: 'Does a reprint create a new product code?',
      answer:
        'No. Reprint uses the original code. If it is expired, scrapped, or otherwise unavailable, follow the status boundary instead of bypassing it.',
    },
  },
  topics: {
    meaning: {
      title: 'Confirm the unique product-code identity',
      description:
        'Treat the product code as the identity of one product label. Code128 and QR are reading and display formats, not separate business records.',
    },
    sameContent: {
      title: 'Verify matching linear and QR content',
      description:
        'The preview shows both symbols for one row. Confirm that both correspond to the same full product code.',
    },
    ownership: {
      title: 'Separate code-center ownership from execution',
      description:
        'The code center owns rules, numbering, printing, and inventory status. Production scanning writes separate production facts; binding records are queried separately, and binding is not required to start production.',
    },
    product: {
      title: 'Confirm product data and order lines',
      description:
        'Verify model, specification, and appearance data in product management and make sure the sales order line snapshot comes from the correct product.',
    },
    appearance: {
      title: 'Check the appearance value',
      description:
        'The protocol reads the appearance snapshot from the order line. Correct product or order data before print analysis if it is missing or wrong.',
    },
    sources: {
      title: 'Maintain hole-code and shared-numbering sources',
      description:
        'Hole type, hole count, and shared numbering are maintained on their own pages. Their enabled states and rule key must match the product protocol.',
    },
    openProtocol: {
      title: 'Open protocol rules',
      description:
        'Use the protocol page to review the current version and field sources. Do not copy or override rules in the print page.',
    },
    checkSources: {
      title: 'Verify shared code sources',
      description:
        'Check that hole type, hole count, and numbering-engine configuration exist and are enabled. Authorized users maintain missing data on the relevant page.',
    },
    verifyRule: {
      title: 'Confirm the numbering-rule key',
      description:
        'The print analysis lists a missing numbering key as a blocker. Resolve it in protocol and shared numbering pages first.',
    },
    selectOrder: {
      title: 'Select a sales order and line',
      description:
        'Choose the order to print and review model, hole type, appearance, hole count, and quantity for each line.',
    },
    previewLabels: {
      title: 'Set quantity and review the preview',
      description:
        'Preprint quantity is independent of order quantity. Review quantity and blockers before generating the label preview.',
    },
    printBoundary: {
      title: 'Complete printing from the preview',
      description:
        'The browser preview is part of the print interaction. Follow the displayed error when the window is blocked or rendering fails.',
    },
    bindProduct: {
      title: 'Create the relation on product binding',
      description:
        'Submit the issued product barcode and an activated prepreg roll-instance QR code. Only an available code can be bound; success moves its inventory status to bound.',
    },
    scanBoundary: {
      title: 'Read the code on site',
      description:
        'Use manual input, a camera, or a scanner in Production Execution to read the code on the product label. Reading only retrieves the current state; it does not register or submit a process operation.',
    },
    readLifecycleHistory: {
      title: 'Read the current process and production history',
      description:
        'After a successful read, review the production state and current process. The lifecycle section groups production state changes and transfers with process operations and shows separate totals for all three record types. It does not include binding events; query binding records separately. Choose Load older production records for longer histories; the event for the current production state is marked first. If no production state record is shown, verify the code and whether production has started; this alone does not establish whether the inventory code is valid. Retry failed reads instead of treating them as no history.',
    },
    qualityStationBoundary: {
      title: 'Keep the inspection-station boundary',
      description:
        'Scanning and inspection entry at the forming, machining, finishing, and coating stations do not happen in the code center; the center is only the referenced code source.',
    },
    statusMeaning: {
      title: 'Use status definitions to judge availability',
      description:
        'The status page explains inventory and production states. It is not a dictionary editor for directly changing state.',
    },
    reprint: {
      title: 'Reprint with the original code',
      description:
        'Choose the original code from inventory and confirm its status and task result before reprinting.',
    },
    exceptionHandling: {
      title: 'Handle each blocker by its cause',
      description:
        'Missing fields, unconfigured rules, rendering failures, closed previews, and bound codes have separate handling paths. Do not hide an issue by issuing another number.',
    },
  },
}
