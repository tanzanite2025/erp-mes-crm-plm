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
    isComplete: false,
    error: new Error('Incomplete order scope from pagination'),
    ordersError: new Error('Incomplete order scope from pagination'),
    isLoading: false,
    isLoadingOrders: false,
    stats: { analyzedModels: [] },
    calculate: vi.fn(),
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

function createProductionRequirementSourceWithDuplicateEffectiveMBOMs(): ProductionMaterialRequirementSourceLine {
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
        id: 'bom-duplicate',
        bomNo: 'MBOM-2',
      },
    ],
    contributions: [],
    issueCode: 'DUPLICATE_EFFECTIVE_MBOM',
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
  it('blocks duplicate effective MBOMs and shows their identities without a selector', () => {
    const onRecalculate = vi.fn()
    render(
      <LanguageProvider
        defaultLocale='zh-CN'
        storageKey='requirement-bom-choice-test'
      >
        <ProductionMaterialRequirementBomBasisReview
          sourceLines={[
            createProductionRequirementSourceWithDuplicateEffectiveMBOMs(),
          ]}
          isComplete={false}
          isLoading={false}
          onRecalculate={onRecalculate}
        />
      </LanguageProvider>
    )
    expect(screen.getByText('MBOM-1 · A / V1')).toBeInTheDocument()
    expect(screen.getByText('MBOM-2 · A / V1')).toBeInTheDocument()
    expect(screen.getByText(/生产物料仓库/)).toBeInTheDocument()
    expect(screen.getByText(/属于数据完整性异常/)).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重新分析' }))
    expect(onRecalculate).toHaveBeenCalledOnce()
  })

  it('shows the automatically adopted unique BOM and its weight in English', () => {
    const source =
      createProductionRequirementSourceWithDuplicateEffectiveMBOMs()
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
          isComplete
          isLoading={false}
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
    const source =
      createProductionRequirementSourceWithDuplicateEffectiveMBOMs()
    const props = {
      isOpen: true,
      onClose: vi.fn(),
      data: [],
      stats: { analyzedModels: [] },
      isLoading: false,
      selectedCount: 1,
      sourceLines: [source],
      isComplete: false,
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
