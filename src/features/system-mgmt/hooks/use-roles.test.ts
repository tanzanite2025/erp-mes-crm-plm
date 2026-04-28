import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useQueryMock, useMutationMock, useQueryClientMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  useQueryClientMock: vi.fn(),
}))

const { buildMutationOptionsMock } = vi.hoisted(() => ({
  buildMutationOptionsMock: vi.fn(() => ({})),
}))

const { fetchRolesMock, upsertRoleMock, deleteRoleMock } = vi.hoisted(() => ({
  fetchRolesMock: vi.fn(),
  upsertRoleMock: vi.fn(),
  deleteRoleMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}))

vi.mock('@/lib/handle-server-error', () => ({
  handleServerError: vi.fn(),
}))

vi.mock('@/lib/react-query-mutation', () => ({
  buildMutationOptions: buildMutationOptionsMock,
}))

vi.mock('../services/role-service', () => ({
  fetchRoles: fetchRolesMock,
  upsertRole: upsertRoleMock,
  deleteRole: deleteRoleMock,
}))

import { ROLES_QUERY_KEY, useRoleMutations, useRolesQuery } from './use-roles'

describe('use-roles hooks regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useQueryMock.mockReset()
    useMutationMock.mockReset()
    useQueryClientMock.mockReset()
    buildMutationOptionsMock.mockClear()
    fetchRolesMock.mockReset()
    upsertRoleMock.mockReset()
    deleteRoleMock.mockReset()
    useQueryMock.mockImplementation((options: unknown) => options)
    useMutationMock.mockImplementation((options: unknown) => options)
    useQueryClientMock.mockReturnValue({ invalidateQueries: vi.fn() })
  })

  it('useRolesQuery wires role query key and fetchRoles queryFn', async () => {
    useRolesQuery()

    expect(useQueryMock).toHaveBeenCalledTimes(1)
    const queryOptions = useQueryMock.mock.calls[0]?.[0]
    expect(queryOptions?.queryKey).toEqual(ROLES_QUERY_KEY)

    fetchRolesMock.mockResolvedValue([{ id: 'finance-manager', label: '财务经理', permissions: [] }])
    const result = await queryOptions?.queryFn()

    expect(fetchRolesMock).toHaveBeenCalledWith()
    expect(result).toEqual([{ id: 'finance-manager', label: '财务经理', permissions: [] }])
  })

  it('useRoleMutations wires upsert and delete mutations with expected invalidation keys', () => {
    useRoleMutations()

    expect(useMutationMock).toHaveBeenCalledTimes(2)
    const upsertMutationOptions = useMutationMock.mock.calls[0]?.[0]
    expect(upsertMutationOptions?.mutationFn).toBe(upsertRoleMock)

    const deleteMutationOptions = useMutationMock.mock.calls[1]?.[0]
    expect(typeof deleteMutationOptions?.mutationFn).toBe('function')

    expect(buildMutationOptionsMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      invalidateQueryKeys: [ROLES_QUERY_KEY],
    }))
    expect(buildMutationOptionsMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      invalidateQueryKeys: [ROLES_QUERY_KEY, ['users']],
    }))
  })

  it('deleteRole mutation delegates role id to service layer', async () => {
    useRoleMutations()

    const deleteMutationOptions = useMutationMock.mock.calls[1]?.[0]
    deleteRoleMock.mockResolvedValue({ message: 'role deleted' })

    await deleteMutationOptions?.mutationFn('finance-manager')

    expect(deleteRoleMock).toHaveBeenCalledWith('finance-manager')
  })
})
