import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'

export const productPhysicalSpecificationTemplateEditorDialogClasses =
  buildActionDialogShellClasses({
    content:
      'product-physical-specification-template-floating-surface flex h-[min(58rem,94dvh)] max-h-[94dvh] w-[96vw] max-w-[96vw] flex-col gap-0 rounded-[24px] sm:w-[94vw] sm:max-w-[94vw] sm:rounded-[32px] 2xl:max-w-[1600px] [&_[data-slot=button]]:rounded-full',
    header: 'gap-2 border-muted/50 px-5 py-4 pr-14 text-start sm:px-6 sm:pr-16',
    title:
      'flex min-w-0 items-center gap-3 text-base text-foreground normal-case sm:text-lg',
    description:
      'text-xs leading-relaxed font-medium tracking-normal normal-case opacity-100',
    body: 'min-h-0 flex-1 overflow-y-auto p-4 sm:p-5',
    footer:
      'shrink-0 flex-row justify-end gap-3 border-muted/50 px-5 py-3 sm:px-6',
  })

export const productPhysicalSpecificationTemplateAttributeEditorStyles = {
  section: 'min-w-0 space-y-3',
  heading: 'flex flex-wrap items-start justify-between gap-3',
  description: 'mt-1 text-xs leading-relaxed text-muted-foreground',
  grid: 'grid min-w-0 grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3',
  card: 'min-w-0 space-y-3 rounded-[20px] border border-dashed border-muted/60 bg-muted/5 p-3',
  cardToolbar: 'flex items-center justify-between gap-2',
  attributeNumber:
    'flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-[11px] font-black text-blue-600 dark:text-blue-400',
  input:
    'h-9 rounded-xl border-transparent bg-muted/40 text-xs font-semibold shadow-none focus-visible:border-blue-400 focus-visible:ring-blue-500/20 md:text-xs',
  attributeNames: 'grid min-w-0 grid-cols-2 gap-2',
  flags: 'flex flex-wrap items-center gap-2',
  flagLabel:
    'flex min-h-7 items-center gap-1.5 rounded-full border border-dashed border-muted/60 px-2.5 text-[11px] font-semibold text-muted-foreground',
  checkbox:
    'size-3.5 shadow-none focus-visible:ring-blue-500/25 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:bg-blue-600',
  iconButton:
    'size-7 rounded-full text-muted-foreground hover:bg-blue-600/10 hover:text-blue-600 dark:hover:text-blue-400',
  deleteButton:
    'size-7 rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400',
  optionRow:
    'grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_1.75rem_1.75rem] items-center gap-2',
  addOptionButton:
    'h-8 w-full rounded-full border-dashed bg-transparent text-[11px] font-bold text-blue-600 shadow-none hover:bg-blue-600/10 dark:text-blue-400',
  addAttributeButton:
    'h-8 shrink-0 rounded-full border-dashed bg-transparent px-4 text-[11px] font-bold text-blue-600 shadow-none hover:bg-blue-600/10 dark:text-blue-400',
} as const
