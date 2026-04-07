import { type Role } from './data/role-schema'

export function createTestRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'role-test',
    label: '测试角色',
    color: 'bg-blue-500/10 text-blue-600 border-blue-200',
    permissions: [],
    version: 1,
    ...overrides,
  }
}
