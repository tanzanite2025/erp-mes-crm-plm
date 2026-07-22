import { apiFetch } from '@/lib/api-client'
import type {
  SaveSidebarCommandCategoryPayload,
  SaveSidebarCommandDefinitionPayload,
  SidebarCommandCategoryDto,
  SidebarCommandDefinitionDto,
} from './shared'

const SIDEBAR_COMMAND_INTENT_CREATE = 'SIDEBAR_COMMAND_CREATE'

interface SidebarCommandTransactionRequest<TPayload> {
  intent: string
  actorId?: string
  payload: TPayload
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

function executeSidebarCommandTransaction<TPayload extends object, TResult>(
  endpoint: string,
  request: SidebarCommandTransactionRequest<TPayload>
) {
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
