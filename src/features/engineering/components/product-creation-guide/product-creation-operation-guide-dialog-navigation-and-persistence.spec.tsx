// @vitest-environment jsdom
import { useState, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import type { ProductCreationGuideStepResult } from '../../data/product-creation-operation-guide-progress'
import { ProductCreationOperationGuideDialog } from './product-creation-operation-guide-dialog'

const guideAccount = vi.hoisted(() => ({
  user: { id: 'guide-account', permissions: ['menu_engineering'] },
  isIdentitySynced: true,
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: typeof guideAccount) => unknown) =>
    select(guideAccount),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))
vi.mock(
  '../../hooks/use-product-creation-guide-saved-record-verification',
  () => ({
    useProductCreationGuideSavedRecordVerification: ({
      savedProduct,
      savedBom,
    }: {
      savedProduct?: ProductCreationGuideStepResult
      savedBom?: ProductCreationGuideStepResult
    }) => ({
      productStatus: savedProduct ? 'verified' : 'idle',
      bomStatus: savedProduct ? 'verified' : 'idle',
      verifiedProduct: savedProduct,
      verifiedBom: savedBom,
      retrySavedProductAndBomVerification: vi.fn(),
    }),
  })
)
vi.mock('./product-creation-guide-business-operation-dialog', () => ({
  ProductCreationGuideBusinessOperationDialog: ({
    step,
    wizardHeader,
    onCompleted,
    onClose,
    onBusyChange,
  }: {
    step: { key: string; title: string }
    wizardHeader: ReactNode
    onCompleted: (result: ProductCreationGuideStepResult) => void
    onClose: () => void
    onBusyChange: (busy: boolean) => void
  }) => (
    <div role='dialog' aria-label={step.title}>
      {wizardHeader}
      <button onClick={onClose}>取消业务操作</button>
      <button
        onClick={() =>
          onCompleted({
            id: `saved-${step.key}`,
            label: `已保存 ${step.title}`,
            version: 1,
          })
        }
      >
        确认当前配置
      </button>
      <button
        onClick={() =>
          onCompleted({
            id: `changed-${step.key}`,
            label: `更换 ${step.title}`,
            version: 1,
          })
        }
      >
        确认不同配置
      </button>
      <button onClick={() => onBusyChange(true)}>模拟正在保存</button>
    </div>
  ),
}))

function ProductCreationWizardTestHost() {
  const [isOpen, setIsOpen] = useState(true)
  return (
    <>
      <button onClick={() => setIsOpen(true)}>重新打开向导</button>
      {isOpen && (
        <ProductCreationOperationGuideDialog onClose={() => setIsOpen(false)} />
      )}
    </>
  )
}
function renderProductCreationWizardForNavigationTest() {
  return render(
    <LanguageProvider defaultLocale='zh-CN'>
      <ProductCreationWizardTestHost />
    </LanguageProvider>
  )
}
function confirmCurrentProductCreationWizardConfiguration() {
  fireEvent.click(screen.getByRole('button', { name: '确认当前配置' }))
}
function readSavedProductCreationWizardProgress() {
  return JSON.parse(
    localStorage.getItem('product-creation-operation-guide:v1:guide-account') ??
      '{}'
  )
}
beforeEach(() => {
  localStorage.clear()
  guideAccount.user.id = 'guide-account'
  guideAccount.user.permissions = ['menu_engineering']
  guideAccount.isIdentitySynced = true
})
afterEach(cleanup)

describe('product creation modal wizard', () => {
  it('shows a single step, locks future steps, and restores confirmed progress after closing', () => {
    renderProductCreationWizardForNavigationTest()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(
      screen.getByRole('dialog', { name: '选择物理规格模板' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /基础型号/ })).toBeDisabled()
    confirmCurrentProductCreationWizardConfiguration()
    expect(
      screen.getByRole('dialog', { name: '确认基础型号' })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '取消业务操作' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重新打开向导' }))
    expect(
      screen.getByRole('dialog', { name: '确认基础型号' })
    ).toBeInTheDocument()
    expect(
      Object.keys(readSavedProductCreationWizardProgress().completedSteps)
    ).toEqual(['template'])
  })

  it('allows returning to confirmed steps and invalidates later confirmations only after a changed selection is confirmed', () => {
    renderProductCreationWizardForNavigationTest()
    confirmCurrentProductCreationWizardConfiguration()
    confirmCurrentProductCreationWizardConfiguration()
    fireEvent.click(screen.getByRole('button', { name: /选择模板/ }))
    expect(
      readSavedProductCreationWizardProgress().completedSteps.baseModel.id
    ).toBe('saved-baseModel')
    confirmCurrentProductCreationWizardConfiguration()
    expect(
      readSavedProductCreationWizardProgress().completedSteps.baseModel.id
    ).toBe('saved-baseModel')
    fireEvent.click(screen.getByRole('button', { name: /选择模板/ }))
    fireEvent.click(screen.getByRole('button', { name: '确认不同配置' }))
    expect(
      screen.getByRole('dialog', { name: '确认基础型号' })
    ).toBeInTheDocument()
    expect(
      readSavedProductCreationWizardProgress().completedSteps.baseModel
    ).toBeUndefined()
    expect(screen.getByRole('button', { name: /保存产品/ })).toBeDisabled()
  })

  it('keeps the optional BOM summary open after product save and persists Finish before unmounting', () => {
    renderProductCreationWizardForNavigationTest()
    for (let index = 0; index < 3; index++)
      confirmCurrentProductCreationWizardConfiguration()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(
      screen.getByRole('dialog', { name: '产品已建立' })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '完成并关闭' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(readSavedProductCreationWizardProgress().bomSkipped).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '重新打开向导' }))
    fireEvent.click(screen.getByRole('button', { name: '继续建立 BOM' }))
    expect(
      screen.getByRole('dialog', { name: '为已建产品建立 BOM' })
    ).toBeInTheDocument()
    confirmCurrentProductCreationWizardConfiguration()
    expect(screen.getByText(/BOM 已保存/)).toBeInTheDocument()
  })

  it('confirms restart inline and keeps step navigation disabled during submission', () => {
    renderProductCreationWizardForNavigationTest()
    for (let index = 0; index < 3; index++)
      confirmCurrentProductCreationWizardConfiguration()
    fireEvent.click(screen.getByRole('button', { name: '建立另一个产品' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /^确认$/ }))
    expect(readSavedProductCreationWizardProgress().completedSteps).toEqual({})
    confirmCurrentProductCreationWizardConfiguration()
    fireEvent.click(screen.getByRole('button', { name: '模拟正在保存' }))
    expect(screen.getByRole('button', { name: /选择模板/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: '上一步' })).toBeDisabled()
  })

  it('isolates account progress and checks the target page permission before showing operations', () => {
    localStorage.setItem(
      'product-creation-operation-guide:v1:another-account',
      JSON.stringify({
        completedSteps: {
          template: { id: 'other-template', label: 'Other template' },
        },
        bomSkipped: false,
      })
    )
    guideAccount.user.permissions = ['tab_engineering_product_creation_guide']
    renderProductCreationWizardForNavigationTest()
    expect(
      screen.queryByRole('button', { name: '确认当前配置' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('dialog', { name: '选择物理规格模板' })
    ).toBeInTheDocument()
    expect(
      localStorage.getItem('product-creation-operation-guide:v1:guide-account')
    ).toBeNull()
  })
})
