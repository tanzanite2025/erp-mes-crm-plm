// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { ProductionMaterialRequirementBomBasisReview } from '@/features/production-material-requirements/components/production-material-requirement-bom-basis-review'
import type { ProductionMaterialRequirementSourceLine } from '@/features/production-material-requirements/contracts/production-material-requirement-source-bom-and-contribution-api-dto'
import { PartRequirements } from '../../pages/part-requirements'
import { RequirementDrawer } from './requirement-drawer'

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: { user: null }) => unknown) =>
    select({ user: null }),
}))
vi.mock('../../hooks/use-requirements', () => ({
  useRequirements: () => ({
    activeOrders: [],
    requirements: [],
    sourceLines: [],
    bomSelections: [],
    isComplete: false,
    error: new Error('Incomplete order scope from pagination'),
    ordersError: new Error('Incomplete order scope from pagination'),
    isLoading: false,
    isLoadingOrders: false,
    stats: { analyzedModels: [] },
    calculate: vi.fn(),
    setBomSelection: vi.fn(),
    recalculate: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('./mold-requirement-alert', () => ({
  MoldRequirementAlert: () => null,
}))
vi.mock('./requirement-list', () => ({
  RequirementList: () => <div>Verified requirement list</div>,
}))
vi.mock('../../services/requirement-export-service', () => ({
  RequirementExportService: { exportToExcel: vi.fn() },
}))

afterEach(cleanup)

function createProductionRequirementSourceWithTwoPerformanceVariants(): ProductionMaterialRequirementSourceLine {
  const candidate = {
    id: 'bom-standard',
    bomNo: 'MBOM-1',
    version: 3,
    revisionNo: 'A',
    bomVersion: 'V1',
    versionLevel: 'std',
    versionLevelLabelZh: '标准版',
    versionLevelLabelEn: 'Standard',
    ownerType: 'INTERNAL',
    ownerCustomerId: '',
    measuredWeight: 480,
    measuredWeightUnit: 'g',
  }
  return {
    salesOrderId: 'order-stable-identity',
    salesOrderLineId: 12,
    orderVersion: 7,
    orderNo: 'SO-2026-01',
    lineNo: 1,
    totalLines: 2,
    customerId: 'customer-1',
    customerName: '客户',
    productId: 'product-1',
    productName: 'R50',
    productModel: 'R50',
    finishedQty: 100,
    bom: null,
    bomCandidates: [
      candidate,
      {
        ...candidate,
        id: 'bom-light',
        bomNo: 'MBOM-2',
        versionLevel: 'ultralight',
        versionLevelLabelZh: '超轻版',
        versionLevelLabelEn: 'Ultralight',
        measuredWeight: 420,
      },
    ],
    contributions: [],
    issueCode: 'BOM_SELECTION_REQUIRED',
  }
}

describe('production requirement source verification', () => {
  it('shows a failed order scope on the page before the analysis drawer is opened', () => {
    render(
      <LanguageProvider
        defaultLocale='zh-CN'
        storageKey='requirement-order-failure-test'
      >
        <PartRequirements />
      </LanguageProvider>
    )
    expect(screen.getByText('订单范围加载失败')).toBeInTheDocument()
    expect(
      screen.getByText('Incomplete order scope from pagination')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重新加载订单' })).toBeEnabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('shows variant weights together and submits the stable order-line identity when choosing a BOM', () => {
    const onSelectionChange = vi.fn()
    const onRecalculate = vi.fn()
    render(
      <LanguageProvider
        defaultLocale='zh-CN'
        storageKey='requirement-bom-choice-test'
      >
        <ProductionMaterialRequirementBomBasisReview
          sourceLines={[
            createProductionRequirementSourceWithTwoPerformanceVariants(),
          ]}
          selections={[]}
          isComplete={false}
          isLoading={false}
          onSelectionChange={onSelectionChange}
          onRecalculate={onRecalculate}
        />
      </LanguageProvider>
    )
    expect(
      screen.getByRole('option', { name: /标准版.*480 g/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: /超轻版.*420 g/ })
    ).toBeInTheDocument()
    expect(screen.getByText(/生产物料仓库/)).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'bom-light' },
    })
    expect(onSelectionChange).toHaveBeenCalledWith({
      salesOrderId: 'order-stable-identity',
      salesOrderLineId: 12,
      bomId: 'bom-light',
    })
    expect(onRecalculate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '按当前选择重新分析' }))
    expect(onRecalculate).toHaveBeenCalledOnce()
  })

  it('shows the automatically adopted unique BOM and its weight in English', () => {
    const source = createProductionRequirementSourceWithTwoPerformanceVariants()
    source.bom = source.bomCandidates[0]
    source.bomCandidates = [source.bom]
    source.issueCode = ''
    render(
      <LanguageProvider
        defaultLocale='en-US'
        storageKey='requirement-bom-choice-test-english'
      >
        <ProductionMaterialRequirementBomBasisReview
          sourceLines={[source]}
          selections={[]}
          isComplete
          isLoading={false}
          onSelectionChange={vi.fn()}
          onRecalculate={vi.fn()}
        />
      </LanguageProvider>
    )
    fireEvent.click(screen.getByText('Review recipe bases for 1 order lines'))
    expect(screen.getByText(/MBOM-1.*480 g/)).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('mrp.requirements.')
  })

  it('blocks print and export while a source is incomplete and enables them only after complete analysis', () => {
    const source = createProductionRequirementSourceWithTwoPerformanceVariants()
    const props = {
      isOpen: true,
      onClose: vi.fn(),
      data: [],
      stats: { analyzedModels: [] },
      isLoading: false,
      selectedCount: 1,
      sourceLines: [source],
      bomSelections: [],
      isComplete: false,
      onBomSelectionChange: vi.fn(),
      onRecalculate: vi.fn(),
    }
    const { rerender } = render(
      <LanguageProvider
        defaultLocale='zh-CN'
        storageKey='requirement-export-test'
      >
        <RequirementDrawer {...props} />
      </LanguageProvider>
    )
    expect(screen.getByRole('button', { name: '打印清单' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '导出 Excel' })).toBeDisabled()
    expect(
      screen.queryByText('Verified requirement list')
    ).not.toBeInTheDocument()
    rerender(
      <LanguageProvider
        defaultLocale='zh-CN'
        storageKey='requirement-export-test'
      >
        <RequirementDrawer {...props} isComplete />
      </LanguageProvider>
    )
    expect(screen.getByRole('button', { name: '打印清单' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '导出 Excel' })).toBeEnabled()
  })
})
