// @vitest-environment jsdom
import { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
import { type BOM } from '../../data/schema'
import { type SaveBOMInput } from '../../mutation-types'
import { bomQueryKeys } from '../../query-keys'
import { createEmptyBOMFormValue } from '../../utils/bom-form-defaults'
import { bomVersionTraceQueryKeys } from '../../version-trace/query-keys'
import { BOMDialogFooter } from '../bom-dialog-footer'
import { BOMCreationGuideDraftEntry } from './bom-creation-guide-draft-entry'

const bomGuideDraftTestState = vi.hoisted(() => ({
  user: { permissions: [] as string[] },
  isIdentitySynced: true,
  isSyncing: false,
  saveBOM: vi.fn(),
  submissionResults: [] as (BOM | null)[],
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: typeof bomGuideDraftTestState) => unknown) =>
    select(bomGuideDraftTestState),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))
vi.mock('../../services/bom-service', () => ({
  bomService: { saveBOM: bomGuideDraftTestState.saveBOM },
}))
vi.mock('../bom-action-dialog', () => ({
  BOMActionDialog: ({
    onSubmit,
    onOpenChange,
    onPromote,
  }: {
    onSubmit: (data: SaveBOMInput) => Promise<BOM | null>
    onOpenChange: (open: boolean) => void
    onPromote?: (id: string, status: string) => Promise<boolean>
  }) => (
    <div role='dialog' aria-label='复用 BOM 编辑器'>
      <button type='button' onClick={() => onOpenChange(false)}>
        关闭编辑器
      </button>
      <button
        type='button'
        onClick={async () => {
          const result = await onSubmit({
            ...createEmptyBOMFormValue({
              productId: 'product-r50',
              versionLevel: 'lightweight',
              measuredWeight: 420,
              measuredWeightUnit: 'g',
            }),
            relationSidecar: {
              kind: 'parent_children_protocol',
              version: 'v1',
              protocolDraft: {
                rootChildren: [],
                branchNodes: [],
                itemNodes: [],
              },
            },
          })
          bomGuideDraftTestState.submissionResults.push(result)
        }}
      >
        提交测试草稿
      </button>
      <BOMDialogFooter
        isSubmitDisabled={false}
        onPromote={
          onPromote
            ? async (status) => {
                await onPromote('saved-bom', status)
              }
            : undefined
        }
      />
    </div>
  ),
}))

const queryClients: QueryClient[] = []

function renderBOMGuideDraftEntryWithSharedMutation(
  presentation: 'card' | 'inline' = 'card'
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClients.push(queryClient)
  const view = render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider
        defaultLocale='zh-CN'
        storageKey='bom-guide-draft-contract-language'
      >
        <BOMCreationGuideDraftEntry presentation={presentation} />
      </LanguageProvider>
    </QueryClientProvider>
  )
  return { queryClient, ...view }
}

beforeEach(() => {
  vi.clearAllMocks()
  bomGuideDraftTestState.user.permissions = [
    'menu_engineering',
    'menu_product_structure',
    'action_engineering_bom_manage',
  ]
  bomGuideDraftTestState.isIdentitySynced = true
  bomGuideDraftTestState.isSyncing = false
  bomGuideDraftTestState.submissionResults = []
})
afterEach(() => {
  cleanup()
  queryClients.splice(0).forEach((client) => client.clear())
})

