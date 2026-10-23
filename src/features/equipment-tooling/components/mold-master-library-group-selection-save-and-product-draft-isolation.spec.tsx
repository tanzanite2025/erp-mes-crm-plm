// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { createMoldDraft, type Mold } from '../data/schema'
import { MOLD_GROUP_NAMES_QUERY_KEY } from '../mold-master-library-query-keys'
import { MoldActionDialog } from './mold-action-dialog'
import { MoldMasterLibraryGroupSelectionDialog } from './mold-master-library-group-selection-dialog'

const libraryMocks = vi.hoisted(() => ({
  getSelectionOptions: vi.fn(),
  getGroupNames: vi.fn(),
  isSnDuplicate: vi.fn(),
  createMold: vi.fn(),
  toastError: vi.fn(),
  canManage: true,
}))
vi.mock('../services/mold-core-service', () => ({
  MoldCoreService: {
    getMoldMasterLibrarySelectionOptions: libraryMocks.getSelectionOptions,
    getGroupNames: libraryMocks.getGroupNames,
    isSnDuplicate: libraryMocks.isSnDuplicate,
  },
}))
vi.mock('../services/mold-transaction-service', () => ({
  MoldTransactionService: { createMold: libraryMocks.createMold },
}))
vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionBoundary: () => ({ isAllowed: libraryMocks.canManage }),
  usePermissionActions: () => ({ allowsAction: () => libraryMocks.canManage }),
}))
vi.mock('sonner', () => ({
  toast: { error: libraryMocks.toastError, success: vi.fn() },
}))
vi.mock('./image-upload', () => ({ ImageUpload: () => null }))
vi.mock('../services/asset-service', () => ({
  AssetService: { previewHealthScore: () => 100 },
}))
vi.mock('../services/drawing-service', () => ({
  DrawingService: { getDrawingsByMold: vi.fn(async () => []) },
}))

let masterMolds: Mold[]
const queryClients: QueryClient[] = []

function renderMoldMasterLibraryInteraction(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClients.push(queryClient)
  render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider defaultLocale='zh-CN'>{children}</LanguageProvider>
    </QueryClientProvider>
  )
  return queryClient
}

