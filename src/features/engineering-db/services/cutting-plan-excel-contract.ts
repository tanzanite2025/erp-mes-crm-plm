export const CUTTING_PLAN_EXCEL_SHEETS = {
  import: 'CUTTING_PLAN_IMPORT',
  print: 'CUTTING_PLAN_PRINT',
} as const

export const CUTTING_PLAN_EXCEL_LIMITS = {
  maxFileSize: 10 * 1024 * 1024,
  maxRows: 2000,
  maxSheets: 5,
  templateRows: 300,
} as const

export const CUTTING_PLAN_EXCEL_LOCK_PASSWORDS = {
  importSheet: 'xdfc_cutting_import_2026',
} as const
