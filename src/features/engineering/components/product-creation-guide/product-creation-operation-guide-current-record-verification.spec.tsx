// @vitest-environment jsdom
import { useState, type ReactNode } from 'react'
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { bomSchema } from '@/features/product-structure/data/schema'
import {
  BOMS_QUERY_KEY,
  bomQueryKeys,
} from '@/features/product-structure/query-keys'
import type { ProductCreationGuideProgress } from '../../data/product-creation-operation-guide-progress'
import { productDetailQueryKey } from '../../query-keys'
import { createProductDraft } from '../../utils/default-builders'
import { ProductCreationOperationGuideDialog } from './product-creation-operation-guide-dialog'

const recordVerificationMocks = vi.hoisted(() => ({
  getProductById: vi.fn(),
  getBOMs: vi.fn(),
  account: {
    user: {
      id: 'record-verification-account',
      permissions: ['menu_engineering'],
    },
    isIdentitySynced: true,
  },
}))
vi.mock('../../services/product-core-service', () => ({
  ProductCoreService: {
    getProductById: recordVerificationMocks.getProductById,
  },
}))
vi.mock('@/features/product-structure/services/bom-service', () => ({
  bomService: { getBOMs: recordVerificationMocks.getBOMs },
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    select: (state: typeof recordVerificationMocks.account) => unknown
  ) => select(recordVerificationMocks.account),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))
vi.mock('./product-creation-guide-business-operation-dialog', () => ({
  ProductCreationGuideBusinessOperationDialog: ({
    step,
    progress,
    wizardHeader,
  }: {
    step: { title: string }
    progress: ProductCreationGuideProgress
    wizardHeader: ReactNode
  }) => (
    <div role='dialog' aria-label={step.title}>
      {wizardHeader}
      <span>
        existing-product-id:{progress.completedSteps.product?.id ?? 'none'}
      </span>
    </div>
  ),
}))

const verificationStorageKey =
  'product-creation-operation-guide:v1:record-verification-account'
const currentProductRecord = createProductDraft({
  id: 'existing-product',
  name: '当前产品名称',
  sku: 'CURRENT-001',
})
const externallyLinkedBom = bomSchema.parse({
  id: 'externally-linked-bom',
  bomNo: 'BOM-EXTERNAL',
  productId: currentProductRecord.id,
  status: 'DRAFT',
})
const queryClients: QueryClient[] = []

function savePreviouslyConfirmedGuideProgress(includeBom = false) {
  const progress: ProductCreationGuideProgress = {
    completedSteps: {
      template: { id: 'existing-template', label: '原模板' },
      baseModel: { id: 'existing-base-model', label: '原基础型号' },
      product: {
        id: currentProductRecord.id,
        label: '浏览器旧名称',
        code: 'OLD',
      },
      ...(includeBom
        ? { bom: { id: externallyLinkedBom.id, label: '浏览器旧 BOM 名称' } }
        : {}),
    },
    bomSkipped: !includeBom,
  }
  localStorage.setItem(verificationStorageKey, JSON.stringify(progress))
  return progress
}

function ProductCreationRecordVerificationTestHost() {
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

function renderGuideWithActualRecordVerification(queryClient?: QueryClient) {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
    })
  queryClients.push(client)
  render(
    <QueryClientProvider client={client}>
      <LanguageProvider defaultLocale='zh-CN'>
        <ProductCreationRecordVerificationTestHost />
      </LanguageProvider>
    </QueryClientProvider>
  )
  return client
}

beforeEach(() => {
  localStorage.clear()
  recordVerificationMocks.account.user.permissions = ['menu_engineering']
  recordVerificationMocks.getProductById.mockResolvedValue(currentProductRecord)
  recordVerificationMocks.getBOMs.mockResolvedValue([])
})
afterEach(() => {
  cleanup()
  queryClients.splice(0).forEach((client) => client.clear())
  focusManager.setFocused(undefined)
})

