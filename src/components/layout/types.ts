import { type LinkProps } from '@tanstack/react-router'

type User = {
  name: string
  email: string
  avatar: string
}

type Team = {
  name: string
  logo: React.ElementType
  plan: string
}

type BaseNavItem = {
  id: string
  title: string
  badge?: string
  icon?: React.ElementType
  permissionId?: string | string[]
}

type NavNode = BaseNavItem & {
  url?: LinkProps['to'] | (string & {})
  activeMatch?: LinkProps['to'] | (string & {})
  badgeKey?: string
  children?: NavNode[]
}

type NavLink = NavNode & {
  url: LinkProps['to'] | (string & {})
}

type NavBranch = NavNode & {
  children: NavNode[]
}

type NavItem = NavNode

type NavGroup = {
  id: string
  title: string
  children: NavNode[]
}

type SidebarData = {
  user: User
  teams: Team[]
  navGroups: NavGroup[]
}

export type { SidebarData, NavGroup, NavNode, NavItem, NavBranch, NavLink }
