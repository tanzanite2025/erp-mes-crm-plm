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
import { LanguageProvider } from '@/context/language-provider'
import type {
  ProductionRoute,
  ProductionRouteBOMBranch,
  ProductionRouteSalesOrderLineCandidate,
} from '../../data/production-route'
import { ProductionRouteDialog } from './production-route-dialog'

const testState = vi.hoisted(() => ({
  getSalesOrderLineCandidates: vi.fn(),
}))

vi.mock('../../hooks/use-production-resources', () => ({
  useProductionProcessesQuery: () => ({
    data: [
      {
        id: 'process-cut',
        code: 'CUT',
        name: '裁切',
        sortOrder: 1,
        isActive: true,
      },
    ],
  }),
}))

vi.mock('../../services/production-routes-service', () => ({
  productionRoutesService: {
    getSalesOrderLineCandidates: testState.getSalesOrderLineCandidates,
  },
}))

const branch: ProductionRouteBOMBranch = {
  productId: 'product-g24',
  productSKU: 'G24',
  productName: 'G24 产品',
  bomOwnerType: 'INTERNAL',
  bomOwnerCustomerId: '',
  bomOwnerCustomerName: '',
  bomVersionLevel: 'std',
  processes: [
    {
      id: 'process-cut',
      code: 'CUT',
      name: '裁切',
      sortOrder: 1,
      isActive: true,
    },
  ],
}

const candidates: ProductionRouteSalesOrderLineCandidate[] = [
  {
    id: 55,
    salesOrderId: 'order-1',
    salesOrderNo: 'SO-1',
    customerName: '客户一',
    lineNo: 2,
    productId: 'product-g24',
    productModel: 'G24',
    productCode: 'G24',
    specification: '',
    bomOwnerType: 'INTERNAL',
    bomOwnerCustomerId: '',
    bomVersionLevel: 'std',
    productionRouteMode: 'DEFAULT',
    hasProductionRoute: false,
  },
  {
    id: 56,
    salesOrderId: 'order-1',
    salesOrderNo: 'SO-1',
    customerName: '客户一',
    lineNo: 3,
    productId: 'product-g24',
    productModel: 'G24',
    productCode: 'G24',
    specification: '',
    bomOwnerType: 'INTERNAL',
    bomOwnerCustomerId: '',
    bomVersionLevel: 'std',
    productionRouteMode: 'CUSTOM',
    hasProductionRoute: true,
  },
  {
    id: 57,
    salesOrderId: 'order-2',
    salesOrderNo: 'SO-2',
    customerName: '客户二',
    lineNo: 1,
    productId: 'product-g24',
    productModel: 'G24',
    productCode: 'G24',
    specification: '',
    bomOwnerType: 'INTERNAL',
    bomOwnerCustomerId: '',
    bomVersionLevel: 'std',
    productionRouteMode: 'CUSTOM',
    hasProductionRoute: false,
  },
]

afterEach(() => cleanup())

beforeEach(() => {
  testState.getSalesOrderLineCandidates.mockResolvedValue(candidates)
})

describe('ProductionRouteDialog', () => {
  it('shows branch defaults and saves a redefined order-line route', async () => {
    const onSave = vi
      .fn<(route: ProductionRoute) => Promise<void>>()
      .mockResolvedValue()
    const onRestoreBranchDefault = vi
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider defaultLocale='zh-CN'>
          <ProductionRouteDialog
            open
            route={null}
            bomBranches={[branch]}
            bomBranchesLoading={false}
            onOpenChange={vi.fn()}
            onSave={onSave}
            onRestoreBranchDefault={onRestoreBranchDefault}
          />
        </LanguageProvider>
      </QueryClientProvider>
    )

    expect(screen.getByText('销售订单明细')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: '路线名称' })).toBeNull()
    const orderLineSelect = screen.getByRole('combobox')
    await waitFor(() =>
      expect(orderLineSelect.hasAttribute('disabled')).toBe(false)
    )
    fireEvent.keyDown(orderLineSelect, { key: 'ArrowDown' })
    const availableOrderLine = await screen.findByRole('option', {
      name: 'SO-1 · 明细 2 · G24',
    })
    expect(
      screen.getByRole('option', { name: 'SO-2 · 明细 1 · G24' })
    ).toBeTruthy()
    expect(
      screen.queryByRole('option', { name: 'SO-1 · 明细 3 · G24' })
    ).toBeNull()
    fireEvent.click(availableOrderLine)

    expect(screen.getByRole('radio', { name: '默认工序' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: '重新定义' })).toBeTruthy()
    expect(screen.getByText('裁切')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: '重新定义' }))
    expect(screen.getByRole('checkbox', { name: '裁切' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '新增步骤' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '保存自定义工序' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'SO-LINE-55',
        name: 'SO-1 · 明细 2 · 自定义工序路线',
        salesOrderLineId: 55,
        scopeType: 'SALES_ORDER_LINE',
        productId: 'product-g24',
      })
    )
    expect(onRestoreBranchDefault).not.toHaveBeenCalled()
  })

  it('restores the selected order line to its branch default operations', async () => {
    const onSave = vi.fn<(route: ProductionRoute) => Promise<void>>()
    const onRestoreBranchDefault = vi
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider defaultLocale='zh-CN'>
          <ProductionRouteDialog
            open
            route={null}
            bomBranches={[branch]}
            bomBranchesLoading={false}
            onOpenChange={vi.fn()}
            onSave={onSave}
            onRestoreBranchDefault={onRestoreBranchDefault}
          />
        </LanguageProvider>
      </QueryClientProvider>
    )

    const orderLineSelect = screen.getByRole('combobox')
    await waitFor(() =>
      expect(orderLineSelect.hasAttribute('disabled')).toBe(false)
    )
    fireEvent.keyDown(orderLineSelect, { key: 'ArrowDown' })
    fireEvent.click(
      await screen.findByRole('option', { name: 'SO-1 · 明细 2 · G24' })
    )
    fireEvent.click(screen.getByRole('button', { name: '保存默认工序' }))

    await waitFor(() => expect(onRestoreBranchDefault).toHaveBeenCalledWith(55))
    expect(onSave).not.toHaveBeenCalled()
  })
})
