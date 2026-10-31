export interface ClaimButtonViewModel {
  className: string
}

export function useSalesOrderClaimButtonViewModel(
  isClaimAction: boolean
): ClaimButtonViewModel {
  return {
    className: `min-h-9 rounded-lg border-primary/30 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5 ${
      isClaimAction ? 'bg-primary/10 ring-2 ring-primary/30 ring-inset' : ''
    }`,
  }
}
