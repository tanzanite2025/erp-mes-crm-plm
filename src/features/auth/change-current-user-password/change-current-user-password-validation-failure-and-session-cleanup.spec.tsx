// @vitest-environment jsdom
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChangeCurrentUserPasswordDialog } from './change-current-user-password-dialog'

const { changePassword, resetAuth, navigate, successToast, authSession } =
  vi.hoisted(() => ({
    changePassword: vi.fn(),
    resetAuth: vi.fn(),
    navigate: vi.fn(),
    successToast: vi.fn(),
    authSession: { accessToken: 'original-session-token' },
  }))

vi.mock('./change-current-user-password-api-service', () => ({
  changeCurrentAuthenticatedUserPassword: changePassword,
}))
vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: { getState: () => ({ ...authSession, reset: resetAuth }) },
}))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('sonner', () => ({ toast: { success: successToast } }))

function renderCurrentUserPasswordChangeDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(['private-business-data'], {
    account: 'current-user',
  })
  function PasswordChangeDialogWithOpenControl() {
    const [open, setOpen] = useState(true)
    return (
      <>
        <button onClick={() => setOpen(true)}>reopen-password-dialog</button>
        <ChangeCurrentUserPasswordDialog open={open} onOpenChange={setOpen} />
      </>
    )
  }
  render(
    <QueryClientProvider client={queryClient}>
      <PasswordChangeDialogWithOpenControl />
    </QueryClientProvider>
  )
  return queryClient
}

function fillCurrentUserPasswordChangeInputs(
  newPassword = 'replacement-password2',
  confirmation = newPassword
) {
  fireEvent.change(
    screen.getByLabelText('common.auth.changePassword.currentPassword'),
    { target: { value: 'original-password1' } }
  )
  fireEvent.change(
    screen.getByLabelText('common.auth.changePassword.newPassword'),
    { target: { value: newPassword } }
  )
  fireEvent.change(
    screen.getByLabelText('common.auth.changePassword.confirmPassword'),
    { target: { value: confirmation } }
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  changePassword.mockResolvedValue(undefined)
  navigate.mockResolvedValue(undefined)
  authSession.accessToken = 'original-session-token'
  resetAuth.mockImplementation(() => {
    authSession.accessToken = ''
  })
})
afterEach(cleanup)

describe('current user password change dialog', () => {
  it('keeps the authenticated session and cached data when the current password is incorrect', async () => {
    changePassword.mockRejectedValueOnce({
      code: 'auth_current_password_incorrect',
    })
    const queryClient = renderCurrentUserPasswordChangeDialog()
    fillCurrentUserPasswordChangeInputs()
    fireEvent.click(
      screen.getByRole('button', { name: 'common.auth.changePassword.submit' })
    )
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'common.auth.changePassword.currentPasswordIncorrect'
      )
    )
    expect(resetAuth).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(['private-business-data'])).toBeDefined()
    expect(
      screen.getByRole('button', { name: 'common.auth.changePassword.submit' })
    ).toBeEnabled()
  })

  it('clears identity and query cache and returns to sign in only after confirmed success', async () => {
    const queryClient = renderCurrentUserPasswordChangeDialog()
    fillCurrentUserPasswordChangeInputs()
    fireEvent.click(
      screen.getByRole('button', { name: 'common.auth.changePassword.submit' })
    )
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/sign-in',
        replace: true,
        search: { redirect: undefined },
      })
    )
    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'original-password1',
      newPassword: 'replacement-password2',
    })
    expect(resetAuth).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(['private-business-data'])).toBeUndefined()
    expect(successToast).toHaveBeenCalledWith(
      'common.auth.changePassword.success'
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('preserves a newer sign-in session when an old password-change success arrives late', async () => {
    let resolvePasswordChange!: () => void
    changePassword.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolvePasswordChange = resolve
      })
    )
    const queryClient = renderCurrentUserPasswordChangeDialog()
    fillCurrentUserPasswordChangeInputs()
    fireEvent.click(
      screen.getByRole('button', { name: 'common.auth.changePassword.submit' })
    )
    authSession.accessToken = 'new-sign-in-token'
    resolvePasswordChange()
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(resetAuth).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(successToast).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(['private-business-data'])).toBeDefined()
  })

  it('still clears the revoked session and navigates when query cancellation rejects', async () => {
    const queryClient = renderCurrentUserPasswordChangeDialog()
    vi.spyOn(queryClient, 'cancelQueries').mockRejectedValueOnce(
      new Error('query cancellation failed')
    )
    fillCurrentUserPasswordChangeInputs()
    fireEvent.click(
      screen.getByRole('button', { name: 'common.auth.changePassword.submit' })
    )
    await waitFor(() => expect(navigate).toHaveBeenCalled())
    expect(resetAuth).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(['private-business-data'])).toBeUndefined()
  })

  it.each([
    ['short1', 'short1', 'users.validation.passwordMin'],
    [
      ' replacement-password2',
      ' replacement-password2',
      'users.validation.passwordWhitespace',
    ],
    [
      'a1' + '密'.repeat(24),
      'a1' + '密'.repeat(24),
      'users.validation.passwordByteLimit',
    ],
    [
      'original-password1',
      'original-password1',
      'common.auth.changePassword.unchanged',
    ],
    [
      'replacement-password2',
      'different-password3',
      'users.validation.passwordMismatch',
    ],
  ])(
    'rejects invalid passwords without sending a request: %s',
    async (password, confirmation, error) => {
      renderCurrentUserPasswordChangeDialog()
      fillCurrentUserPasswordChangeInputs(password, confirmation)
      fireEvent.click(
        screen.getByRole('button', {
          name: 'common.auth.changePassword.submit',
        })
      )
      expect(screen.getByRole('alert')).toHaveTextContent(error)
      expect(changePassword).not.toHaveBeenCalled()
      expect(resetAuth).not.toHaveBeenCalled()
    }
  )

  it('destroys all password fields when cancelled and reopened', () => {
    renderCurrentUserPasswordChangeDialog()
    fillCurrentUserPasswordChangeInputs()
    fireEvent.click(
      screen.getByRole('button', { name: 'common.actions.cancel' })
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'reopen-password-dialog' })
    )
    for (const field of ['currentPassword', 'newPassword', 'confirmPassword']) {
      expect(
        screen.getByLabelText(`common.auth.changePassword.${field}`)
      ).toHaveValue('')
    }
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('prevents duplicate submission and closing while the request is pending', async () => {
    let resolveChange: (() => void) | undefined
    changePassword.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveChange = resolve
        })
    )
    renderCurrentUserPasswordChangeDialog()
    fillCurrentUserPasswordChangeInputs()
    const submit = screen.getByRole('button', {
      name: 'common.auth.changePassword.submit',
    })
    fireEvent.click(submit)
    expect(submit).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'common.actions.cancel' })
    ).toBeDisabled()
    fireEvent.click(submit)
    expect(changePassword).toHaveBeenCalledOnce()
    resolveChange?.()
    await waitFor(() => expect(navigate).toHaveBeenCalled())
  })
})
