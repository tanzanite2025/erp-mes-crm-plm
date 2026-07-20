export const tradingQueryKeys = {
  customers: (): readonly ['customers'] => ['customers'],
  customerList: (): readonly ['customers', 'list'] => ['customers', 'list'],
  customerSalesClosureSummary: (): readonly [
    'customers',
    'sales-closure-summary',
  ] => ['customers', 'sales-closure-summary'],
  customerSalesReturnSummary: (): readonly [
    'customers',
    'sales-return-summary',
  ] => ['customers', 'sales-return-summary'],
  payableDetail: (id: string): readonly ['payables', string] => [
    'payables',
    id,
  ],
  settlementRecordEvidences: (
    type: 'receipt' | 'payment',
    recordId: string
  ): readonly [
    'settlement-record-evidences',
    'receipt' | 'payment',
    string,
  ] => ['settlement-record-evidences', type, recordId],
  payableSearch: (
    keyword: string,
    status: string,
    currency: string,
    outstandingMin: string,
    outstandingMax: string,
    sortBy: string,
    sortOrder: string
  ): readonly [
    'payables',
    'search',
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ] => [
    'payables',
    'search',
    keyword,
    status,
    currency,
    outstandingMin,
    outstandingMax,
    sortBy,
    sortOrder,
  ],
  payables: (
    sourceType?: string,
    sourceRefId?: string
  ): readonly ['payables', 'list', string, string] => [
    'payables',
    'list',
    sourceType ?? '',
    sourceRefId ?? '',
  ],
  salesOrderAfterSalesSummary: (
    salesOrderIds: readonly string[]
  ): readonly ['sales-orders', 'after-sales-summary', readonly string[]] => [
    'sales-orders',
    'after-sales-summary',
    salesOrderIds,
  ],
  salesOrderPackagingProductOptions: (): readonly [
    'sales-orders',
    'packaging-product-options',
  ] => ['sales-orders', 'packaging-product-options'],
  salesOrdersRoot: (): readonly ['sales-orders'] => ['sales-orders'],
  salesOrders: (
    page: number,
    pageSize: number,
    withLines: boolean,
    status: string[],
    customerId: string,
    keyword: string,
    paymentMethod: string,
    paymentTerm: string
  ): readonly [
    'sales-orders',
    number,
    number,
    boolean,
    string[],
    string,
    string,
    string,
    string,
  ] => [
    'sales-orders',
    page,
    pageSize,
    withLines,
    status,
    customerId,
    keyword,
    paymentMethod,
    paymentTerm,
  ],
  salesReturnsSourceOrders: (
    page: number,
    pageSize: number,
    status: string,
    customerId: string,
    keyword: string
  ): readonly [
    'sales-returns',
    'source-orders',
    number,
    number,
    string,
    string,
    string,
  ] => [
    'sales-returns',
    'source-orders',
    page,
    pageSize,
    status,
    customerId,
    keyword,
  ],
  salesReturnsSourceOrderDetail: (
    id: string
  ): readonly ['sales-returns', 'source-orders', string] => [
    'sales-returns',
    'source-orders',
    id,
  ],
  salesReturnsRoot: (): readonly ['sales-returns'] => ['sales-returns'],
  salesReturns: (
    page: number,
    pageSize: number,
    customerId: string,
    status: string,
    keyword: string
  ): readonly ['sales-returns', number, number, string, string, string] => [
    'sales-returns',
    page,
    pageSize,
    customerId,
    status,
    keyword,
  ],
  salesReturnDetail: (id: string): readonly ['sales-returns', string] => [
    'sales-returns',
    id,
  ],
  salesReturnActualAmountRecords: (
    id: string
  ): readonly ['sales-returns', string, 'actual-amount-records'] => [
    'sales-returns',
    id,
    'actual-amount-records',
  ],
  salesExchangesRoot: (): readonly ['sales-exchanges'] => ['sales-exchanges'],
  salesExchanges: (
    page: number,
    pageSize: number,
    customerId: string,
    status: string,
    keyword: string
  ): readonly ['sales-exchanges', number, number, string, string, string] => [
    'sales-exchanges',
    page,
    pageSize,
    customerId,
    status,
    keyword,
  ],
  salesExchangeDetail: (id: string): readonly ['sales-exchanges', string] => [
    'sales-exchanges',
    id,
  ],
  salesOrderDetail: (id: string): readonly ['sales-orders', string] => [
    'sales-orders',
    id,
  ],
  salesOrderPreviewBarcode: (
    classificationAlias: string
  ): readonly ['sales-orders', 'preview-barcode', string] => [
    'sales-orders',
    'preview-barcode',
    classificationAlias,
  ],
} as const
