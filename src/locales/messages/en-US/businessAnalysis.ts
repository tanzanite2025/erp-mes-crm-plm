export const businessAnalysis = {
  moduleTitle: 'Business Analysis',
  moduleDescription:
    'A unified read-only analysis domain for production, quality, sales, and customer data.',
  tabs: {
    overview: 'Analysis Overview',
    productionCapacity: 'Monthly Capacity',
    productionLoad: 'Capacity Load',
    productionEfficiency: 'Production Efficiency',
    scrap: 'Scrap Analysis',
    defectTrend: 'Defect Trend',
    orders: 'Order Analysis',
    customers: 'Customer Analysis',
  },
  overview: {
    title: 'Business analysis domain is ready',
    description:
      'This domain owns cross-domain analysis without modifying business facts.',
    ownershipTitle: 'Data ownership boundary',
    ownershipDescription:
      'Production, sales, and quality keep their own facts; analysis owns aggregation, comparison, trends, and drill-down.',
    productionTitle: 'Production analysis',
    productionDescription:
      'Monthly capacity, load, and efficiency will be aggregated from production facts.',
    qualityTitle: 'Quality analysis',
    qualityDescription:
      'Scrap and defect trends must read confirmed quality-domain data.',
    customerTitle: 'Customers and sales',
    customerDescription:
      'Order and customer analysis share one business-analysis entry.',
    nextStepTitle: 'Current implementation phase',
    nextStepDescription:
      'Phase one establishes the canonical route and menu; capacity and scrap statistics follow the data-contract work.',
  },
  productionCapacity: {
    title: 'Monthly capacity analysis',
    description:
      'Review planned, completed, qualified, and scrapped quantities by month, customer, product model, and production resource.',
    status: 'Data contract in progress',
    statusDescription:
      'The analysis entry is ready. Formal metrics require confirmed completion facts, scrap quantities, and cross-domain keys.',
    plannedQuantity: 'Planned quantity',
    completedQuantity: 'Completed quantity',
    qualifiedQuantity: 'Qualified quantity',
    scrapQuantity: 'Scrap quantity',
    achievementRate: 'Achievement rate',
    filtersTitle: 'Reserved filters',
    filters: 'Month / customer / product model / production line / plan status',
    from: 'Start date',
    toExclusive: 'End date (exclusive)',
    customer: 'Customer',
    product: 'Product model',
    statusFilter: 'Plan status',
    allCustomers: 'All customers',
    allProducts: 'All products',
    includeCanceled: 'Include canceled plans',
    statuses: {
      ALL: 'All statuses',
      SCHEDULED: 'Scheduled',
      IN_PROGRESS: 'In progress',
      COMPLETED: 'Completed',
      CANCELED: 'Canceled',
    },
    unavailable: 'Unavailable',
    unlinked: 'Unlinked customer',
    dataQualityTitle: 'Data quality',
    dataQualitySummary:
      'There are {scrapRecords} quality scrap records in this range, {missingQuantity} without scrap quantity, and {unlinkedQuality} without a linked inspection task. Formal scrap metrics are excluded until the contract is complete.',
    dataQualityLoading: 'Loading data quality information…',
    qualityQuantityMissing: 'Quality abnormalities do not store scrap quantity or unit.',
    qualityLinkageMissing:
      'Quality records do not yet have a stable production plan, order, or customer link.',
    qualityNoteFallback: 'An unmapped data-quality condition was reported.',
    byProductTitle: 'By product model',
    byCustomerTitle: 'By customer',
    byDayTitle: 'Daily trend',
    date: 'Date',
    noRows: 'No data is available for the selected range',
    loading: 'Loading business analysis data…',
    loadError: 'Business analysis data could not be loaded. Try again later.',
    refresh: 'Refresh',
    sourceTitle: 'Current data boundary',
    sourceDescription:
      'Production plans and tasks provide production facts, sales orders provide customer dimensions, and quality provides scrap facts; anomaly counts will not be used as scrap quantities.',
  },
  placeholder: {
    status: 'Analysis page slot is ready',
    description:
      'This page belongs to the business-analysis domain and will receive formal metrics after its data contract and aggregation API are complete.',
  },
} as const
