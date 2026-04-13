export const tradingQueryKeys = {
  customers: (): readonly ['customers'] => ['customers'],
  customerList: (): readonly ['customers', 'list'] => ['customers', 'list'],
  payableDetail: (id: string): readonly ['payables', string] => ['payables', id],
  settlementRecordEvidences: (
    type: 'receipt' | 'payment',
    recordId: string,
  ): readonly ['settlement-record-evidences', 'receipt' | 'payment', string] => [
    'settlement-record-evidences',
    type,
    recordId,
  ],
  payableSearch: (
    keyword: string,
    status: string,
    currency: string,
    outstandingMin: string,
    outstandingMax: string,
    sortBy: string,
    sortOrder: string
  ): readonly ['payables', 'search', string, string, string, string, string, string, string] => [
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
  purchaseOrderDetail: (id: string): readonly ['purchase-orders', string] => ['purchase-orders', id],
  purchaseOrders: (
    page: number,
    pageSize: number
  ): readonly ['purchase-orders', number, number] => ['purchase-orders', page, pageSize],
  purchaseOrdersRoot: (): readonly ['purchase-orders'] => ['purchase-orders'],
  purchaseReturns: (
    page: number,
    pageSize: number
  ): readonly ['purchase-returns', number, number] => ['purchase-returns', page, pageSize],
  purchaseReturnsRoot: (): readonly ['purchase-returns'] => ['purchase-returns'],
  receivableDetail: (id: string): readonly ['receivables', string] => ['receivables', id],
  receivableSearch: (
    keyword: string,
    status: string,
    currency: string,
    outstandingMin: string,
    outstandingMax: string,
    sortBy: string,
    sortOrder: string
  ): readonly ['receivables', 'search', string, string, string, string, string, string, string] => [
    'receivables',
    'search',
    keyword,
    status,
    currency,
    outstandingMin,
    outstandingMax,
    sortBy,
    sortOrder,
  ],
  receivables: (): readonly ['receivables'] => ['receivables'],
  salesOrdersRoot: (): readonly ['sales-orders'] => ['sales-orders'],
  salesOrders: (
    page: number,
    pageSize: number,
    withLines: boolean,
    status: string[]
  ): readonly ['sales-orders', number, number, boolean, string[]] => [
    'sales-orders',
    page,
    pageSize,
    withLines,
    status,
  ],
  salesOrderDetail: (id: string): readonly ['sales-orders', string] => ['sales-orders', id],
  suppliers: (): readonly ['suppliers'] => ['suppliers'],
  supplierList: (): readonly ['suppliers', 'list'] => ['suppliers', 'list'],
} as const
