// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductionMBOMBranchProcessConfigurationPage } from './production-mbom-branch-process-configuration-page'

const testState = vi.hoisted(() => ({
  getBranches: vi.fn(),
  replaceSelection: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === 'productionArchitecture.branchProcesses.selectedCount') {
        return `已选 ${params?.count ?? 0} 项`
      }
      const translations: Record<string, string> = {
        'productionArchitecture.branchProcesses.title': 'MBOM 分支工序',
        'productionArchitecture.branchProcesses.description':
          '为有效分支配置工序。',
        'productionArchitecture.branchProcesses.branchList': '有效 MBOM 分支',
        'productionArchitecture.branchProcesses.searchBranches': '搜索分支',
        'productionArchitecture.branchProcesses.allowedProcesses':
          '允许使用的工序',
        'productionArchitecture.branchProcesses.defaultOrder': '默认工序顺序',
        'productionArchitecture.branchProcesses.noSelectedProcesses':
          '尚未选择工序。',
        'productionArchitecture.branchProcesses.moveUp': '上移',
        'productionArchitecture.branchProcesses.moveDown': '下移',
        'productionArchitecture.branchProcesses.searchProcesses': '搜索工序',
        'productionArchitecture.branchProcesses.noDescription': '暂无说明',
        'productionArchitecture.branchProcesses.save': '保存选配',
        'productionArchitecture.branchProcesses.saving': '正在保存…',
        'productionArchitecture.branchProcesses.saved': '分支工序选配已保存',
        'productionArchitecture.branchProcesses.saveFailed': '保存失败',
        'productionArchitecture.branchProcesses.discard': '放弃更改',
      }
      return translations[key] ?? key
    },
  }),
}))

vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({
    allowsPermission: () => true,
    isChecking: false,
  }),
}))

vi.mock(
  '@/features/production-shared/services/production-routes-service',
  () => ({
    productionRoutesService: {
      getBOMBranches: testState.getBranches,
    },
  })
)

vi.mock(
  '@/features/production-shared/services/production-mbom-branch-process-selection-service',
  () => ({
    productionMBOMBranchProcessSelectionService: {
      replace: testState.replaceSelection,
    },
  })
)

vi.mock('@/features/production-shared/hooks/use-production-resources', () => ({
  useProductionProcessesQuery: () => ({
    data: [
      {
        id: 'process-cut',
        code: 'CUT',
        name: '裁切',
        description: '裁切工序',
        sortOrder: 1,
        isActive: true,
      },
      {
        id: 'process-wrap',
        code: 'WRAP',
        name: '包边',
        description: '包边工序',
        sortOrder: 2,
        isActive: true,
      },
    ],
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const branch = {
  productId: 'product-a',
  productSKU: 'MODEL-A',
  productName: '型号 A',
  productTypeName: '山地车圈',
  bomOwnerType: 'INTERNAL' as const,
  bomOwnerCustomerId: '',
  bomOwnerCustomerName: '',
  bomVersionLevel: 'standard',
  processes: [
    {
      id: 'process-cut',
      code: 'CUT',
      name: '裁切',
      description: '裁切工序',
      sortOrder: 0,
      isActive: true,
    },
  ],
}

function renderBranchProcessConfigurationPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductionMBOMBranchProcessConfigurationPage />
    </QueryClientProvider>
  )
}

describe('MBOM branch process configuration page', () => {
  beforeEach(() => {
    testState.getBranches.mockReset().mockResolvedValue([branch])
    testState.replaceSelection.mockReset().mockResolvedValue(branch.processes)
  })

  afterEach(cleanup)

  it('saves the selected process IDs for the stable MBOM branch', async () => {
    renderBranchProcessConfigurationPage()

    expect(
      await screen.findByRole('button', { name: /分类 · 山地车圈/ })
    ).toBeInTheDocument()
    const wrappingCheckbox = await screen.findByRole('checkbox', {
      name: /包边/,
    })
    fireEvent.click(wrappingCheckbox)
    fireEvent.click(screen.getByRole('button', { name: '保存选配' }))

    await waitFor(() =>
      expect(testState.replaceSelection).toHaveBeenCalledWith({
        productId: 'product-a',
        bomOwnerType: 'INTERNAL',
        bomOwnerCustomerId: '',
        bomVersionLevel: 'standard',
        processStepIds: ['process-cut', 'process-wrap'],
      })
    )
  })

  it('keeps the unsaved selection after a server rejection and allows retry', async () => {
    testState.replaceSelection
      .mockRejectedValueOnce(new Error('分支已发生变化'))
      .mockResolvedValueOnce(branch.processes)
    renderBranchProcessConfigurationPage()

    const wrappingCheckbox = await screen.findByRole('checkbox', {
      name: /包边/,
    })
    fireEvent.click(wrappingCheckbox)
    fireEvent.click(screen.getByRole('button', { name: '保存选配' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('分支已发生变化')
    expect(wrappingCheckbox).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: '保存选配' }))

    await waitFor(() =>
      expect(testState.replaceSelection).toHaveBeenCalledTimes(2)
    )
  })

  it('saves an explicitly reordered default process sequence', async () => {
    testState.getBranches.mockResolvedValue([
      {
        ...branch,
        processes: [
          ...branch.processes,
          {
            id: 'process-wrap',
            code: 'WRAP',
            name: '包边',
            description: '包边工序',
            sortOrder: 1,
            isActive: true,
          },
        ],
      },
    ])
    renderBranchProcessConfigurationPage()

    fireEvent.click(await screen.findByRole('button', { name: '上移 包边' }))
    fireEvent.click(screen.getByRole('button', { name: '保存选配' }))

    await waitFor(() =>
      expect(testState.replaceSelection).toHaveBeenCalledWith({
        productId: 'product-a',
        bomOwnerType: 'INTERNAL',
        bomOwnerCustomerId: '',
        bomVersionLevel: 'standard',
        processStepIds: ['process-wrap', 'process-cut'],
      })
    )
  })
})
