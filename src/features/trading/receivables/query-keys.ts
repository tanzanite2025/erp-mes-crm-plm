export const receivableQueryKeys = {
  receivableDetail: (id: string): readonly ['receivables', string] => [
    'receivables',
    id,
  ],
  receivableList: (
    sourceType: string,
    sourceRefId: string,
  ): readonly ['receivables', 'list', string, string] => [
    'receivables',
    'list',
    sourceType,
    sourceRefId,
  ],
  receivableSearch: (
    keyword: string,
    status: string,
    currency: string,
    outstandingMin: string,
    outstandingMax: string,
    sortBy: string,
    sortOrder: string
  ): readonly [
    'receivables',
    'search',
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ] => [
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
} as const
