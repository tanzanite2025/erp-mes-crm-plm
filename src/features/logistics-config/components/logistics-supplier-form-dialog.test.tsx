// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { createEmptyLogisticsProvider } from '@/features/logistics-config/provider-directory'
import type { LogisticsProviderDraft } from '@/features/sandbox/logistics-api/types'
import { LogisticsSupplierFormDialog } from './logistics-supplier-form-dialog'

const { getCookieMock, removeCookieMock, setCookieMock } = vi.hoisted(() => ({
  getCookieMock: vi.fn(),
  removeCookieMock: vi.fn(),
  setCookieMock: vi.fn(),
}))

vi.mock('@/lib/cookies', () => ({
  getCookie: getCookieMock,
  removeCookie: removeCookieMock,
  setCookie: setCookieMock,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div data-slot='dialog'>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-slot='dialog-content'>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-slot='dialog-footer'>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div data-slot='dialog-header'>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('./logistics-supplier-template-section', () => ({
  LogisticsSupplierTemplateSection: () => <div data-testid='supplier-template-section' />,
}))

vi.mock('./logistics-supplier-basic-fields-section', () => ({
  LogisticsSupplierBasicFieldsSection: () => <div data-testid='supplier-basic-section' />,
}))

vi.mock('./logistics-supplier-directory-fields-section', () => ({
  LogisticsSupplierDirectoryFieldsSection: () => <div data-testid='supplier-directory-section' />,
}))

vi.mock('./logistics-supplier-integration-fields-section', () => ({
  LogisticsSupplierIntegrationFieldsSection: () => <div data-testid='supplier-integration-section' />,
}))

function createDraft(overrides: Partial<LogisticsProviderDraft> = {}): LogisticsProviderDraft {
  return {
    ...createEmptyLogisticsProvider(),
    name: '顺丰速运',
    code: 'SF',
    category: 'domestic',
    capabilities: ['tracking'],
    status: 'Enabled',
    verificationStatus: 'unverified',
    ...overrides,
  }
}

type RenderOptions = {
  formData?: LogisticsProviderDraft
  isFormValid?: boolean
  isCredentialsComplete?: boolean
  savePending?: boolean
  onSave?: () => void
}

function renderDialog({
  formData = createDraft(),
  isFormValid = true,
  isCredentialsComplete = false,
  savePending = false,
  onSave = vi.fn(),
}: RenderOptions = {}) {
  const setFormData = vi.fn()
  const onOpenChange = vi.fn()
  const onApplyTemplate = vi.fn()

  render(
    <LanguageProvider defaultLocale='zh-CN'>
      <LogisticsSupplierFormDialog
        open
        onOpenChange={onOpenChange}
        formData={formData}
        setFormData={setFormData}
        selectedTemplateNote=''
        previewConnected={false}
        previewVerificationStatus='unverified'
        isFormValid={isFormValid}
        isCredentialsComplete={isCredentialsComplete}
        savePending={savePending}
        onApplyTemplate={onApplyTemplate}
        onSave={onSave}
      />
    </LanguageProvider>
  )

  return {
    onApplyTemplate,
    onOpenChange,
    onSave,
    setFormData,
  }
}

describe('logistics-supplier-form-dialog UI regression', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    getCookieMock.mockReset()
    removeCookieMock.mockReset()
    setCookieMock.mockReset()
    getCookieMock.mockReturnValue(undefined)
  })

  it('renders supplier credentials section and visible credential field labels for known provider profiles', () => {
    renderDialog({
      formData: createDraft({ code: 'SF', capabilities: ['tracking'] }),
      isCredentialsComplete: false,
    })

    expect(screen.getByRole('heading', { name: /接口凭证信息/ })).toBeTruthy()
    expect(screen.getByText('AppKey / Token')).toBeTruthy()
    expect(screen.getByText('AppSecret / Secret')).toBeTruthy()
    expect(screen.getByText('Customer ID / 商户号')).toBeTruthy()
    expect(screen.getByText('CheckWord / 校验串')).toBeTruthy()
  })

  it('shows supplier incomplete-credentials hint and saveIncomplete label when form is valid but credentials are incomplete', () => {
    renderDialog({
      isFormValid: true,
      isCredentialsComplete: false,
    })

    expect(screen.getByText('当前凭证仍不完整，保存后仅完成目录建档与部分接口配置。')).toBeTruthy()
    expect(screen.getByRole('button', { name: '保存目录（凭证待补）' })).toBeTruthy()
  })

  it('shows saveReady label and hides incomplete hint when credentials are complete', () => {
    renderDialog({
      formData: createDraft({ appKey: 'ak', appSecret: 'sk' }),
      isFormValid: true,
      isCredentialsComplete: true,
    })

    expect(screen.queryByText('当前凭证仍不完整，保存后仅完成目录建档与部分接口配置。')).toBeNull()
    expect(screen.getByRole('button', { name: '保存目录与凭证' })).toBeTruthy()
  })

  it('triggers onSave when clicking save', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    renderDialog({
      isFormValid: true,
      isCredentialsComplete: true,
      onSave,
    })

    await user.click(screen.getByRole('button', { name: '保存目录与凭证' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('keeps the save button disabled when the form is invalid', () => {
    renderDialog({
      isFormValid: false,
      isCredentialsComplete: false,
    })
    const invalidSaveButton = screen.getByRole('button', { name: '保存目录（凭证待补）' })
    expect(invalidSaveButton.hasAttribute('disabled')).toBe(true)
  })

  it('keeps the save button disabled when save is pending', () => {
    renderDialog({
      isFormValid: true,
      isCredentialsComplete: true,
      savePending: true,
    })
    const pendingSaveButton = screen.getByRole('button', { name: '保存目录与凭证' })
    expect(pendingSaveButton.hasAttribute('disabled')).toBe(true)
  })
})
