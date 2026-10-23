// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  requestApplicationConfirmation,
  requestApplicationTextInput,
  resolveApplicationDialogRequest,
  showApplicationAlert,
  useApplicationDialogRequestQueue,
} from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { LanguageProvider } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { ApplicationConfirmPromptAndAlertDialogHost } from './application-confirm-prompt-and-alert-dialog-host'

vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({ allowsAction: () => true }),
}))

afterEach(() => {
  cleanup()
  for (const request of useApplicationDialogRequestQueue.getState().requests) {
    resolveApplicationDialogRequest(request.id, null)
  }
})

function ProtectedActionWithApplicationConfirmation({
  onAction,
}: {
  onAction: () => void
}) {
  const { runConfirmedAction } = useConfirmedActionFlow()
  return (
    <button
      onClick={() => {
        void runConfirmedAction({
          confirmKey: 'common.actions.delete',
          onAction,
        })
      }}
    >
      开始操作
    </button>
  )
}

function renderApplicationDialogHost(children?: React.ReactNode) {
  return render(
    <LanguageProvider defaultLocale='zh-CN'>
      {children}
      <ApplicationConfirmPromptAndAlertDialogHost />
    </LanguageProvider>
  )
}

describe('application dialogs preserve native confirmation and prompt decisions', () => {
  it('waits before running a protected action, cancels it, and runs only after acceptance', async () => {
    const onAction = vi.fn()
    renderApplicationDialogHost(
      <ProtectedActionWithApplicationConfirmation onAction={onAction} />
    )
    fireEvent.click(screen.getByRole('button', { name: '开始操作' }))
    expect(onAction).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    await act(async () => {})
    expect(onAction).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '开始操作' }))
    expect(onAction).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '确认' }))
    await act(async () => {})
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('shows the default input, returns edits, and preserves empty strings', async () => {
    renderApplicationDialogHost()
    let enteredValue!: Promise<string | null>
    act(() => {
      enteredValue = requestApplicationTextInput('修订原因', '原始原因')
    })
    const input = screen.getByRole('textbox', { name: '修订原因' })
    expect(input).toHaveValue('原始原因')
    expect(input).toHaveFocus()
    fireEvent.change(input, { target: { value: '更正尺寸' } })
    fireEvent.submit(input.closest('form')!)
    await expect(enteredValue).resolves.toBe('更正尺寸')

    act(() => {
      enteredValue = requestApplicationTextInput('可选备注')
    })
    fireEvent.click(screen.getByRole('button', { name: '确认' }))
    await expect(enteredValue).resolves.toBe('')
  })

  it('resolves a prompt as null on Escape and returns focus to the initiating control', async () => {
    renderApplicationDialogHost(<button>输入原因</button>)
    const trigger = screen.getByRole('button', { name: '输入原因' })
    trigger.focus()
    let response!: Promise<string | null>
    act(() => {
      response = requestApplicationTextInput('请输入原因')
    })
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    await expect(response).resolves.toBeNull()
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('queues requests and ignores duplicate responses from an earlier dialog', async () => {
    renderApplicationDialogHost()
    let firstResponse!: Promise<boolean>
    let secondResponse!: Promise<string | null>
    let alertResponse!: Promise<void>
    act(() => {
      firstResponse = requestApplicationConfirmation('第一个请求')
      secondResponse = requestApplicationTextInput('第二个请求')
      alertResponse = showApplicationAlert('第三个请求')
    })
    const firstId = useApplicationDialogRequestQueue.getState().requests[0].id
    expect(screen.getAllByRole('alertdialog')).toHaveLength(1)
    expect(screen.getByText('第一个请求')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '确认' }))
    await expect(firstResponse).resolves.toBe(true)
    act(() => resolveApplicationDialogRequest(firstId, true))
    expect(screen.getByText('第二个请求')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    await expect(secondResponse).resolves.toBeNull()
    expect(screen.getByText('第三个请求')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '取消' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '确认' }))
    await expect(alertResponse).resolves.toBeUndefined()
    expect(useApplicationDialogRequestQueue.getState().requests).toHaveLength(0)
  })
})
