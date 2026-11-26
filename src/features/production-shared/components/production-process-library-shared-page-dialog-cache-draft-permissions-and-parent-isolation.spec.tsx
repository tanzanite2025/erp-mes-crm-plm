// @vitest-environment jsdom
import { useState } from 'react'
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
import { ProductionProcessLibraryConfigurationPage } from '@/features/production-architecture/pages/production-process-library-configuration-page'
import type { ProductionProcessStep } from '../data/production-process'
import { ProductionProcessLibraryConfigurationContent } from './production-process-library-configuration-content'
import { ProductionProcessLibraryConfigurationDialog } from './production-process-library-configuration-dialog'

const processLibraryTest = vi.hoisted(() => ({
  canRead: true,
  canManage: true,
  getSteps: vi.fn(),
  saveStep: vi.fn(),
  deleteStep: vi.fn(),
  confirmDiscard: vi.fn(),
  notifyUpdated: vi.fn(),
}))
vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({
    isChecking: false,
    allowsPermission: (permission: string) =>
      permission === 'menu_prod_config'
        ? processLibraryTest.canRead
        : processLibraryTest.canManage,
  }),
}))
vi.mock('@/lib/application-confirm-prompt-and-alert-dialog-requests', () => ({
  requestApplicationConfirmation: processLibraryTest.confirmDiscard,
}))
vi.mock('@/lib/safe-catch', () => ({ failLoudly: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/components/forbidden-state', () => ({
  ForbiddenState: () => <p>禁止访问工序库</p>,
}))
vi.mock('../services/production-processes-service', () => ({
  productionProcessesService: {
    getSteps: processLibraryTest.getSteps,
    saveStep: processLibraryTest.saveStep,
    deleteStep: processLibraryTest.deleteStep,
  },
}))
vi.mock('../services/production-resource-sync', () => ({
  productionResourceSync: {
    emitProcessesUpdated: processLibraryTest.notifyUpdated,
  },
}))

const drillingProcess: ProductionProcessStep = {
  id: 'library-drilling',
  code: 'DRILL',
  name: '钻孔',
  description: '工序库原始说明',
  sortOrder: 1,
  isActive: true,
}
const processLibraryQueryClients: QueryClient[] = []

function renderProductionProcessLibraryTestContent(content: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
  processLibraryQueryClients.push(client)
  return {
    ...render(
      <LanguageProvider defaultLocale='zh-CN'>
        <QueryClientProvider client={client}>{content}</QueryClientProvider>
      </LanguageProvider>
    ),
    client,
  }
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class ProductionProcessLibraryTestResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  processLibraryTest.canRead = true
  processLibraryTest.canManage = true
  processLibraryTest.getSteps.mockResolvedValue([
    structuredClone(drillingProcess),
  ])
  processLibraryTest.confirmDiscard.mockResolvedValue(true)
})

