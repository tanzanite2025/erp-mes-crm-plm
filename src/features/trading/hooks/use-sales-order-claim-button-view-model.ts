export interface ClaimButtonViewModel {
  className: string
}

export function useSalesOrderClaimButtonViewModel(
  isClaimAction: boolean
): ClaimButtonViewModel {
  return {
    className: `h-6 rounded-lg border-primary/30 px-2 text-[9px] font-black text-primary transition-all hover:bg-primary/5 ${
      isClaimAction
        ? 'animate-pulse bg-primary/10 shadow-lg ring-2 ring-primary ring-offset-1'
        : ''
    }`,
  }
}
