import { type User } from './data/schema'

export function createTestUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u-test',
    employeeId: undefined,
    firstName: 'Test',
    lastName: 'User',
    username: 'test-user',
    phoneNumber: '0000000000',
    status: 'active',
    role: 'ops_manager',
    version: 1,
    password: undefined,
    resolvedRole: undefined,
    roleInfo: undefined,
    createdAt: new Date('2026-04-06T00:00:00.000Z'),
    updatedAt: new Date('2026-04-06T00:00:00.000Z'),
    ...overrides,
  }
}