afterEach(() => {
  cleanup()
  processLibraryQueryClients.splice(0).forEach((client) => client.clear())
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

describe('shared production process library configuration', () => {
  it('uses the same confirmed cache for dialog and page and returns the saved server object', async () => {
    const savedProcess = {
      ...drillingProcess,
      name: '钻孔新名称',
      updatedAt: '2026-11-19T00:00:00Z',
    }
    processLibraryTest.saveStep.mockResolvedValue(savedProcess)
    const onSaved = vi.fn()
    function ProductionProcessLibraryPageAndDialogHarness() {
      const [open, setOpen] = useState(true)
      return (
        <>
          <ProductionProcessLibraryConfigurationPage />
          <ProductionProcessLibraryConfigurationDialog
            open={open}
            onOpenChange={setOpen}
            onProcessSaved={onSaved}
          />
        </>
      )
    }
    renderProductionProcessLibraryTestContent(
      <ProductionProcessLibraryPageAndDialogHarness />
    )
    const dialog = screen.getByRole('dialog')
    fireEvent.click(
      await within(dialog).findByRole('button', { name: '编辑工序：钻孔' })
    )
    fireEvent.change(
      within(dialog).getByRole('textbox', { name: '工序名称' }),
      { target: { value: '钻孔新名称' } }
    )
    fireEvent.click(within(dialog).getByRole('button', { name: '保存工序' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(savedProcess))
    fireEvent.click(within(dialog).getByRole('button', { name: '关闭工序库' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('heading', { name: '钻孔新名称' })).toBeTruthy()
    expect(processLibraryTest.getSteps).toHaveBeenCalledTimes(1)
    expect(processLibraryTest.notifyUpdated).toHaveBeenCalledWith({
      invalidate: false,
    })
  })

  it('keeps a failed draft and blocks duplicate saves and closing while retry is pending', async () => {
    processLibraryTest.saveStep.mockRejectedValueOnce(
      new Error('工序编码冲突，请修改编码')
    )
    const onClose = vi.fn()
    renderProductionProcessLibraryTestContent(
      <ProductionProcessLibraryConfigurationDialog
        open
        onOpenChange={onClose}
      />
    )
    fireEvent.click(
      await screen.findByRole('button', { name: '编辑工序：钻孔' })
    )
    fireEvent.change(screen.getByRole('textbox', { name: '工序说明' }), {
      target: { value: '需要保留的草稿说明' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存工序' }))
    expect((await screen.findByRole('alert')).textContent).toContain(
      '工序编码冲突'
    )
    expect(
      (screen.getByRole('textbox', { name: '工序说明' }) as HTMLTextAreaElement)
        .value
    ).toBe('需要保留的草稿说明')
    let completeRetry!: (process: ProductionProcessStep) => void
    processLibraryTest.saveStep.mockImplementationOnce(
      () =>
        new Promise<ProductionProcessStep>((resolve) => {
          completeRetry = resolve
        })
    )
    fireEvent.click(screen.getByRole('button', { name: '保存工序' }))
    const pendingSave = screen.getByRole('button', { name: '正在保存…' })
    expect(pendingSave).toBeDisabled()
    fireEvent.click(pendingSave)
    fireEvent.click(screen.getByRole('button', { name: '关闭工序库' }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(processLibraryTest.saveStep).toHaveBeenCalledTimes(2)
    completeRetry({ ...drillingProcess, description: '需要保留的草稿说明' })
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: '工序说明' })).toBeNull()
    )
    fireEvent.click(screen.getByRole('button', { name: '关闭工序库' }))
    expect(onClose).toHaveBeenCalledWith(false)
  })

  it('requires an explicit discard before closing dirty content', async () => {
    processLibraryTest.confirmDiscard
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    const onClose = vi.fn()
    renderProductionProcessLibraryTestContent(
      <ProductionProcessLibraryConfigurationDialog
        open
        onOpenChange={onClose}
      />
    )
    fireEvent.click(
      await screen.findByRole('button', { name: '编辑工序：钻孔' })
    )
    fireEvent.change(screen.getByRole('textbox', { name: '工序名称' }), {
      target: { value: '未保存工序名称' },
    })
    fireEvent.click(screen.getByRole('button', { name: '关闭工序库' }))
    await waitFor(() =>
      expect(processLibraryTest.confirmDiscard).toHaveBeenCalledTimes(1)
    )
    expect(onClose).not.toHaveBeenCalled()
    expect(
      (screen.getByRole('textbox', { name: '工序名称' }) as HTMLInputElement)
        .value
    ).toBe('未保存工序名称')
    fireEvent.click(screen.getByRole('button', { name: '关闭工序库' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(false))
    expect(processLibraryTest.saveStep).not.toHaveBeenCalled()
  })

  it('shows loading failure and allows retry without pretending the list is empty', async () => {
    processLibraryTest.getSteps
      .mockRejectedValueOnce(new Error('工序读取暂不可用'))
      .mockResolvedValueOnce([drillingProcess])
    renderProductionProcessLibraryTestContent(
      <ProductionProcessLibraryConfigurationContent />
    )
    expect((await screen.findByRole('alert')).textContent).toContain(
      '工序读取暂不可用'
    )
    expect(screen.queryByText('暂无工序，请先新增工序。')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '重新读取工序' }))
    expect(await screen.findByRole('heading', { name: '钻孔' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('hides writes for read-only access and never requests data without production read permission', async () => {
    processLibraryTest.canManage = false
    const view = renderProductionProcessLibraryTestContent(
      <ProductionProcessLibraryConfigurationContent />
    )
    expect(await screen.findByRole('heading', { name: '钻孔' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '新增工序' })).toBeNull()
    expect(screen.queryByRole('button', { name: '编辑工序：钻孔' })).toBeNull()
    view.unmount()
    processLibraryTest.canRead = false
    processLibraryTest.getSteps.mockClear()
    renderProductionProcessLibraryTestContent(
      <ProductionProcessLibraryConfigurationContent />
    )
    expect(processLibraryTest.getSteps).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: '钻孔' })).toBeNull()
  })
})
