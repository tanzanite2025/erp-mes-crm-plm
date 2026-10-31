export const purchaseOperationGuide = {
  title: 'Purchasing operation guide',
  domainLabel: 'Purchasing · Online handbook',
  introduction:
    'Follow supplier and material preparation, purchase orders, logistics and receiving, returns, and payables. Open the relevant business page when you are ready to act.',
  mobileIntroduction:
    'Read the purchasing workflow, from preparation to receiving, returns, and payment checks.',
  shortcutDescription:
    'Learn purchase ordering, receipt posting, returns, and payable reconciliation.',
  contentsLabel: 'Purchasing guide chapters',
  readingAreaLabel: 'Purchasing guide reading area',
  prerequisiteLabel: 'Before you start',
  stepsLabel: 'Steps',
  resultLabel: 'Check the result',
  questionLabel: 'Common question',
  referenceTitle: 'Related business pages',
  referenceDescription:
    'Continue in the original business page. Available actions depend on your permissions, document status, and page instructions.',
  references: {
    suppliers: 'Manage suppliers',
    materials: 'View production materials',
    orders: 'Open purchase orders',
    logistics: 'Open purchase logistics',
    settlements: 'Open receivables and payables',
  },
  chapters: {
    preparation: {
      label: 'Prepare records',
      shortLabel: 'Prepare',
      title: 'Confirm the supplier and the materials',
      description:
        'Supplier records, material records, and settlement terms form the basis of a purchase order. Review and reuse existing records.',
      prerequisite:
        'Have the supplier name and contact, material code or name, quantity, agreed unit price, and expected delivery date ready.',
      result:
        'You can identify the supplier and materials and confirm units, currency, payment method, and payment terms.',
      question: 'What if a supplier or material cannot be found?',
      answer:
        'Check the search filters and record availability. Create missing records in their owning pages or ask the responsible person if you lack permission. Avoid substituting a similarly named record.',
    },
    orders: {
      label: 'Create and place orders',
      shortLabel: 'Order',
      title: 'Create the order and verify that it was placed',
      description:
        'Save and review order details before advancing the order through the actions available on its page.',
      prerequisite:
        'Confirm the supplier and materials, include at least one line with a positive quantity, and agree delivery and settlement terms.',
      result:
        'Reopen the order and check its number, supplier, quantities, amount, dates, and status. Saving a draft and placing an order are separate outcomes.',
      question: 'Why can I not edit, receive, or void an order?',
      answer:
        'Both status and permissions determine available actions. Direct editing normally applies to drafts; received and voided orders are no longer handled as open orders. Refresh after a version conflict and check before resubmitting.',
    },
    receiving: {
      label: 'Logistics and receiving',
      shortLabel: 'Receive',
      title: 'Track delivery, then confirm each receipt line',
      description:
        'Logistics tracks transportation. Warehouse receiving records actual quantities, batches, and locations. Check both results separately.',
      prerequisite:
        'The order must allow receiving. Inspect the goods and prepare actual received quantities, batch numbers, and target warehouse categories.',
      result:
        'Check received and remaining quantities and the warehouse inbound result. For partial deliveries, confirm only the quantity received this time.',
      question: 'Why is receiving incomplete after the carrier marks delivery?',
      answer:
        'Carrier delivery does not automatically confirm warehouse receiving. Use “Confirm Receipt & Inbound” in the purchase order and verify the result and stock. Do not confirm a batch that has already been posted.',
    },
    returns: {
      label: 'Returns and exceptions',
      shortLabel: 'Returns',
      title: 'Record returns against the source purchase order',
      description:
        'The current purchase return entry uses remaining receivable quantities on source order lines and keeps links to the supplier and line records.',
      prerequisite:
        'Locate the source order, check its status, eligible lines, and displayed remaining quantities, and prepare reasons, issue categories, and evidence.',
      result:
        'Review the source order, lines, quantities, amounts, reasons, and attachments in return history, then check the order’s remaining quantities.',
      question: 'Why is a fully received order missing from the eligible list?',
      answer:
        'This entry handles remaining receivable quantities on sent or in-transit orders: ordered minus received minus returned. It is not a direct supplier-return shipment for stock already received. Purchasing, warehouse, and finance should review that physical and financial handling first.',
    },
    settlement: {
      label: 'Payables and payments',
      shortLabel: 'Payment',
      title: 'Reconcile payables, payments, and balances by source',
      description:
        'Purchase orders record purchasing activity. Payable ledgers and payment registration are handled in their financial details.',
      prerequisite:
        'Confirm the source order, supplier, currency, and actual payment evidence and have the relevant finance permissions.',
      result:
        'Check the source document, payable amount, paid amount, outstanding balance, and payment allocations, retaining traceable evidence.',
      question: 'What if “View Payable” reports no ledger?',
      answer:
        'Confirm the selected order, then ask finance to check ledger creation and business status. Saving an order does not mean payment is complete. Do not create a duplicate order to resolve a missing ledger.',
    },
  },
  topics: {
    suppliers: {
      title: 'Review supplier records',
      description:
        'Find the existing supplier and check its name, contact details, and availability. An authorized person should maintain any required changes.',
    },
    materials: {
      title: 'Confirm materials and units',
      description:
        'Check codes, specifications, and units in production material records. Select the actual material and use the agreed quantity and price units, keeping different specifications separate.',
    },
    terms: {
      title: 'Agree price, dates, and payment terms',
      description:
        'Confirm currency, exchange rate, payment method, payment terms, and expected delivery before ordering. Ask the responsible person to maintain missing configuration options.',
    },
    header: {
      title: 'Enter the order header',
      description:
        'Create a purchase order, select its supplier, and enter order date, purchaser, currency, and settlement terms. Attach purchase contract evidence where needed.',
    },
    lines: {
      title: 'Review each purchase line',
      description:
        'Select materials and enter quantities, prices, dates, and notes. Verify specifications and amounts before saving. Use the saved document as the final amount reference.',
    },
    status: {
      title: 'Verify order placement and status',
      description:
        'After reviewing the details, use the page’s order placement action. Orders can progress through draft, sent, in transit, and received states as the actual work advances.',
    },
    logistics: {
      title: 'Register and track inbound logistics',
      description:
        'Find or register the inbound logistics record and verify its order and tracking number. Offline drafts remain on the current device until synchronization succeeds.',
    },
    receipt: {
      title: 'Enter the actual receipt',
      description:
        'Open receipt confirmation from the order details and enter each quantity, batch number, and target category. The quantity cannot exceed the remaining receivable quantity.',
    },
    inbound: {
      title: 'Post and verify warehouse receiving',
      description:
        'Review the receipt date and notes, then submit “Confirm Receipt & Inbound”. Verify success and refreshed order and stock records. Query uncertain results before retrying.',
    },
    returnSource: {
      title: 'Select the source order and lines',
      description:
        'Use the return entry within purchase orders to select an eligible order. Review remaining receivable quantities and add only the lines that need handling now.',
    },
    returnEvidence: {
      title: 'Enter quantities, reasons, and evidence',
      description:
        'Enter return quantities, date, issue categories, reasons, and notes. Add document or line evidence as needed and respect the displayed eligible quantities.',
    },
    returnReview: {
      title: 'Review history and follow-up effects',
      description:
        'After saving, review return history, source quantities, and amounts. Check physical goods, stock, and finance separately rather than treating the return record as completion of all work.',
    },
    payableSource: {
      title: 'Locate the source payable ledger',
      description:
        'Use “View Payable” on the purchase order, or open receivables and payables in finance, switch to payables, and find the supplier and source document.',
    },
    payment: {
      title: 'Record actual payment and allocations',
      description:
        'Register payment using actual evidence in payable details. Check the date, amount, and allocated documents. Required fields and available actions follow the finance page.',
    },
    reconciliation: {
      title: 'Reconcile the outstanding balance',
      description:
        'After payment, review paid and outstanding amounts, due date, and allocations. Verify return-related amount changes in the ledger; logistics and order statuses do not establish financial results.',
    },
  },
} as const
