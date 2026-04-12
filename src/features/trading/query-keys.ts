export const tradingQueryKeys = {
  customers: (): readonly ['customers'] => ['customers'],
  customerList: (): readonly ['customers', 'list'] => ['customers', 'list'],
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