describe('product creation guide verifies current records', () => {
  it('rechecks fresh cached data on opening and recognizes BOM linking done outside the guide', async () => {
    savePreviouslyConfirmedGuideProgress()
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: 60_000 } },
    })
    client.setQueryData(productDetailQueryKey(currentProductRecord.id), {
      ...currentProductRecord,
      name: '缓存旧名称',
    })
    client.setQueryData(
      [...bomQueryKeys.list(), { productId: currentProductRecord.id }],
      []
    )
    recordVerificationMocks.getBOMs.mockResolvedValue([externallyLinkedBom])
    renderGuideWithActualRecordVerification(client)
    expect(
      screen.queryByText('BOM 已保存：BOM-EXTERNAL / V1.0')
    ).not.toBeInTheDocument()
    expect(screen.getByText('正在核对产品记录…')).toBeInTheDocument()
    expect(await screen.findByText('当前产品名称')).toBeInTheDocument()
    expect(
      await screen.findByText('BOM 已保存：BOM-EXTERNAL / V1.0')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'BOM（后续绑定） · 已完成' })
    ).toBeEnabled()
    expect(recordVerificationMocks.getBOMs).toHaveBeenCalledWith({
      productId: currentProductRecord.id,
    })
    expect(
      screen.queryByRole('button', { name: '继续建立 BOM' })
    ).not.toBeInTheDocument()
  })

  it.each(['deleted', 'reassigned'] as const)(
    'removes the saved BOM completion display when the record is %s',
    async (recordChange) => {
      savePreviouslyConfirmedGuideProgress(true)
      recordVerificationMocks.getBOMs.mockResolvedValue(
        recordChange === 'deleted'
          ? []
          : [{ ...externallyLinkedBom, productId: 'another-product' }]
      )
      renderGuideWithActualRecordVerification()
      expect(
        await screen.findByRole('dialog', { name: '产品已建立' })
      ).toBeInTheDocument()
      expect(
        await screen.findByRole('button', { name: '继续建立 BOM' })
      ).toBeEnabled()
      expect(screen.queryByText(/BOM 已保存/)).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'BOM（后续绑定） · 已完成' })
      ).not.toBeInTheDocument()
    }
  )

  it('follows the shared invalidation used by independent product and BOM pages', async () => {
    savePreviouslyConfirmedGuideProgress()
    const client = renderGuideWithActualRecordVerification()
    await screen.findByRole('dialog', { name: '产品已建立' })
    recordVerificationMocks.getProductById.mockResolvedValue({
      ...currentProductRecord,
      name: '独立页面修改后的名称',
    })
    recordVerificationMocks.getBOMs.mockResolvedValue([externallyLinkedBom])
    await act(async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: productDetailQueryKey(currentProductRecord.id),
        }),
        client.invalidateQueries({ queryKey: BOMS_QUERY_KEY }),
      ])
    })
    expect(await screen.findByText('独立页面修改后的名称')).toBeInTheDocument()
    expect(
      await screen.findByText('BOM 已保存：BOM-EXTERNAL / V1.0')
    ).toBeInTheDocument()
    recordVerificationMocks.getBOMs.mockResolvedValue([])
    await act(async () => {
      await client.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
    })
    await waitFor(() =>
      expect(screen.queryByText(/BOM 已保存/)).not.toBeInTheDocument()
    )
    expect(screen.getByRole('button', { name: '继续建立 BOM' })).toBeEnabled()
  })

  it('rechecks external changes when returning to the browser window and reopening the guide', async () => {
    savePreviouslyConfirmedGuideProgress()
    renderGuideWithActualRecordVerification()
    await screen.findByRole('dialog', { name: '产品已建立' })
    recordVerificationMocks.getBOMs.mockResolvedValue([externallyLinkedBom])
    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })
    expect(
      await screen.findByText('BOM 已保存：BOM-EXTERNAL / V1.0')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '完成并关闭' }))
    recordVerificationMocks.getBOMs.mockResolvedValue([])
    fireEvent.click(screen.getByRole('button', { name: '重新打开向导' }))
    expect(
      await screen.findByRole('button', { name: '继续建立 BOM' })
    ).toBeEnabled()
    expect(screen.queryByText(/BOM 已保存/)).not.toBeInTheDocument()
  })

  it.each([new Error('Network unavailable'), { status: 403 }])(
    'retains local progress on product query failure and allows retry',
    async (queryError) => {
      savePreviouslyConfirmedGuideProgress(true)
      const storedProgress = localStorage.getItem(verificationStorageKey)
      recordVerificationMocks.getProductById.mockRejectedValue(queryError)
      renderGuideWithActualRecordVerification()
      expect(
        await screen.findByText(
          '暂时无法核对产品记录，请重试。本地进度已保留。'
        )
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('dialog', { name: '产品已建立' })
      ).not.toBeInTheDocument()
      expect(screen.queryByText(/该产品记录已不存在/)).not.toBeInTheDocument()
      expect(localStorage.getItem(verificationStorageKey)).toBe(storedProgress)
      recordVerificationMocks.getProductById.mockResolvedValue(
        currentProductRecord
      )
      fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
      expect(
        await screen.findByRole('dialog', { name: '产品已建立' })
      ).toBeInTheDocument()
    }
  )

  it.each([false, true])(
    'shows an unverified BOM state on failure with saved BOM confirmation %s',
    async (hasSavedBomConfirmation) => {
      savePreviouslyConfirmedGuideProgress(hasSavedBomConfirmation)
      const storedProgress = localStorage.getItem(verificationStorageKey)
      recordVerificationMocks.getBOMs.mockRejectedValue(
        new Error('Network unavailable')
      )
      renderGuideWithActualRecordVerification()
      expect(
        await screen.findByText(
          '暂时无法核对 BOM 关联状态，请重试。本地进度已保留。'
        )
      ).toBeInTheDocument()
      expect(screen.queryByText(/BOM 已保存/)).not.toBeInTheDocument()
      expect(localStorage.getItem(verificationStorageKey)).toBe(storedProgress)
      if (!hasSavedBomConfirmation)
        expect(
          screen.getByRole('button', { name: '继续建立 BOM' })
        ).toBeEnabled()
      expect(screen.getByRole('button', { name: '完成并关闭' })).toBeEnabled()
      recordVerificationMocks.getBOMs.mockResolvedValue([externallyLinkedBom])
      fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
      expect(
        await screen.findByText('BOM 已保存：BOM-EXTERNAL / V1.0')
      ).toBeInTheDocument()
    }
  )

  it('recognizes a product 404 without marking it as saved or deleting other records', async () => {
    savePreviouslyConfirmedGuideProgress(true)
    recordVerificationMocks.getProductById.mockRejectedValue({ status: 404 })
    renderGuideWithActualRecordVerification()
    expect(
      await screen.findByText('该产品记录已不存在，不能继续标记为已建立。')
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '保存产品 · 已完成' })
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/BOM 已保存/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '继续建立 BOM' })
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '返回产品步骤' }))
    expect(screen.getByText('existing-product-id:none')).toBeInTheDocument()
    const stored = JSON.parse(
      localStorage.getItem(verificationStorageKey) ?? '{}'
    )
    expect(Object.keys(stored.completedSteps)).toEqual([
      'template',
      'baseModel',
    ])
  })

  it('ignores late verification results after starting another product task', async () => {
    savePreviouslyConfirmedGuideProgress()
    let completeBomRead!: (boms: (typeof externallyLinkedBom)[]) => void
    recordVerificationMocks.getBOMs.mockReturnValue(
      new Promise<(typeof externallyLinkedBom)[]>((resolve) => {
        completeBomRead = resolve
      })
    )
    renderGuideWithActualRecordVerification()
    await screen.findByRole('dialog', { name: '产品已建立' })
    fireEvent.click(screen.getByRole('button', { name: '建立另一个产品' }))
    fireEvent.click(screen.getByRole('button', { name: /^确认$/ }))
    await act(async () => completeBomRead([externallyLinkedBom]))
    expect(
      screen.getByRole('dialog', { name: '选择产品模板' })
    ).toBeInTheDocument()
    expect(screen.queryByText(/BOM 已保存/)).not.toBeInTheDocument()
    expect(
      JSON.parse(localStorage.getItem(verificationStorageKey) ?? '{}')
        .completedSteps
    ).toEqual({})
  })

  it('does not issue verification requests for pages the account cannot access', async () => {
    savePreviouslyConfirmedGuideProgress(true)
    recordVerificationMocks.account.user.permissions = [
      'tab_engineering_product_creation_guide',
    ]
    renderGuideWithActualRecordVerification()
    expect(
      screen.getByText('当前没有产品页面的访问权限，无法核对产品记录。')
    ).toBeInTheDocument()
    expect(
      screen.getByText('当前没有 BOM 页面的访问权限，无法核对关联状态。')
    ).toBeInTheDocument()
    expect(recordVerificationMocks.getProductById).not.toHaveBeenCalled()
    expect(recordVerificationMocks.getBOMs).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '完成并关闭' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
