import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'

export const bomPerformanceVersionOptionManagementDialogClasses =
  buildActionDialogShellClasses({
    content:
      'flex h-[min(880px,calc(100dvh-2rem))] flex-col gap-0 rounded-[24px] sm:rounded-[32px] [&_[data-slot=button]]:rounded-full',
    header:
      'gap-1.5 border-muted/50 px-5 py-3 pr-14 text-start sm:px-6 sm:pr-16',
    title:
      'flex min-w-0 items-center gap-3 text-base text-foreground normal-case sm:text-lg',
    description:
      'text-xs leading-relaxed font-medium tracking-normal normal-case opacity-100',
    body: 'flex min-h-0 flex-1 flex-col p-0 sm:flex-row',
    footer:
      'flex shrink-0 flex-wrap items-center justify-between gap-2 border-muted/50 px-5 py-3 sm:px-6',
  })

export const bomPerformanceVersionOptionInlineEditorStyles = {
  sidebar:
    'flex h-48 shrink-0 flex-col border-b border-dashed border-muted/50 bg-muted/10 sm:h-auto sm:w-64 sm:border-r sm:border-b-0',
  sidebarHeading:
    'flex shrink-0 items-center justify-between px-5 py-4 text-xs font-black',
  optionCount:
    'flex size-6 items-center justify-center rounded-full bg-blue-600/10 text-[11px] font-black text-blue-600 dark:text-blue-400',
  optionList: 'min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3',
  optionButton:
    'flex w-full items-center justify-between gap-2 rounded-[20px] border border-dashed border-muted/60 bg-background/70 px-3 py-3 text-start text-xs font-semibold transition-colors hover:border-blue-600/25 hover:bg-blue-600/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25 disabled:pointer-events-none disabled:opacity-50',
  selectedOptionButton:
    'border-blue-600/25 bg-blue-600/10 text-blue-600 dark:text-blue-400',
  addOptionButton:
    'h-11 w-full rounded-full border-dashed bg-transparent text-[11px] font-black text-blue-600 shadow-none hover:bg-blue-600/10 dark:text-blue-400',
  editorHeading: 'shrink-0 px-5 pt-4 pb-3 sm:px-6',
  editorTitle: 'text-sm font-black text-foreground',
  editorDescription: 'mt-1 text-xs leading-relaxed text-muted-foreground',
  form: 'min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6',
  fieldset:
    'min-w-0 space-y-3 rounded-[20px] border border-dashed border-muted/60 bg-muted/5 p-4',
  fieldLabel: 'text-xs font-semibold',
  input:
    'h-10 rounded-xl border-transparent bg-muted/40 text-sm font-semibold shadow-none focus-visible:border-blue-400 focus-visible:ring-blue-500/20',
  textarea:
    'min-h-16 resize-y rounded-xl border-transparent bg-muted/40 text-sm font-medium shadow-none focus-visible:border-blue-400 focus-visible:ring-blue-500/20',
  activeStatusRow:
    'flex items-center justify-between gap-4 border-t border-dashed border-muted/60 pt-3',
  activeStatusSwitch:
    'focus-visible:ring-blue-500/25 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-600 [&_[data-slot=switch-thumb][data-state=checked]]:bg-white dark:[&_[data-slot=switch-thumb][data-state=checked]]:bg-white',
  deleteButton:
    'h-11 rounded-full px-3 text-[11px] font-black text-destructive hover:bg-destructive/10 hover:text-destructive',
  resetButton:
    'h-11 rounded-full border-dashed bg-transparent px-5 text-[11px] font-black shadow-none',
  saveButton:
    'h-11 rounded-full bg-blue-600 px-6 text-[11px] font-black text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700',
} as const
