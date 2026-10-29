// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import type {
  MoldGroupMasterRecord,
  MoldGroupMasterWriteInput,
} from '../data/mold-group-master-schema'
import { createMoldDraft, type Mold } from '../data/schema'
import { MoldActionDialog } from './mold-action-dialog'
import { MoldGroupMasterEditorDialog } from './mold-group-master-editor-dialog'
import { MoldGroupMasterLibrarySelectionDialog } from './mold-group-master-library-selection-dialog'
import { MoldGroupMasterManagementDialog } from './mold-group-master-management-dialog'

const directoryMocks = vi.hoisted(() => ({
  getDirectory: vi.fn(),
  saveGroup: vi.fn(),
  deleteGroup: vi.fn(),
  getSelectionOptions: vi.fn(),
  isSnDuplicate: vi.fn(),
  createMold: vi.fn(),
  toastError: vi.fn(),
  canManage: true,
}))
vi.mock('../services/mold-group-master-service', () => ({
  MoldGroupMasterService: {
    getMoldGroupDirectory: directoryMocks.getDirectory,
    saveMoldGroup: directoryMocks.saveGroup,
    deleteMoldGroup: directoryMocks.deleteGroup,
  },
}))
vi.mock('../services/mold-core-service', () => ({
  MoldCoreService: {
    getMoldMasterLibrarySelectionOptions: directoryMocks.getSelectionOptions,
    isSnDuplicate: directoryMocks.isSnDuplicate,
  },
}))
vi.mock('../services/mold-transaction-service', () => ({
  MoldTransactionService: { createMold: directoryMocks.createMold },
}))
vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionBoundary: () => ({ isAllowed: directoryMocks.canManage }),
  usePermissionActions: () => ({
    allowsAction: () => directoryMocks.canManage,
  }),
}))
vi.mock('sonner', () => ({
  toast: { error: directoryMocks.toastError, success: vi.fn() },
}))
vi.mock('./image-upload', () => ({ ImageUpload: () => null }))
vi.mock('../services/asset-service', () => ({
  AssetService: { previewHealthScore: () => 100 },
}))
vi.mock('../services/drawing-service', () => ({
  DrawingService: { getDrawingsByMold: vi.fn(async () => []) },
}))

const originalGroupId = '60b7446e-55f7-4c02-b287-c20d60a01001'
const newGroupId = '60b7446e-55f7-4c02-b287-c20d60a01002'
let masterGroups: MoldGroupMasterRecord[]
let masterMolds: Mold[]
const queryClients: QueryClient[] = []

function renderMoldGroupMasterInteraction(children: ReactNode) {
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
  vi.resetAllMocks()
  directoryMocks.canManage = true
  masterGroups = [
    {
      id: originalGroupId,
      name: '原分组',
      description: '统一分组',
      active: true,
      version: 1,
      moldCount: 1,
      productCount: 1,
    },
  ]
  masterMolds = [
    createMoldDraft({
      id: 'original-mold',
      sn: 'SN-OLD',
      name: '已有模具',
      groupId: originalGroupId,
      groupName: '原分组',
    }),
  ]
  directoryMocks.getDirectory.mockImplementation(async () => [...masterGroups])
  directoryMocks.getSelectionOptions.mockImplementation(async () => [
    ...masterMolds,
  ])
  directoryMocks.isSnDuplicate.mockResolvedValue(false)
  directoryMocks.saveGroup.mockImplementation(
    async (input: MoldGroupMasterWriteInput, groupId?: string) => {
      const previous = masterGroups.find((group) => group.id === groupId)
      const saved = {
        ...previous,
        ...input,
        id: groupId ?? newGroupId,
        version: (previous?.version ?? 0) + 1,
        moldCount: previous?.moldCount ?? 0,
        productCount: previous?.productCount ?? 0,
      }
      masterGroups = [
        ...masterGroups.filter((group) => group.id !== saved.id),
        saved,
      ]
      return saved
    }
  )
  directoryMocks.deleteGroup.mockImplementation(
    async (record: MoldGroupMasterRecord) => {
      masterGroups = masterGroups.filter((group) => group.id !== record.id)
    }
  )
  directoryMocks.createMold.mockImplementation(async (draft: Mold) => {
    const saved = {
      ...draft,
      id: 'saved-mold',
      groupName:
        masterGroups.find((group) => group.id === draft.groupId)?.name ?? '',
    }
    masterMolds.push(saved)
    return saved
  })
})

