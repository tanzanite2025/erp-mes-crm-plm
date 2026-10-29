import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getFormSchema } from '@/features/users/components/users-action-dialog.shared'
import { changeCurrentAuthenticatedUserPassword } from './change-current-user-password-api-service'
import { getNewUserPasswordPolicyError } from './new-user-password-policy-validation'

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('@/lib/api-client', () => ({ apiFetch }))
beforeEach(() => vi.clearAllMocks())

describe('password change API confirmation', () => {
  it('sends only the current and new password to the authenticated endpoint', async () => {
    apiFetch.mockResolvedValueOnce({ status: 'ok', requiresSignIn: true })
    await changeCurrentAuthenticatedUserPassword({
      currentPassword: 'old-password1',
      newPassword: 'new-password2',
    })
    expect(apiFetch).toHaveBeenCalledWith(
      '/auth/change-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'old-password1',
          newPassword: 'new-password2',
        }),
      })
    )
  })
  it.each([
    null,
    {},
    { status: 'ok' },
    { status: 'ok', requiresSignIn: false },
  ])('rejects an unconfirmed server result: %j', async (response) => {
    apiFetch.mockResolvedValueOnce(response)
    await expect(
      changeCurrentAuthenticatedUserPassword({
        currentPassword: 'old-password1',
        newPassword: 'new-password2',
      })
    ).rejects.toMatchObject({ kind: 'invalid_response' })
  })
})

describe('shared self-service and administration password policy', () => {
  it('matches server Unicode whitespace and reserved password formatting rules', () => {
    for (const whitespace of [
      '\u0085',
      '\uFEFF',
      '\u00A0',
      '\u2007',
      '\u202F',
      '\t',
      '\r\n',
    ]) {
      expect(getNewUserPasswordPolicyError(whitespace + 'password123')).toBe(
        'passwordWhitespace'
      )
      expect(getNewUserPasswordPolicyError('password123' + whitespace)).toBe(
        'passwordWhitespace'
      )
      expect(
        getNewUserPasswordPolicyError('pass' + whitespace + 'word123')
      ).toBeUndefined()
    }
    for (const prefix of ['$2a$', '$2b$', '$2y$']) {
      expect(getNewUserPasswordPolicyError(prefix + 'password123')).toBe(
        'passwordFormat'
      )
    }
    expect(getNewUserPasswordPolicyError('password123\uD800')).toBe(
      'passwordFormat'
    )
    expect(getNewUserPasswordPolicyError('password123😀')).toBeUndefined()
  })
  it('uses UTF-8 bytes for bcrypt limits and permits internal whitespace', () => {
    expect(
      getNewUserPasswordPolicyError('a1' + '密'.repeat(23))
    ).toBeUndefined()
    expect(getNewUserPasswordPolicyError('a1' + '密'.repeat(24))).toBe(
      'passwordByteLimit'
    )
    expect(getNewUserPasswordPolicyError('pass word123')).toBeUndefined()
    expect(getNewUserPasswordPolicyError(' password123')).toBe(
      'passwordWhitespace'
    )
  })
  it('does not silently trim passwords in the administration form', () => {
    const result = getFormSchema((key) => key).safeParse({
      firstName: 'Test',
      lastName: 'User',
      username: 'operator',
      password: ' password123 ',
      confirmPassword: ' password123 ',
      isEdit: false,
      initialPermissionPresetId: '',
      adminChallenge: '',
    })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['password'],
            message: 'users.validation.passwordWhitespace',
          }),
        ])
      )
  })
})
