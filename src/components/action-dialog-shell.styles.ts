import { cn } from '@/lib/utils'

export const actionDialogShellStyles = {
  content:
    'rounded-[32px] border-none p-0 overflow-hidden shadow-2xl bg-background',
  header: 'shrink-0 border-b border-dashed bg-muted/10 p-8',
  body: 'p-8',
  title: 'font-black uppercase tracking-tight italic',
  description: 'font-black uppercase tracking-widest opacity-60',
  footer: 'border-t border-dashed bg-muted/5 p-6',
} as const

export function buildActionDialogShellClasses(overrides?: {
  content?: string
  header?: string
  body?: string
  footer?: string
  title?: string
  description?: string
}) {
  return {
    content: cn(actionDialogShellStyles.content, overrides?.content),
    header: cn(actionDialogShellStyles.header, overrides?.header),
    body: cn(actionDialogShellStyles.body, overrides?.body),
    footer: cn(actionDialogShellStyles.footer, overrides?.footer),
    title: cn(actionDialogShellStyles.title, overrides?.title),
    description: cn(
      actionDialogShellStyles.description,
      overrides?.description
    ),
  }
}
