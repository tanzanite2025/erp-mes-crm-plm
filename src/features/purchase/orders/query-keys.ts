export const purchaseOrderQueryKeys = {
  detail: (id: string): readonly ['purchase-orders', string] => [
    'purchase-orders',
    id,
  ],
  list: (
    page: number,
    pageSize: number,
    withLines: boolean,
    status: string[]
  ): readonly ['purchase-orders', number, number, boolean, string[]] => [
    'purchase-orders',
    page,
    pageSize,
    withLines,
    status,
  ],
  root: (): readonly ['purchase-orders'] => ['purchase-orders'],
  returns: (
    page: number,
    pageSize: number
  ): readonly ['purchase-returns', number, number] => [
    'purchase-returns',
    page,
    pageSize,
  ],
  returnsRoot: (): readonly ['purchase-returns'] => ['purchase-returns'],
  returnDictionaries: (dictType: string) =>
    ['purchase-return-dictionaries', dictType] as const,
} as const
