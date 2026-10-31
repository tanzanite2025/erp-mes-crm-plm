// @vitest-environment jsdom
import type { ReactNode } from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { SalesOperationGuidePage } from '@/features/trading/pages/sales-operation-guide-page'
import { PurchaseOperationGuidePage } from './purchase-operation-guide-page'

const operationGuideAccount = vi.hoisted(() => ({
  user: { permissions: [] as string[] },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: typeof operationGuideAccount) => unknown) =>
    select(operationGuideAccount),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: ReactNode
    to: string
    params?: { category: string }
  }) => (
    <a href={params ? to.replace('$category', params.category) : to}>
      {children}
    </a>
  ),
}))

beforeEach(() => {
  operationGuideAccount.user.permissions = []
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderPurchasingOrSalesOperationGuide(
  domain: 'purchase' | 'sales',
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
) {
  return render(
    <LanguageProvider
      defaultLocale={locale}
      storageKey='purchase-and-sales-guide-test-language'
    >
      {domain === 'purchase' ? (
        <PurchaseOperationGuidePage />
      ) : (
        <SalesOperationGuidePage />
      )}
    </LanguageProvider>
  )
}

function selectPurchasingOrSalesOperationGuideChapter(name: string) {
  fireEvent.mouseDown(screen.getByRole('tab', { name }), {
    button: 0,
    ctrlKey: false,
  })
}

describe.each([
  {
    domain: 'purchase' as const,
    title: '采购操作指南',
    permission: 'tab_purchase_purchase_operation_guide',
    businessPermission: 'tab_purchase_orders',
    businessPath: '/purchase/orders',
    businessLabel: '进入采购订单',
  },
  {
    domain: 'sales' as const,
    title: '销售操作指南',
    permission: 'tab_trading_sales_operation_guide',
    businessPermission: 'tab_trading_sales_orders',
    businessPath: '/trading/sales-orders',
    businessLabel: '进入销售订单',
  },
])(
  '$domain operation guide',
  ({
    domain,
    title,
    permission,
    businessPermission,
    businessPath,
    businessLabel,
  }) => {
    it('reads five chapters without business requests and resets only the chapter reading position', () => {
      const fetchBusinessData = vi.fn()
      vi.stubGlobal('fetch', fetchBusinessData)
      operationGuideAccount.user.permissions = [permission]
      renderPurchasingOrSalesOperationGuide(domain)
      const readingArea = screen.getByRole('region')
      expect(readingArea).not.toContainElement(
        screen.getByRole('heading', { level: 1, name: title })
      )
      expect(readingArea).not.toContainElement(screen.getByRole('tablist'))
      const chapters = screen.getAllByRole('tab')
      expect(chapters).toHaveLength(5)
      for (const [index, chapter] of chapters.entries()) {
        readingArea.scrollTop = 300
        fireEvent.mouseDown(chapter, { button: 0, ctrlKey: false })
        expect(chapter).toHaveAttribute('aria-selected', 'true')
        expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
        expect(
          within(screen.getByRole('tabpanel')).getAllByRole('listitem')
        ).toHaveLength(3)
        expect(
          screen.getByRole('heading', { name: '开始前准备' })
        ).toBeInTheDocument()
        expect(
          screen.getByRole('heading', { name: '完成后核对' })
        ).toBeInTheDocument()
        expect(
          screen.getByRole('heading', { name: '常见问题' })
        ).toBeInTheDocument()
        if (index > 0) expect(readingArea.scrollTop).toBe(0)
      }
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(fetchBusinessData).not.toHaveBeenCalled()
    })

    it('exposes only business destinations granted to the reader', () => {
      operationGuideAccount.user.permissions = [permission, businessPermission]
      renderPurchasingOrSalesOperationGuide(domain)
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      selectPurchasingOrSalesOperationGuideChapter(
        domain === 'purchase' ? '建立与正式下单' : '销售建单与推进'
      )
      expect(screen.getAllByRole('link')).toHaveLength(1)
      expect(screen.getByRole('link', { name: businessLabel })).toHaveAttribute(
        'href',
        businessPath
      )
    })

    it('provides all chapter content in English', () => {
      operationGuideAccount.user.permissions = [permission]
      renderPurchasingOrSalesOperationGuide(domain, 'en-US')
      expect(
        screen.getByRole('heading', {
          level: 1,
          name:
            domain === 'purchase'
              ? 'Purchasing operation guide'
              : 'Sales operation guide',
        })
      ).toBeInTheDocument()
      for (const chapter of screen.getAllByRole('tab')) {
        fireEvent.mouseDown(chapter, { button: 0, ctrlKey: false })
        expect(
          screen.getByRole('heading', { name: 'Before you start' })
        ).toBeInTheDocument()
        expect(
          screen.getByRole('heading', { name: 'Check the result' })
        ).toBeInTheDocument()
        expect(
          screen.getByRole('heading', { name: 'Common question' })
        ).toBeInTheDocument()
        expect(screen.getByRole('tabpanel').textContent).not.toMatch(
          /operationGuide\./
        )
      }
    })
  }
)

it('explains receipt posting, offline drafts, current purchase return limits, and the existing payable entry', () => {
  renderPurchasingOrSalesOperationGuide('purchase')
  selectPurchasingOrSalesOperationGuideChapter('物流与收货入库')
  expect(screen.getByText(/承运商签收不会自动替代仓库收货/)).toBeInTheDocument()
  expect(screen.getByText(/离线草稿仅保存在当前设备/)).toBeInTheDocument()
  selectPurchasingOrSalesOperationGuideChapter('采购退货与异常')
  expect(screen.getByText(/订购数量减已收数量、减已退数量/)).toBeInTheDocument()
  expect(
    screen.getByText(/它不能直接作为已入库库存的退供应商出库入口/)
  ).toBeInTheDocument()
  selectPurchasingOrSalesOperationGuideChapter('应付与付款核对')
  expect(screen.getByText(/财务应收应付页面切换到应付/)).toBeInTheDocument()
  expect(screen.getByText(/不要通过新建一张重复订单/)).toBeInTheDocument()
})

it('distinguishes specific products, warehouse delivery, physical returns, exchange execution, and amount registration', () => {
  renderPurchasingOrSalesOperationGuide('sales')
  expect(
    screen.getByText(/同一基础型号可以有不同规格或 BOM/)
  ).toBeInTheDocument()
  selectPurchasingOrSalesOperationGuideChapter('备货与交付跟进')
  expect(
    screen.getByText(/配车读取虚拟发货仓中的真实发货记录/)
  ).toBeInTheDocument()
  selectPurchasingOrSalesOperationGuideChapter('退货与换货处理')
  expect(
    screen.getByText(/创建退货单、确认实物回仓和登记实际退货金额是不同操作/)
  ).toBeInTheDocument()
  expect(screen.getByText(/旧件回仓、替换件准备和补发/)).toBeInTheDocument()
  selectPurchasingOrSalesOperationGuideChapter('应收与收款核对')
  expect(
    screen.getByText(/交付完成不代表已经收款或完成分摊/)
  ).toBeInTheDocument()
})

it('opens material records using the existing category route without exposing supplier maintenance', () => {
  operationGuideAccount.user.permissions = [
    'tab_purchase_purchase_operation_guide',
    'tab_materials__category',
  ]
  renderPurchasingOrSalesOperationGuide('purchase')
  expect(screen.getAllByRole('link')).toHaveLength(1)
  expect(
    screen.getByRole('link', { name: '查看生产物料档案' })
  ).toHaveAttribute('href', '/materials/all')
})
