import { type Employee } from './data/schema'

export function createTestEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-test',
    staffId: 'STAFF-001',
    name: '测试员工',
    phone: '13800000000',
    gender: undefined,
    birthday: undefined,
    idCard: undefined,
    emergencyPhone: undefined,
    address: undefined,
    bankCard: undefined,
    bankName: undefined,
    education: undefined,
    age: undefined,
    status: 'active',
    joinedDate: undefined,
    deptId: 'dept-test',
    lineId: 'line-test',
    processId: 'process-test',
    deptName: undefined,
    lineName: undefined,
    processName: undefined,
    version: 1,
    ...overrides,
  }
}
