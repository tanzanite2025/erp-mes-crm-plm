import type { ScanPermissionContract } from './types'

export interface ScanPermissionSnapshot {
  pages: string[]
  actions: string[]
}

export function canOpenScanEntry(
  permissions: ScanPermissionSnapshot,
  contract: ScanPermissionContract
) {
  const hasPage = permissions.pages.includes(contract.page)
  if (!hasPage) return false

  if (!contract.action) return true
  return permissions.actions.includes(contract.action)
}
