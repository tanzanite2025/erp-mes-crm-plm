export const BOM_EXCEL_SHEETS = {
  archive: '系统档案',
  legacyArchive: '物料档案',
  main: 'BOM配方填写',
} as const

export const BOM_EXCEL_LIMITS = {
  maxFileSize: 10 * 1024 * 1024,
  maxRows: 5000,
  maxSheets: 5,
  templateRows: 500,
} as const

export const BOM_EXCEL_LOCK_PASSWORDS = {
  mainSheet: 'xdfc_safe_lock_2026',
  archiveSheet: 'xdfc_safe_lock_2026_core',
} as const
