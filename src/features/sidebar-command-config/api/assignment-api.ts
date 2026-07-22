import { apiFetch } from '@/lib/api-client'
import type { UserOption } from '@/features/users/data/schema'
import type {
  BatchSidebarCommandMode,
  SidebarCommandAssignmentDto,
  SidebarCommandMutationResultDto,
} from './shared'

export function fetchSidebarCommandUsers() {
  return apiFetch<UserOption[]>('/quick-actions/sidebar/users')
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
