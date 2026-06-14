export const personalWorkbenchColumns = [
  { key: 'INBOX', label: '收件箱' },
  { key: 'ORGANIZING', label: '待整理' },
  { key: 'PARKED', label: '挂起' },
  { key: 'ARCHIVED', label: '归档' },
] as const

export type PersonalWorkbenchColumnKey =
  (typeof personalWorkbenchColumns)[number]['key']
