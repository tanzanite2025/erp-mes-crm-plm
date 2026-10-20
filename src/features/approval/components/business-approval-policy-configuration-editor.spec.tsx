// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  businessApprovalPolicyConfigurationQueryKey,
  type BusinessApprovalPolicyConfiguration,
} from '../services/business-approval-policy-configuration-service'
import { BusinessApprovalPolicyConfigurationEditor } from './business-approval-policy-configuration-editor'

const policyApi = vi.hoisted(() => ({
  save: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))
vi.mock('sonner', () => ({
  toast: { success: policyApi.success, error: policyApi.error },
}))
vi.mock('../services/business-approval-policy-configuration-service', () => ({
  businessApprovalPolicyConfigurationQueryKey: [
    'business-approval-policy-configurations',
  ],
  BusinessApprovalPolicyConfigurationService: {
    saveConfiguration: policyApi.save,
  },
}))

const initialConfiguration: BusinessApprovalPolicyConfiguration = {
  businessType: 'QUALITY_STANDARD',
  businessName: '品质标准',
  submissionDescription: '标准提审',
  enabled: false,
  approver1Id: '',
  approver2Id: '',
  version: 0,
  updatedAt: null,
}
const testUsers = [
  { id: 'reviewer-1', username: 'primary-reviewer' },
  { id: 'reviewer-2', username: 'secondary-reviewer' },
]

function renderBusinessApprovalPolicyEditorForTest(canManage = true) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  client.setQueryData(businessApprovalPolicyConfigurationQueryKey, [
    initialConfiguration,
  ])
  render(
    <QueryClientProvider client={client}>
      <BusinessApprovalPolicyConfigurationEditor
        configuration={initialConfiguration}
        users={testUsers}
        canManage={canManage}
      />
    </QueryClientProvider>
  )
  return client
}

describe('independent business approval policy configuration', () => {
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('saves the explicit chain and version only after server success', async () => {
    let acceptSave: (value: BusinessApprovalPolicyConfiguration) => void = () =>
      undefined
    policyApi.save.mockImplementation(
      () =>
        new Promise<BusinessApprovalPolicyConfiguration>((resolve) => {
          acceptSave = resolve
        })
    )
    const client = renderBusinessApprovalPolicyEditorForTest()
    fireEvent.change(screen.getByLabelText('approval.labels.l1Approver'), {
      target: { value: 'reviewer-1' },
    })
    fireEvent.change(screen.getByLabelText('approval.labels.l2Approver'), {
      target: { value: 'reviewer-2' },
    })
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(screen.getByText('approval.policies.save'))
    await waitFor(() =>
      expect(policyApi.save).toHaveBeenCalledWith('QUALITY_STANDARD', {
        enabled: true,
        approver1Id: 'reviewer-1',
        approver2Id: 'reviewer-2',
        version: 0,
      })
    )
    expect(
      client.getQueryData(businessApprovalPolicyConfigurationQueryKey)
    ).toEqual([initialConfiguration])
    expect(policyApi.success).not.toHaveBeenCalled()
    const saved = {
      ...initialConfiguration,
      enabled: true,
      approver1Id: 'reviewer-1',
      approver2Id: 'reviewer-2',
      version: 1,
    }
    acceptSave(saved)
    await waitFor(() =>
      expect(
        client.getQueryData(businessApprovalPolicyConfigurationQueryKey)
      ).toEqual([saved])
    )
    expect(policyApi.success).toHaveBeenCalledOnce()
  })

  it('keeps saved state unchanged when a stale configuration is rejected', async () => {
    policyApi.save.mockRejectedValue(
      new Error('审批配置已变更，请刷新后重新编辑')
    )
    const client = renderBusinessApprovalPolicyEditorForTest()
    fireEvent.change(screen.getByLabelText('approval.labels.l1Approver'), {
      target: { value: 'reviewer-1' },
    })
    fireEvent.click(screen.getByText('approval.policies.save'))
    await waitFor(() =>
      expect(policyApi.error).toHaveBeenCalledWith(
        '审批配置已变更，请刷新后重新编辑'
      )
    )
    expect(
      client.getQueryData(businessApprovalPolicyConfigurationQueryKey)
    ).toEqual([initialConfiguration])
    expect(policyApi.success).not.toHaveBeenCalled()
  })

  it('does not offer editing to accounts without management permission', () => {
    renderBusinessApprovalPolicyEditorForTest(false)
    expect(screen.queryByText('approval.policies.save')).toBeNull()
    expect(
      (screen.getByLabelText('approval.labels.l1Approver') as HTMLSelectElement)
        .disabled
    ).toBe(true)
    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(
      true
    )
  })
})
