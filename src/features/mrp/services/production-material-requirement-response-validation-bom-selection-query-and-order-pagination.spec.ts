import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import type { SalesOrder } from '@/features/trading/data/schema'
import { getSalesOrders } from '@/features/trading/sales'
import { productionMaterialRequirementAnalysisResponseSchema } from '../contracts/production-material-requirement-analysis-api-dto'
import { loadAllActiveSalesOrdersForProductionMaterialRequirementSelection } from './production-material-requirement-order-selection-service'
import { RequirementCoreService } from './requirement-core-service'

vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))
vi.mock('@/features/trading/sales', () => ({ getSalesOrders: vi.fn() }))
beforeEach(() => {
  vi.resetAllMocks()
})

function createEmptyProductionRequirementAnalysisResponse() {
  return {
    requirements: [],
    sourceLines: [],
    isComplete: false,
    warehouseCategoryCode: 'MATERIAL',
    stats: {
      totalMaterials: 0,
      missingBOMCount: 0,
      activeOrderCount: 0,
      analyzedModels: [],
    },
  }
}

describe('production requirement API boundary', () => {
  it('encodes explicit BOM choices with stable identities and validates the response', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      createEmptyProductionRequirementAnalysisResponse()
    )
    const selections = [
      { salesOrderId: 'order-1', salesOrderLineId: 12, bomId: 'bom-light' },
    ]
    await RequirementCoreService.getMrpRequirements(
      ['SO-2026-01-1'],
      selections
    )
    const query = new URL(
      String(vi.mocked(apiFetch).mock.calls[0][0]),
      'https://example.test'
    ).searchParams
    expect(query.get('selectedKeys')).toBe('SO-2026-01-1')
    expect(JSON.parse(query.get('bomSelections')!)).toEqual(selections)
    vi.mocked(apiFetch).mockResolvedValue({ requirements: [] })
    await expect(RequirementCoreService.getMrpRequirements()).rejects.toThrow()
  })

  it('rejects missing source metadata, other warehouse scopes and nonfinite quantities', () => {
    const response = createEmptyProductionRequirementAnalysisResponse()
    expect(
      productionMaterialRequirementAnalysisResponseSchema.safeParse(response)
        .success
    ).toBe(true)
    expect(
      productionMaterialRequirementAnalysisResponseSchema.safeParse({
        ...response,
        sourceLines: undefined,
      }).success
    ).toBe(false)
    expect(
      productionMaterialRequirementAnalysisResponseSchema.safeParse({
        ...response,
        warehouseCategoryCode: 'RD',
      }).success
    ).toBe(false)
    expect(
      productionMaterialRequirementAnalysisResponseSchema.safeParse({
        ...response,
        stats: {
          ...response.stats,
          analyzedModels: [{ modelName: 'R50', totalQty: Infinity }],
        },
      }).success
    ).toBe(false)
  })
})

describe('complete order pagination for production requirement selection', () => {
  function createOrderPageForSelection(
    start: number,
    count: number,
    total: number
  ) {
    return {
      items: Array.from(
        { length: count },
        (_, index) => ({ id: `order-${start + index}` }) as SalesOrder
      ),
      total,
      page: Math.floor((start - 1) / 200) + 1,
      pageSize: 200,
    }
  }

  it('loads beyond 200 records and includes scheduling orders in every request', async () => {
    vi.mocked(getSalesOrders)
      .mockResolvedValueOnce(createOrderPageForSelection(1, 200, 201))
      .mockResolvedValueOnce(createOrderPageForSelection(201, 1, 201))
    const orders =
      await loadAllActiveSalesOrdersForProductionMaterialRequirementSelection()
    expect(orders).toHaveLength(201)
    expect(orders[orders.length - 1]?.id).toBe('order-201')
    expect(getSalesOrders).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 200,
      withLines: true,
      status: ['Pending', 'Scheduling', 'InProgress'],
    })
  })

  it.each(['duplicate', 'changed_total', 'empty_page'])(
    'rejects an incomplete or changing scope: %s',
    async (scenario) => {
      vi.mocked(getSalesOrders).mockResolvedValueOnce(
        createOrderPageForSelection(1, 200, 201)
      )
      vi.mocked(getSalesOrders).mockResolvedValueOnce(
        createOrderPageForSelection(
          scenario === 'duplicate' ? 1 : 201,
          scenario === 'empty_page' ? 0 : 1,
          scenario === 'changed_total' ? 202 : 201
        )
      )
      await expect(
        loadAllActiveSalesOrdersForProductionMaterialRequirementSelection()
      ).rejects.toThrow('[CRITICAL]')
    }
  )
})
