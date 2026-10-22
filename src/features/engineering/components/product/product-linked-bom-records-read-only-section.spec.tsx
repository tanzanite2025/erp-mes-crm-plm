// @vitest-environment jsdom
import type { ReactNode } from 'react'
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
import { bomSchema } from '@/features/product-structure/data/schema'
import { BOMS_QUERY_KEY } from '@/features/product-structure/query-keys'
import { ProductLinkedBomRecordsReadOnlySection } from './product-linked-bom-records-read-only-section'

const associationMocks = vi.hoisted(() => ({
  getBOMAssociationOptions: vi.fn(),
  account: { user: { permissions: ['menu_engineering'] } },
}))
vi.mock('@/features/product-structure/services/bom-service', () => ({
  bomService: {
    getBOMAssociationOptions: associationMocks.getBOMAssociationOptions,
  },
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: typeof associationMocks.account) => unknown) =>
    select(associationMocks.account),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    onClick,
  }: {
    children: ReactNode
    onClick?: () => void
  }) => (
    <a
      href='/product-structure/bom'
      onClick={(event) => {
        event.preventDefault()
        onClick?.()
      }}
    >
      {children}
    </a>
  ),
}))

const linkedEbom = bomSchema.parse({
  id: 'linked-ebom',
  bomNo: 'EBOM-OWN',
  productId: 'current-product',
})
const linkedMbom = bomSchema.parse({
  id: 'linked-mbom',
  bomNo: 'MBOM-OWN',
  bomType: 'MBOM',
  productId: 'current-product',
})
const foreignBom = bomSchema.parse({
  id: 'foreign-bom',
  bomNo: 'OTHER-PRODUCT-BOM',
  productId: 'other-product',
})
const clients: QueryClient[] = []

function renderReadOnlyProductBomAssociations(productId: string | undefined) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  const onNavigate = vi.fn()
  const result = render(
    <QueryClientProvider client={client}>
      <LanguageProvider defaultLocale='zh-CN'>
        <ProductLinkedBomRecordsReadOnlySection
          productId={productId}
          onNavigateToBomManagement={onNavigate}
        />
      </LanguageProvider>
    </QueryClientProvider>
  )
  return { ...result, client, onNavigate }
}

beforeEach(() => {
  associationMocks.account.user.permissions = ['menu_engineering']
  associationMocks.getBOMAssociationOptions.mockReset()
  associationMocks.getBOMAssociationOptions.mockResolvedValue([
    linkedEbom,
    linkedMbom,
    foreignBom,
  ])
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
})

describe('product form shows actual BOM associations as read-only records', () => {
  it('explains that a new product is saved separately without requesting or choosing BOMs', () => {
    renderReadOnlyProductBomAssociations(undefined)
    expect(
      screen.getByText(
        '先保存产品。BOM 可独立准备和验证，确认可用后在 BOM 管理中关联此产品。'
      )
    ).toBeInTheDocument()
    expect(associationMocks.getBOMAssociationOptions).not.toHaveBeenCalled()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('shows all actual associations for the current product and provides the separate management entry', async () => {
    const { onNavigate } =
      renderReadOnlyProductBomAssociations('current-product')
    expect(
      await screen.findByText('EBOM-OWN / V1.0 / EBOM')
    ).toBeInTheDocument()
    expect(screen.getByText('MBOM-OWN / V1.0 / MBOM')).toBeInTheDocument()
    expect(screen.queryByText(/OTHER-PRODUCT-BOM/)).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(associationMocks.getBOMAssociationOptions).toHaveBeenCalledWith({
      productId: 'current-product',
    })
    fireEvent.click(screen.getByRole('link', { name: '进入 BOM 管理' }))
    expect(onNavigate).toHaveBeenCalledOnce()
  })

  it('refreshes after independent BOM changes without retaining removed associations', async () => {
    const { client } = renderReadOnlyProductBomAssociations('current-product')
    await screen.findByText('EBOM-OWN / V1.0 / EBOM')
    associationMocks.getBOMAssociationOptions.mockResolvedValue([foreignBom])
    await act(async () => {
      await client.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
    })
    expect(
      await screen.findByText('当前产品尚未关联 BOM。')
    ).toBeInTheDocument()
    expect(screen.queryByText('EBOM-OWN / V1.0 / EBOM')).not.toBeInTheDocument()
  })

  it('shows a retryable read failure without treating it as an empty association list', async () => {
    associationMocks.getBOMAssociationOptions.mockRejectedValueOnce(
      new Error('Network unavailable')
    )
    renderReadOnlyProductBomAssociations('current-product')
    expect(
      await screen.findByText('关联信息读取失败，可重试；不影响产品资料保存。')
    ).toBeInTheDocument()
    expect(screen.queryByText('当前产品尚未关联 BOM。')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重试读取关联信息' }))
    expect(
      await screen.findByText('EBOM-OWN / V1.0 / EBOM')
    ).toBeInTheDocument()
  })

  it('respects BOM page permissions without issuing an association request', async () => {
    associationMocks.account.user.permissions = ['tab_engineering_products']
    renderReadOnlyProductBomAssociations('current-product')
    expect(
      screen.getByText('需要 BOM 页面访问权限才能查看关联信息。')
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(associationMocks.getBOMAssociationOptions).not.toHaveBeenCalled()
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
