import type { Permission } from '@/features/authz/data/permission-schema'

export type PermissionPageNode = {
  page: Permission
  tabs: Permission[]
}

export type PermissionTreeNode = {
  module: Permission
  pages: PermissionPageNode[]
  directTabs: Permission[]
  directActions: Permission[]
  childNodeCount: number
}

export type PermissionLabelFormatter = (label: string) => string
