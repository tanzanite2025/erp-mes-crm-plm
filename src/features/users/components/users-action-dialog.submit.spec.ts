import { describe, expect, it } from 'vitest'
import { createTestUser } from '../test-factories'
import { getFormSchema, type UserForm } from './users-action-dialog.shared'
import {
  buildUserCreatePayload,
  buildUserReplacePayload,
} from './users-action-dialog.submit'

const translate = (key: string) => key

function createFormValues(overrides: Partial<UserForm> = {}): UserForm {
  return {
    firstName: 'Test',
    lastName: 'User',
    username: 'test-user',
    phoneNumber: '10086',
    password: '',
    confirmPassword: '',
    isEdit: true,
    employeeId: 'employee-1',
    role: 'buyer',
    initialRole: 'buyer',
    adminChallenge: '',
    ...overrides,
  }
}

describe('user action dialog submission', () => {
  it('requires the current operator password for an admin promotion', () => {
    const result = getFormSchema(translate).safeParse(
      createFormValues({ role: 'admin', adminChallenge: '' })
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ['adminChallenge'] }),
        ])
      )
    }
  })

  it('includes the challenge only when promoting an existing account', () => {
    const currentRow = createTestUser({ role: 'buyer' })
    const promoted = buildUserReplacePayload({
      currentRow,
      values: createFormValues({
        role: 'admin',
        adminChallenge: 'operator-password',
      }),
    })
    const unchanged = buildUserReplacePayload({
      currentRow,
      values: createFormValues({ adminChallenge: 'must-not-leak' }),
    })

    expect(promoted.adminChallenge).toBe('operator-password')
    expect(unchanged.adminChallenge).toBeUndefined()
  })

  it('includes the challenge when the generic create form assigns admin', () => {
    const payload = buildUserCreatePayload({
      values: createFormValues({
        isEdit: false,
        role: 'admin',
        initialRole: '',
        password: 'new-password1',
        confirmPassword: 'new-password1',
        adminChallenge: 'operator-password',
      }),
    })

    expect(payload.adminChallenge).toBe('operator-password')
  })
})
