// @vitest-environment jsdom
import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import type { ProductionRouteBOMBranch } from '@/features/production-shared/data/production-route'
import { productionRoutesService } from '@/features/production-shared/services/production-routes-service'
import { createEmptySalesOrderLine, type SalesOrderLine } from '../data/schema'
import { SalesOrderLineProductionBindingEditor } from './sales-order-line-production-binding-editor'

const productionRoutesServiceMocks = vi.hoisted(() => ({
  getBOMBranches: vi.fn(),
}))

vi.mock(
  '@/features/production-shared/services/production-routes-service',
  () => ({
    productionRoutesService: productionRoutesServiceMocks,
  })
)

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    disabled,
    onValueChange,
    value,
  }: {
    children: ReactNode
    disabled?: boolean
    onValueChange?: (value: string) => void
    value?: string
  }) => (
    <select
      aria-label='有效 MBOM 分支'
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.currentTarget.value)}
      value={value ?? ''}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({
    children,
    disabled,
    value,
  }: {
    children: ReactNode
    disabled?: boolean
    value: string
  }) => (
    <option disabled={disabled} value={value}>
      {children}
    </option>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
}))

const productOneInternalBranch: ProductionRouteBOMBranch = {
  productId: 'product-1',
  productSKU: 'SKU-1',
  productName: '产品一',
  productTypeName: '山地车圈',
  bomOwnerType: 'INTERNAL',
  bomOwnerCustomerId: '',
  bomOwnerCustomerName: '',
  bomVersionLevel: 'standard',
  processes: [],
}

const productOneCustomerBranch: ProductionRouteBOMBranch = {
  ...productOneInternalBranch,
  bomOwnerType: 'CUSTOMER',
  bomOwnerCustomerId: 'customer-1',
  bomOwnerCustomerName: '客户一',
}

const productTwoInternalBranch: ProductionRouteBOMBranch = {
  ...productOneInternalBranch,
  productId: 'product-2',
  productSKU: 'SKU-2',
  productName: '产品二',
}

const queryClients: QueryClient[] = []

function createSelectedSalesOrderLine(): SalesOrderLine {
  return {
    ...createEmptySalesOrderLine(),
    id: 101,
    lineNo: 1,
    productId: 'product-1',
    productModel: '产品一',
    productCode: 'SKU-1',
    bomOwnerType: 'INTERNAL',
    bomOwnerCustomerId: '',
    bomVersionLevel: 'standard',
  }
}

function SalesOrderProductionBindingEditorTestHarness() {
  const [lines, setLines] = useState([createSelectedSalesOrderLine()])
  const updateLine = (
    index: number,
    field: keyof SalesOrderLine,
    value: SalesOrderLine[keyof SalesOrderLine],
    extraData?: Partial<SalesOrderLine>
  ) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value, ...extraData } : line
      )
    )
  }

  return (
    <>
      <SalesOrderLineProductionBindingEditor
        lines={lines}
        onLineChange={updateLine}
      />
      <output aria-label='订单行分支状态'>{JSON.stringify(lines[0])}</output>
    </>
  )
}

describe('sales order production binding editor', () => {
  beforeEach(() => {
    vi.mocked(productionRoutesService.getBOMBranches).mockResolvedValue([
      productOneInternalBranch,
      productOneCustomerBranch,
      productTwoInternalBranch,
    ])
  })

  afterEach(() => {
    cleanup()
    queryClients.splice(0).forEach((queryClient) => queryClient.clear())
  })

  it('only offers the line product branches and persists the exact selected branch identity', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClients.push(queryClient)
    render(
      <LanguageProvider
        defaultLocale='zh-CN'
        storageKey='sales-order-production-binding-test'
      >
        <QueryClientProvider client={queryClient}>
          <SalesOrderProductionBindingEditorTestHarness />
        </QueryClientProvider>
      </LanguageProvider>
    )

    const customerBranch = await screen.findByRole('option', { name: /客户一/ })
    expect(customerBranch).toBeInTheDocument()
    expect(customerBranch).toHaveTextContent(/分类：\s*山地车圈/)
    expect(
      screen.queryByRole('option', { name: /SKU-2/ })
    ).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: (customerBranch as HTMLOptionElement).value },
    })

    expect(screen.getByLabelText('订单行分支状态')).toHaveTextContent(
      '"bomOwnerType":"CUSTOMER"'
    )
    expect(screen.getByLabelText('订单行分支状态')).toHaveTextContent(
      '"bomOwnerCustomerId":"customer-1"'
    )
    expect(screen.getByLabelText('订单行分支状态')).toHaveTextContent(
      '"bomVersionLevel":"standard"'
    )
  })
})
