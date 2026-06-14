import { apiFetch } from '@/lib/api-client'
import type { UserOption } from '@/features/users/data/schema'

export const SIDEBAR_COMMAND_INTENT_CREATE = 'SIDEBAR_COMMAND_CREATE'

export interface SidebarCommandTransactionRequest<TPayload> {
  intent: string
  actorId?: string
  payload: TPayload
}

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

// /quick-actions/sidebar/me contract:
// business shortcuts are full command definitions only. Do not reintroduce
// businessCommandIds or string-ID fallback logic; this system has no legacy
// sidebar contract to support before launch.
export type MySidebarCommandsDto = {
  businessCommands: SidebarCommandDefinitionDto[]
  privateCommandIds: string[]
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

function buildSidebarCommandTransactionBody<TPayload extends object>(
  request: SidebarCommandTransactionRequest<TPayload>
) {
  return {
    ...request.payload,
    metadata: {
      intent: request.intent,
      actorId: request.actorId,
    },
  }
}

export function executeSidebarCommandTransaction<
  TPayload extends object,
  TResult,
>(endpoint: string, request: SidebarCommandTransactionRequest<TPayload>) {
  return apiFetch<TResult>(endpoint, {
    method: 'POST',
    body: JSON.stringify(buildSidebarCommandTransactionBody(request)),
  })
}

export function fetchAssignableSidebarCommands() {
  return apiFetch<SidebarCommandDefinitionDto[]>(
    '/quick-actions/sidebar/commands'
  )
}

export function fetchSidebarCommandLibrary() {
  return apiFetch<SidebarCommandDefinitionDto[]>(
    '/quick-actions/sidebar/library'
  )
}

export function fetchSidebarCommandCategories() {
  return apiFetch<SidebarCommandCategoryDto[]>(
    '/quick-actions/sidebar/categories'
  )
}

export function createSidebarCommandCategory(
  payload: SaveSidebarCommandCategoryPayload
) {
  return apiFetch<SidebarCommandCategoryDto>(
    '/quick-actions/sidebar/categories',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
}

export function updateSidebarCommandCategory(
  categoryId: string,
  payload: SaveSidebarCommandCategoryPayload
) {
  return apiFetch<SidebarCommandCategoryDto>(
    `/quick-actions/sidebar/categories/${encodeURIComponent(categoryId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  )
}

export function setSidebarCommandCategoryEnabled(
  categoryId: string,
  enabled: boolean
) {
  return apiFetch<SidebarCommandCategoryDto>(
    `/quick-actions/sidebar/categories/${encodeURIComponent(categoryId)}/enabled`,
    {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }
  )
}

export function createSidebarCommandDefinition(
  payload: SaveSidebarCommandDefinitionPayload
) {
  return executeSidebarCommandTransaction<
    SaveSidebarCommandDefinitionPayload,
    SidebarCommandDefinitionDto
  >('/quick-actions/sidebar/library', {
    intent: SIDEBAR_COMMAND_INTENT_CREATE,
    payload,
  })
}

export function updateSidebarCommandDefinition(
  commandId: string,
  payload: SaveSidebarCommandDefinitionPayload
) {
  return apiFetch<SidebarCommandDefinitionDto>(
    `/quick-actions/sidebar/library/${encodeURIComponent(commandId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  )
}

export function setSidebarCommandDefinitionEnabled(
  commandId: string,
  enabled: boolean
) {
  return apiFetch<SidebarCommandDefinitionDto>(
    `/quick-actions/sidebar/library/${encodeURIComponent(commandId)}/enabled`,
    {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }
  )
}

export function reorderSidebarCommandDefinitions(commandIds: string[]) {
  return apiFetch<SidebarCommandDefinitionDto[]>(
    '/quick-actions/sidebar/library/sort',
    {
      method: 'PUT',
      body: JSON.stringify({ commandIds }),
    }
  )
}

export function fetchSidebarCommandUsers() {
  return apiFetch<UserOption[]>('/quick-actions/sidebar/users')
}

export function fetchMySidebarCommands() {
  return apiFetch<MySidebarCommandsDto>('/quick-actions/sidebar/me')
}

export function fetchUserSidebarCommandAssignment(userId: string) {
  return apiFetch<SidebarCommandAssignmentDto>(
    `/quick-actions/sidebar/users/${userId}`
  )
}

export function replaceUserSidebarCommandAssignment(
  userId: string,
  commandIds: string[],
  categoryIds: string[] = []
) {
  return apiFetch<SidebarCommandAssignmentDto>(
    `/quick-actions/sidebar/users/${userId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ categoryIds, commandIds }),
    }
  )
}

export function batchAssignSidebarCommands(
  userIds: string[],
  commandIds: string[],
  mode: BatchSidebarCommandMode,
  categoryIds: string[] = []
) {
  return apiFetch<SidebarCommandMutationResultDto>(
    '/quick-actions/sidebar/batch',
    {
      method: 'POST',
      body: JSON.stringify({ userIds, categoryIds, commandIds, mode }),
    }
  )
}

export function copySidebarCommandAssignment(
  sourceUserId: string,
  targetUserIds: string[]
) {
  return apiFetch<SidebarCommandMutationResultDto>(
    '/quick-actions/sidebar/copy',
    {
      method: 'POST',
      body: JSON.stringify({ sourceUserId, targetUserIds }),
    }
  )
}
