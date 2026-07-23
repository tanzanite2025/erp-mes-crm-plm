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
    filtersTitle: 'Reserved filters',
    filters: 'Month / customer / product model / production line / plan status',
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
