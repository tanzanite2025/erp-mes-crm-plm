import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'

export const pieceworkFinancePageMainClassName =
  'px-3 [scrollbar-gutter:auto] sm:px-4 sm:[scrollbar-gutter:stable_both-edges]'

export const pieceworkFinancePageHeaderClassName = 'p-3 sm:p-4 md:p-5'

export const pieceworkFinanceDialogContentClassName =
  'max-w-[calc(100%-1rem)] sm:max-w-[520px]'

export const pieceworkFinanceConfirmationBodyClassName = 'p-4 sm:p-6 md:p-8'

export const pieceworkFinancePrimaryActionClassName =
  'h-11 rounded-full px-5 text-xs font-black shadow-lg shadow-primary/20 transition-all active:scale-95'

export const pieceworkFinanceSecondaryActionClassName =
  'h-11 rounded-full border-dashed px-5 text-xs font-bold shadow-none transition-all hover:bg-primary/5 hover:text-primary active:scale-95'

export const pieceworkFinanceIconActionClassName =
  'size-8 rounded-full text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95'

export const pieceworkFinanceDialogActionClassName =
  'h-11 rounded-full px-6 text-sm font-semibold sm:px-8'

export const pieceworkFinanceFieldControlClassName =
  'h-11 w-full min-w-0 rounded-xl border border-transparent bg-muted/45 px-4 text-sm font-semibold shadow-inner transition-all focus-visible:border-primary/20 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/15'

export const pieceworkFinanceFieldLabelClassName =
  'text-xs font-semibold text-muted-foreground'

export const pieceworkFinanceViewTabsListClassName =
  'h-10 max-w-full rounded-2xl bg-muted/40 p-1'

export const pieceworkFinanceViewTabsTriggerClassName =
  'rounded-full px-4 text-xs font-black'

export function buildPieceworkFinanceActionDialogShellClasses() {
  return buildActionDialogShellClasses({
    content: `grid-rows-[auto_minmax(0,1fr)_auto] ${pieceworkFinanceDialogContentClassName}`,
    header: 'p-4 text-left sm:p-8',
    body: 'min-h-0 overflow-y-auto p-4 sm:p-8',
    title: 'flex items-center gap-3 pr-6 text-lg tracking-normal sm:text-xl',
    description: 'text-xs tracking-normal',
    footer: 'p-4 sm:p-6',
  })
}
