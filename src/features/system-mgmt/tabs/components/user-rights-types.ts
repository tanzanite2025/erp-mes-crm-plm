import type { OrgNode } from '@/features/org-personnel/data/org-schema'
import type { Permission, Role } from '@/features/system-mgmt/data/role-schema'

export type OrgRoleOption = {
  label: string
  value: string
  disabled?: boolean
}

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

export type UserRightsRole = Role
export type UserRightsPermission = Permission
export type UserRightsOrgNode = OrgNode