afterEach(() => {
  cleanup()
  queryClients.splice(0).forEach((client) => client.clear())
})

describe('模具分组主档管理和稳定引用', () => {
  it('产品选用以分组 ID 回写，选中或取消都不会提前修改产品', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    renderMoldGroupMasterInteraction(
      <MoldGroupMasterLibrarySelectionDialog
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
    await waitFor(() =>
      expect(onSelect).toHaveBeenCalledWith(originalGroupId, '原分组')
    )
  })

  it('选用前分组改名时使用同一 ID 和最新名称', async () => {
    const onSelect = vi.fn()
    renderMoldGroupMasterInteraction(
      <MoldGroupMasterLibrarySelectionDialog
        value={originalGroupId}
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    )
    await screen.findByRole('radio')
    masterGroups[0] = { ...masterGroups[0], name: '改名后的分组', version: 2 }
    fireEvent.click(screen.getByRole('button', { name: '确认选用此分组' }))
    await waitFor(() =>
      expect(onSelect).toHaveBeenCalledWith(originalGroupId, '改名后的分组')
    )
  })

  it('选用前分组停用时拒绝回写产品', async () => {
    const onSelect = vi.fn()
    renderMoldGroupMasterInteraction(
      <MoldGroupMasterLibrarySelectionDialog
        value={originalGroupId}
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    )
    await screen.findByRole('radio')
    masterGroups[0] = { ...masterGroups[0], active: false }
    fireEvent.click(screen.getByRole('button', { name: '确认选用此分组' }))
    await waitFor(() =>
      expect(directoryMocks.toastError).toHaveBeenCalledWith(
        expect.stringContaining('已停用或删除')
      )
    )
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('无模具的独立分组也能查看和选用', async () => {
    masterMolds = []
    const onSelect = vi.fn()
    renderMoldGroupMasterInteraction(
      <MoldGroupMasterLibrarySelectionDialog
        value={originalGroupId}
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    )
    expect(await screen.findByText('暂未录入模具')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '确认选用此分组' }))
    await waitFor(() =>
      expect(onSelect).toHaveBeenCalledWith(originalGroupId, '原分组')
    )
  })

  it('单独新建分组不要求创建模具，取消选用仍保留新分组', async () => {
    const onSelect = vi.fn()
    renderMoldGroupMasterInteraction(
      <MoldGroupMasterLibrarySelectionDialog
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    )
    await screen.findByRole('radio')
    fireEvent.click(screen.getByRole('button', { name: '新建分组' }))
    fireEvent.change(screen.getByLabelText('分组名称'), {
      target: { value: '独立新分组' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存分组' }))
    await screen.findByText('独立新分组')
    expect(masterGroups).toHaveLength(2)
    expect(masterMolds).toHaveLength(1)
    expect(directoryMocks.createMold).not.toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(masterGroups[1].name).toBe('独立新分组')
  })

  it('资产分组使用选择器，新建分组后自动选中并随模具按 ID 保存', async () => {
    const onConfirm = vi.fn()
    renderMoldGroupMasterInteraction(
      <MoldActionDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        requireGroupSelection
      />
    )
    fillNewMoldIdentificationFields()
    expect(
      screen.queryByPlaceholderText('请输入新分组名称...')
    ).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: '新建分组' }))
    fireEvent.change(screen.getByLabelText('分组名称'), {
      target: { value: '资产所属组' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存分组' }))
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: '保存分组' })
      ).not.toBeInTheDocument()
    )
    expect(screen.getByPlaceholderText('M-2024-XXX')).toHaveValue('SN-NEW')
    expect(screen.getByRole('combobox')).toHaveTextContent('资产所属组')
    expect(onConfirm).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '确认保存档案' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalled())
    expect(onConfirm.mock.calls[0][0]).toMatchObject({
      groupId: newGroupId,
      sn: 'SN-NEW',
    })
  })

  it('模具保存失败保留输入，重试成功后才关闭', async () => {
    const onConfirm = vi
      .fn()
      .mockRejectedValueOnce(new Error('模具主库保存失败'))
      .mockResolvedValueOnce(undefined)
    const onOpenChange = vi.fn()
    renderMoldGroupMasterInteraction(
      <MoldActionDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        initialGroupId={originalGroupId}
        requireGroupSelection
      />
    )
    fillNewMoldIdentificationFields()
    fireEvent.click(screen.getByRole('button', { name: '确认保存档案' }))
    await waitFor(() =>
      expect(directoryMocks.toastError).toHaveBeenCalledWith('模具主库保存失败')
    )
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText('M-2024-XXX')).toHaveValue('SN-NEW')
    fireEvent.click(screen.getByRole('button', { name: '确认保存档案' }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('从产品新增模具时要求选择已有分组', async () => {
    const onConfirm = vi.fn()
    renderMoldGroupMasterInteraction(
      <MoldActionDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        requireGroupSelection
      />
    )
    fillNewMoldIdentificationFields()
    fireEvent.click(screen.getByRole('button', { name: '确认保存档案' }))
    expect(
      await screen.findByText('请选择所属分组，才能从产品中选用。')
    ).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('分组保存冲突保留输入，重试成功后才关闭编辑器', async () => {
    directoryMocks.saveGroup.mockRejectedValueOnce(
      new Error('该模具分组名称已存在')
    )
    const onClose = vi.fn()
    renderMoldGroupMasterInteraction(
      <MoldGroupMasterEditorDialog onClose={onClose} />
    )
    fireEvent.change(screen.getByLabelText('分组名称'), {
      target: { value: '输入的组名' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存分组' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('名称已存在')
    expect(screen.getByLabelText('分组名称')).toHaveValue('输入的组名')
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '保存分组' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('管理界面展示引用数量，已有引用时禁用删除并允许停用', async () => {
    renderMoldGroupMasterInteraction(
      <MoldGroupMasterManagementDialog onClose={vi.fn()} />
    )
    expect(
      await screen.findByText('1 副模具 · 1 个产品引用')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除分组' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '停用分组' }))
    await screen.findByRole('button', { name: '启用分组' })
    expect(directoryMocks.saveGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        id: originalGroupId,
        active: false,
        version: 1,
      }),
      originalGroupId
    )
  })

  it('空分组删除需要明确确认并带版本号，删除后刷新目录', async () => {
    masterGroups[0] = { ...masterGroups[0], moldCount: 0, productCount: 0 }
    renderMoldGroupMasterInteraction(
      <MoldGroupMasterManagementDialog onClose={vi.fn()} />
    )
    fireEvent.click(await screen.findByRole('button', { name: '删除分组' }))
    expect(directoryMocks.deleteGroup).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '确认删除分组' }))
    await waitFor(() =>
      expect(screen.queryByText('原分组')).not.toBeInTheDocument()
    )
    expect(directoryMocks.deleteGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id: originalGroupId, version: 1 })
    )
  })

  it('分组读取失败提供重试，保留资产已填写内容', async () => {
    directoryMocks.getDirectory.mockRejectedValueOnce(new Error('目录不可用'))
    renderMoldGroupMasterInteraction(
      <MoldActionDialog open onOpenChange={vi.fn()} onConfirm={vi.fn()} />
    )
    fillNewMoldIdentificationFields()
    expect(await screen.findByRole('alert')).toHaveTextContent('分组读取失败')
    fireEvent.click(screen.getByRole('button', { name: '重新读取分组' }))
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    )
    expect(screen.getByPlaceholderText('M-2024-XXX')).toHaveValue('SN-NEW')
  })

  it('没有模具管理权限仍可选择分组，新建和管理写入操作禁用', async () => {
    directoryMocks.canManage = false
    renderMoldGroupMasterInteraction(
      <MoldGroupMasterLibrarySelectionDialog
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(await screen.findByRole('radio')).toBeEnabled()
    expect(screen.getByRole('button', { name: '新建分组' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '新增模具' })).toBeDisabled()
  })

  it('停用分组保留名称可见，禁止在产品中重新选用', async () => {
    masterGroups[0] = { ...masterGroups[0], active: false }
    renderMoldGroupMasterInteraction(
      <MoldGroupMasterLibrarySelectionDialog
        value={originalGroupId}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(await screen.findByRole('radio')).toBeDisabled()
    expect(
      screen.getByRole('button', { name: '确认选用此分组' })
    ).toBeDisabled()
    expect(
      within(screen.getByRole('list')).getByText('原分组（已停用）')
    ).toBeInTheDocument()
  })
})
