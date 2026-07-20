export const supplierQueryKeys = {
  all: (): readonly ['suppliers'] => ['suppliers'],
  list: (): readonly ['suppliers', 'list'] => ['suppliers', 'list'],
} as const