describe('BOM guide draft entry shares business persistence without an extra workflow', () => {
  it.each([
    ['guide only', ['tab_engineering_bom_creation_guide'], true, false],
    [
      'no management action',
      ['menu_engineering', 'menu_product_structure'],
      true,
      false,
    ],
    [
      'no engineering API access',
      ['menu_product_structure', 'action_engineering_bom_manage'],
      true,
      false,
    ],
    [
      'identity pending',
      [
        'menu_engineering',
        'menu_product_structure',
        'action_engineering_bom_manage',
      ],
      false,
      false,
    ],
    [
      'identity refreshing',
      [
        'menu_engineering',
        'menu_product_structure',
        'action_engineering_bom_manage',
      ],
      true,
      true,
    ],
  ])(
    'blocks the editor for %s while leaving explanations available',
    (_name, permissions, synced, syncing) => {
      bomGuideDraftTestState.user.permissions = permissions
      bomGuideDraftTestState.isIdentitySynced = synced
      bomGuideDraftTestState.isSyncing = syncing
      renderBOMGuideDraftEntryWithSharedMutation()
      fireEvent.click(screen.getByRole('button', { name: '开始录入 BOM 草稿' }))
      expect(
        screen.getByRole('button', { name: '开始录入 BOM 草稿' })
      ).toBeDisabled()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(bomGuideDraftTestState.saveBOM).not.toHaveBeenCalled()
    }
  )

  it.each([
    ['card', '开始录入 BOM 草稿'],
    ['inline', '录入归属、版本、重量与配方'],
  ] as const)(
    'opens the %s entry only after a click and cancels without writing',
    async (presentation, entryLabel) => {
      renderBOMGuideDraftEntryWithSharedMutation(presentation)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(bomGuideDraftTestState.saveBOM).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: entryLabel }))
      await screen.findByRole('dialog', { name: '复用 BOM 编辑器' })
      expect(
        screen.queryByRole('button', { name: '提交评审' })
      ).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: '关闭编辑器' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(bomGuideDraftTestState.saveBOM).not.toHaveBeenCalled()
    }
  )

  it.each([
    ['card', '开始录入 BOM 草稿'],
    ['inline', '录入归属、版本、重量与配方'],
  ] as const)(
    'saves through the shared mutation and refreshes caches from the %s entry',
    async (presentation, entryLabel) => {
      const { queryClient } =
        renderBOMGuideDraftEntryWithSharedMutation(presentation)
      const savedBOM = createEmptyBOMFormValue({
        id: 'saved-bom',
        bomNo: 'EBOM-100',
        productId: 'product-r50',
        version: 1,
      })
      queryClient.setQueryData(bomQueryKeys.associationOptions(), [])
      queryClient.setQueryData(bomVersionTraceQueryKeys.root(), [])
      bomGuideDraftTestState.saveBOM.mockResolvedValue(savedBOM)
      fireEvent.click(screen.getByRole('button', { name: entryLabel }))
      fireEvent.click(
        await screen.findByRole('button', { name: '提交测试草稿' })
      )
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
      await waitFor(() =>
        expect(bomGuideDraftTestState.submissionResults).toEqual([savedBOM])
      )
      expect(bomGuideDraftTestState.saveBOM).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: 'product-r50',
          measuredWeight: 420,
          measuredWeightUnit: 'g',
          versionLevel: 'lightweight',
        }),
      })
      expect(
        queryClient.getQueryState(bomQueryKeys.associationOptions())
          ?.isInvalidated
      ).toBe(true)
      expect(
        queryClient.getQueryState(bomVersionTraceQueryKeys.root())
          ?.isInvalidated
      ).toBe(true)
      expect(screen.getByRole('status')).toHaveTextContent('EBOM-100')
    }
  )

  it('prevents duplicate saves and closing during submission, preserves failed drafts and allows retry', async () => {
    renderBOMGuideDraftEntryWithSharedMutation()
    let rejectSave!: (error: Error) => void
    bomGuideDraftTestState.saveBOM.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectSave = reject
        })
    )
    fireEvent.click(screen.getByRole('button', { name: '开始录入 BOM 草稿' }))
    const submitButton = await screen.findByRole('button', {
      name: '提交测试草稿',
    })
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)
    fireEvent.click(screen.getByRole('button', { name: '关闭编辑器' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await waitFor(() =>
      expect(bomGuideDraftTestState.saveBOM).toHaveBeenCalledTimes(1)
    )
    await act(async () => rejectSave(new Error('保存服务暂不可用')))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    bomGuideDraftTestState.saveBOM.mockResolvedValueOnce(
      createEmptyBOMFormValue({ id: 'retry-bom', bomNo: 'EBOM-101' })
    )
    fireEvent.click(submitButton)
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(bomGuideDraftTestState.saveBOM).toHaveBeenCalledTimes(2)
  })
})