function fillNewMoldIdentificationFields() {
  fireEvent.change(screen.getByPlaceholderText('M-2024-XXX'), {
    target: { value: 'SN-NEW' },
  })
  fireEvent.change(screen.getByPlaceholderText('成型模 / 注塑模...'), {
    target: { value: '新增模具' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  libraryMocks.canManage = true
  masterMolds = [
    createMoldDraft({
      id: 'old-mold',
      sn: 'SN-OLD',
      name: '已有模具',
      groupName: '原分组',
    }),
  ]
  libraryMocks.getSelectionOptions.mockImplementation(async () => [
    ...masterMolds,
  ])
  libraryMocks.getGroupNames.mockImplementation(async () => [
    ...new Set(masterMolds.map((mold) => mold.groupName).filter(Boolean)),
  ])
  libraryMocks.isSnDuplicate.mockResolvedValue(false)
  libraryMocks.createMold.mockImplementation(async (draft: Mold) => {
    const saved = { ...draft, id: 'saved-mold' }
    masterMolds.push(saved)
    return saved
  })
})

afterEach(() => {
  cleanup()
  queryClients.splice(0).forEach((client) => client.clear())
})

describe('模具分组选用与主库独立保存边界', () => {
  it('选中或取消均不改产品，只有核对成功后确认选用才回写', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    renderMoldMasterLibraryInteraction(
      <MoldMasterLibraryGroupSelectionDialog
        onSelect={onSelect}
        onClose={onClose}
      />
    )
    fireEvent.click(await screen.findByRole('radio'))
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '确认选用此分组' }))
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('原分组'))
    expect(libraryMocks.getGroupNames).toHaveBeenCalled()
  })

  it('选用前分组已消失时拒绝回写产品', async () => {
    const onSelect = vi.fn()
    renderMoldMasterLibraryInteraction(
      <MoldMasterLibraryGroupSelectionDialog
        value='原分组'
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    )
    await screen.findByRole('radio')
    libraryMocks.getGroupNames.mockResolvedValue([])
    fireEvent.click(screen.getByRole('button', { name: '确认选用此分组' }))
    await waitFor(() =>
      expect(libraryMocks.toastError).toHaveBeenCalledWith(
        expect.stringContaining('此分组已没有模具')
      )
    )
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('新增模具即入主库并刷新组名，取消选用仍保留模具且不改变产品', async () => {
    const onSelect = vi.fn()
    const queryClient = renderMoldMasterLibraryInteraction(
      <MoldMasterLibraryGroupSelectionDialog
        value='原分组'
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    )
    queryClient.setQueryData(MOLD_GROUP_NAMES_QUERY_KEY, ['原分组'])
    await screen.findByRole('radio')
    fireEvent.click(screen.getByRole('button', { name: '新增模具 / 分组' }))
    fillNewMoldIdentificationFields()
    fireEvent.click(await screen.findByRole('button', { name: '新分组' }))
    fireEvent.change(screen.getByPlaceholderText('请输入新分组名称...'), {
      target: { value: '新模具分组' },
    })
    fireEvent.click(screen.getByRole('button', { name: '确认保存档案' }))
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: '确认保存档案' })
      ).not.toBeInTheDocument()
    )
    expect(masterMolds).toHaveLength(2)
    expect(masterMolds[1]).toMatchObject({
      id: 'saved-mold',
      groupName: '新模具分组',
      sn: 'SN-NEW',
    })
    expect(queryClient.getQueryData(MOLD_GROUP_NAMES_QUERY_KEY)).toEqual([
      '原分组',
      '新模具分组',
    ])
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onSelect).not.toHaveBeenCalled()
    expect(masterMolds).toHaveLength(2)
  })

  it('模具保存失败保留全部输入，重试成功后才关闭', async () => {
    const onConfirm = vi
      .fn()
      .mockRejectedValueOnce(new Error('模具主库保存失败'))
      .mockResolvedValueOnce(undefined)
    const onOpenChange = vi.fn()
    renderMoldMasterLibraryInteraction(
      <MoldActionDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        initialGroupName='原分组'
        requireGroupName
      />
    )
    fillNewMoldIdentificationFields()
    fireEvent.click(screen.getByRole('button', { name: '确认保存档案' }))
    await waitFor(() =>
      expect(libraryMocks.toastError).toHaveBeenCalledWith('模具主库保存失败')
    )
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText('M-2024-XXX')).toHaveValue('SN-NEW')
    fireEvent.click(screen.getByRole('button', { name: '确认保存档案' }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(onConfirm).toHaveBeenCalledTimes(2)
  })

  it('产品分组选用入口要求填写分组名称', async () => {
    libraryMocks.getGroupNames.mockResolvedValue([])
    const onConfirm = vi.fn()
    renderMoldMasterLibraryInteraction(
      <MoldActionDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        requireGroupName
      />
    )
    fillNewMoldIdentificationFields()
    fireEvent.click(screen.getByRole('button', { name: '确认保存档案' }))
    expect(
      await screen.findByText('请填写或选择分组名称，才能从产品中选用。')
    ).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('普通模具建档仍可不填写分组', async () => {
    libraryMocks.getGroupNames.mockResolvedValue([])
    const onConfirm = vi.fn()
    renderMoldMasterLibraryInteraction(
      <MoldActionDialog open onOpenChange={vi.fn()} onConfirm={onConfirm} />
    )
    fillNewMoldIdentificationFields()
    fireEvent.click(screen.getByRole('button', { name: '确认保存档案' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalled())
    expect(onConfirm.mock.calls[0][0].groupName).toBe('')
  })

  it('组名目录迟到时保留手填新组名，不切换到看不到草稿的下拉框', async () => {
    let resolveGroupNames!: (names: string[]) => void
    libraryMocks.getGroupNames.mockImplementationOnce(
      () => new Promise<string[]>((resolve) => (resolveGroupNames = resolve))
    )
    const onConfirm = vi.fn()
    renderMoldMasterLibraryInteraction(
      <MoldActionDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        requireGroupName
      />
    )
    fillNewMoldIdentificationFields()
    fireEvent.change(screen.getByPlaceholderText('请输入新分组名称...'), {
      target: { value: '手填的新分组' },
    })
    await act(async () => resolveGroupNames(['原分组']))
    await screen.findByRole('button', { name: '选择器' })
    expect(screen.getByPlaceholderText('请输入新分组名称...')).toHaveValue(
      '手填的新分组'
    )
    fireEvent.click(screen.getByRole('button', { name: '确认保存档案' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalled())
    expect(onConfirm.mock.calls[0][0].groupName).toBe('手填的新分组')
  })

  it('组名读取失败明确提示，重试不丢失已经填写的组名', async () => {
    libraryMocks.getGroupNames
      .mockRejectedValueOnce(new Error('模具组名读取失败'))
      .mockResolvedValueOnce(['原分组'])
    renderMoldMasterLibraryInteraction(
      <MoldActionDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        requireGroupName
      />
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '已有模具分组读取失败'
    )
    fireEvent.change(screen.getByPlaceholderText('请输入新分组名称...'), {
      target: { value: '重试前填写的组名' },
    })
    fireEvent.click(screen.getByRole('button', { name: '重新读取分组' }))
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    )
    expect(screen.getByPlaceholderText('请输入新分组名称...')).toHaveValue(
      '重试前填写的组名'
    )
  })

  it('编辑当前模具时组名暂未出现在目录中，仍显示实际已保存组名', async () => {
    libraryMocks.getGroupNames.mockResolvedValue(['原分组'])
    const queryClient = renderMoldMasterLibraryInteraction(
      <MoldActionDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        editData={createMoldDraft({
          id: 'existing-mold',
          sn: 'SN-EXISTING',
          name: '已有模具',
          groupName: '尚未进入目录的分组',
        })}
      />
    )
    await waitFor(() =>
      expect(
        queryClient.getQueryState(MOLD_GROUP_NAMES_QUERY_KEY)?.status
      ).toBe('success')
    )
    expect(screen.getByPlaceholderText('请输入新分组名称...')).toHaveValue(
      '尚未进入目录的分组'
    )
  })

  it('没有模具管理权限仍可选择已有分组，新增入口禁用', async () => {
    libraryMocks.canManage = false
    renderMoldMasterLibraryInteraction(
      <MoldMasterLibraryGroupSelectionDialog
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(await screen.findByRole('radio')).toBeEnabled()
    expect(
      screen.getByRole('button', { name: '新增模具 / 分组' })
    ).toBeDisabled()
  })
})
