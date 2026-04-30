import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createSidebarCommandDefinition,
  executeSidebarCommandTransaction,
  SIDEBAR_COMMAND_INTENT_CREATE,
  type SaveSidebarCommandDefinitionPayload,
  type SidebarCommandDefinitionDto,
} from './services'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

function createCommandPayload(overrides: Partial<SaveSidebarCommandDefinitionPayload> = {}): SaveSidebarCommandDefinitionPayload {
  return {
    commandId: 'cmd-a',
    title: 'Command A',
    description: 'Open command A',
    route: '/a',
    searchParams: {},
    icon: 'bolt',
    category: 'default',
    assignable: true,
    enabled: true,
    status: 'active',
    sortOrder: 1,
    ...overrides,
  }
}

describe('sidebar command transaction contracts', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  it('createSidebarCommandDefinition sends create intent metadata', async () => {
    const payload = createCommandPayload()

    await createSidebarCommandDefinition(payload)

    expect(apiFetchMock).toHaveBeenCalledWith('/quick-actions/sidebar/library', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        metadata: {
          intent: SIDEBAR_COMMAND_INTENT_CREATE,
        },
      }),
    })
  })

  it('executeSidebarCommandTransaction keeps actor metadata available', async () => {
    const payload = createCommandPayload({ commandId: 'cmd-b' })

    await executeSidebarCommandTransaction<
      SaveSidebarCommandDefinitionPayload,
      SidebarCommandDefinitionDto
    >('/quick-actions/sidebar/library', {
      intent: SIDEBAR_COMMAND_INTENT_CREATE,
      actorId: 'operator-1',
      payload,
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/quick-actions/sidebar/library', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        metadata: {
          intent: SIDEBAR_COMMAND_INTENT_CREATE,
          actorId: 'operator-1',
        },
      }),
    })
  })
})
