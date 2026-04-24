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
  payables: (): readonly ['payables'] => ['payables'],
  purchaseOrderDetail: (id: string): readonly ['purchase-orders', string] => [
    'purchase-orders',
    id,
  ],
  purchaseOrders: (
    page: number,
    pageSize: number
  ): readonly ['purchase-orders', number, number] => [
    'purchase-orders',
    page,
    pageSize,
  ],
  purchaseOrdersRoot: (): readonly ['purchase-orders'] => ['purchase-orders'],
  purchaseReturns: (
    page: number,
    pageSize: number
  ): readonly ['purchase-returns', number, number] => [
    'purchase-returns',
    page,
    pageSize,
  ],
  purchaseReturnsRoot: (): readonly ['purchase-returns'] => [
    'purchase-returns',
  ],
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
  ): readonly ['sales-orders', number, number, boolean, string[], string, string, string, string] => [
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
  suppliers: (): readonly ['suppliers'] => ['suppliers'],
  supplierList: (): readonly ['suppliers', 'list'] => ['suppliers', 'list'],
} as const
