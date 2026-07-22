export type SidebarCommandDefinitionDto = {
  commandId: string
  title: string
  description: string
  route: string
  searchParams: Record<string, unknown>
  icon: string
  category: string
  assignable: boolean
  enabled: boolean
  status: string
  sortOrder: number
}

export type SidebarCommandCategoryDto = {
  categoryId: string
  name: string
  description: string
  enabled: boolean
  status: string
  sortOrder: number
  commandCount: number
}

export type SidebarCommandAssignmentDto = {
  userId: string
  categoryIds: string[]
  commandIds: string[]
  effectiveCommandIds: string[]
  effectiveCommands?: SidebarCommandDefinitionDto[]
}

export type SidebarCommandMutationResultDto = {
  userIds: string[]
  categoryIds: string[]
  commandIds: string[]
  updated: number
}

export type BatchSidebarCommandMode = 'replace' | 'append'

export type SaveSidebarCommandDefinitionPayload = {
  commandId: string
  title: string
  description: string
  route: string
  searchParams: Record<string, unknown>
  icon: string
  category: string
  assignable: boolean
  enabled: boolean
  status: string
  sortOrder: number
}

export type SaveSidebarCommandCategoryPayload = {
  categoryId: string
  name: string
  description: string
  enabled: boolean
  status: string
  sortOrder: number
}
