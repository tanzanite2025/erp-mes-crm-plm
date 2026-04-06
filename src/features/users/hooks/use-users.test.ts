import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useQueryMock, useMutationMock, useQueryClientMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  useQueryClientMock: vi.fn(),
}))

const { fetchUsersMock, fetchUserOptionsMock } = vi.hoisted(() => ({
  fetchUsersMock: vi.fn(),
  fetchUserOptionsMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}))

vi.mock('../services/user-api', () => ({
  fetchUsers: fetchUsersMock,
  fetchUserOptions: fetchUserOptionsMock,
  createUser: vi.fn(),
  patchUser: vi.fn(),
  replaceUser: vi.fn(),
  deleteUser: vi.fn(),
}))

vi.mock('@/lib/handle-server-error', () => ({
  handleServerError: vi.fn(),
}))

vi.mock('@/lib/react-query-mutation', () => ({
  buildMutationOptions: vi.fn(() => ({})),
}))

import { useUserOptionsQuery, useUsersQuery } from './use-users'

describe('use-users hooks regression', () => {
  beforeEach(() => {
    useQueryMock.mockReset()
    useMutationMock.mockReset()
    useQueryClientMock.mockReset()
    fetchUsersMock.mockReset()
    fetchUserOptionsMock.mockReset()
    useQueryMock.mockImplementation((options: unknown) => options)
  })

  it('useUsersQuery wires paginated query key and fetchUsers queryFn', async () => {
    const params = { page: 2, pageSize: 20, username: 'alice', status: ['active'] }

    useUsersQuery(params)

    expect(useQueryMock).toHaveBeenCalledTimes(1)
    const queryOptions = useQueryMock.mock.calls[0]?.[0]
    expect(queryOptions?.queryKey).toEqual(['users', params])

    fetchUsersMock.mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 20 })
    const result = await queryOptions?.queryFn()

    expect(fetchUsersMock).toHaveBeenCalledWith(params)
    expect(result).toEqual({ items: [], total: 0, page: 2, pageSize: 20 })
  })

  it('useUserOptionsQuery wires isolated query key and fetchUserOptions queryFn', async () => {
    const params = { role: ['ops_manager'], status: ['active'] }

    useUserOptionsQuery(params)

    expect(useQueryMock).toHaveBeenCalledTimes(1)
    const queryOptions = useQueryMock.mock.calls[0]?.[0]
    expect(queryOptions?.queryKey).toEqual(['users', 'options', params])

    fetchUserOptionsMock.mockResolvedValue([{ id: 'u-1', username: 'ops-user' }])
    const result = await queryOptions?.queryFn()

    expect(fetchUserOptionsMock).toHaveBeenCalledWith(params)
    expect(result).toEqual([{ id: 'u-1', username: 'ops-user' }])
  })
})
