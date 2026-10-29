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
import {
  OutsourceSendReturnInspectionScanningGuidePage,
  OutsourceTaskAndPartnerOperationGuidePage,
} from './production-outsourcing-task-partner-and-scanning-operation-guide-pages'

const outsourceGuideReaderAccount = vi.hoisted(() => ({
  user: { permissions: [] as string[] },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    select: (state: typeof outsourceGuideReaderAccount) => unknown
  ) => select(outsourceGuideReaderAccount),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

beforeEach(() => {
  localStorage.clear()
  outsourceGuideReaderAccount.user.permissions = [
    'tab_production_outsourcing_task_and_partner_operation_guide',
    'tab_production_outsourcing_send_return_inspection_scanning_guide',
  ]
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderSelectedOutsourcingOperationGuide(
  guide: 'tasksAndPartners' | 'sendReturnInspection',
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
) {
  return render(
    <LanguageProvider
      defaultLocale={locale}
      storageKey='outsource-operation-guide-test-language'
    >
      {guide === 'tasksAndPartners' ? (
        <OutsourceTaskAndPartnerOperationGuidePage />
      ) : (
        <OutsourceSendReturnInspectionScanningGuidePage />
      )}
    </LanguageProvider>
  )
}

function selectOutsourcingOperationGuideChapter(name: string) {
  fireEvent.mouseDown(screen.getByRole('tab', { name }), {
    button: 0,
    ctrlKey: false,
  })
}

describe('outsourcing operation guides', () => {
  it.each([
    ['tasksAndPartners', 4],
    ['sendReturnInspection', 5],
  ] as const)(
    'keeps %s navigation fixed outside one reading area without business requests',
    (guide, chapterCount) => {
      const fetchBusinessData = vi.fn()
      vi.stubGlobal('fetch', fetchBusinessData)
      renderSelectedOutsourcingOperationGuide(guide)
      const navigation = screen.getByRole('tablist', {
        name: '委外操作指南目录',
      })
      const chapters = within(navigation).getAllByRole('tab')
      expect(chapters).toHaveLength(chapterCount)
      const readingArea = screen.getByRole('region', {
        name: '委外操作指南正文',
      })
      expect(readingArea).not.toContainElement(
        screen.getByRole('heading', { level: 1 })
      )
      expect(readingArea).not.toContainElement(navigation)
      for (const chapter of chapters.slice(1)) {
        readingArea.scrollTop = 300
        fireEvent.mouseDown(chapter, { button: 0, ctrlKey: false })
        expect(chapter).toHaveAttribute('aria-selected', 'true')
        expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
        expect(readingArea.scrollTop).toBe(0)
        expect(screen.getAllByRole('listitem')).toHaveLength(4)
      }
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(fetchBusinessData).not.toHaveBeenCalled()
    }
  )

  it('explains source setup, optional process context and release without shipping', () => {
    renderSelectedOutsourcingOperationGuide('tasksAndPartners')
    selectOutsourcingOperationGuideChapter('维护委外单位')
    expect(screen.getByText(/关联供应商为可选项/)).toBeInTheDocument()
    selectOutsourcingOperationGuideChapter('新建委外任务')
    expect(
      screen.getByText(/生产计划来源当前只支持一条委外明细/)
    ).toBeInTheDocument()
    expect(screen.getByText(/初期建单不强制指定/)).toBeInTheDocument()
    expect(screen.getByText(/允许为空或只登记一部分/)).toBeInTheDocument()
    selectOutsourcingOperationGuideChapter('核对与下发')
    expect(screen.getByText(/下发不等于实物发出/)).toBeInTheDocument()
    expect(screen.getByText(/条码尚未登记也可以下发/)).toBeInTheDocument()
  })

  it('distinguishes optional registration, read-only scanning and confirmed actions', () => {
    renderSelectedOutsourcingOperationGuide('sendReturnInspection')
    selectOutsourcingOperationGuideChapter('可选条码登记')
    expect(screen.getByText(/允许空清单或部分登记/)).toBeInTheDocument()
    expect(screen.getByText(/不会自动建立条码的生产状态/)).toBeInTheDocument()
    expect(screen.getByText(/已发出数量仍为 0 PCS/)).toBeInTheDocument()
    selectOutsourcingOperationGuideChapter('委外发出')
    expect(screen.getByText(/只读取信息，不会发出/)).toBeInTheDocument()
    expect(
      screen.getByText(/同一条码在同一明细中的发出只能登记一次/)
    ).toBeInTheDocument()
    expect(screen.getByText(/条码当前工序保持不变/)).toBeInTheDocument()
    selectOutsourcingOperationGuideChapter('委外回厂')
    expect(
      screen.getByText(/回厂不会自动完成检验或推进工序/)
    ).toBeInTheDocument()
    selectOutsourcingOperationGuideChapter('检验与工序去向')
    expect(screen.getByText(/以弹窗预览为准/)).toBeInTheDocument()
    expect(screen.getByText(/不合格结果只能选择返工或报废/)).toBeInTheDocument()
    expect(
      screen.getByText(/确认提交检验.*同一条码在同一明细中只能检验一次/)
    ).toBeInTheDocument()
  })

  it('lets guide-only readers read all chapters and links only to permitted business pages', () => {
    renderSelectedOutsourcingOperationGuide('tasksAndPartners')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    selectOutsourcingOperationGuideChapter('核对与下发')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    cleanup()
    outsourceGuideReaderAccount.user.permissions.push(
      'tab_production_outsourcing_orders'
    )
    renderSelectedOutsourcingOperationGuide('tasksAndPartners')
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: '打开委外任务' })).toHaveAttribute(
      'href',
      '/production-outsourcing/orders'
    )
    selectOutsourcingOperationGuideChapter('维护委外单位')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    cleanup()
    outsourceGuideReaderAccount.user.permissions.push(
      'tab_production_outsourcing_transfers'
    )
    renderSelectedOutsourcingOperationGuide('sendReturnInspection')
    for (const chapter of screen.getAllByRole('tab')) {
      fireEvent.mouseDown(chapter, { button: 0, ctrlKey: false })
      expect(screen.getAllByRole('link')).toHaveLength(1)
      expect(
        screen.getByRole('link', { name: '打开收发检验' })
      ).toHaveAttribute('href', '/production-outsourcing/transfers')
    }
  })

  it.each([
    ['tasksAndPartners', 'Outsource task and partner operation guide', 4],
    ['sendReturnInspection', 'Send, return, inspection and scanning guide', 5],
  ] as const)(
    'provides complete English content for %s',
    (guide, title, count) => {
      renderSelectedOutsourcingOperationGuide(guide, 'en-US')
      expect(
        screen.getByRole('heading', { name: title, level: 1 })
      ).toBeInTheDocument()
      expect(screen.getAllByRole('tab')).toHaveLength(count)
      for (const chapter of screen.getAllByRole('tab')) {
        fireEvent.mouseDown(chapter, { button: 0, ctrlKey: false })
        expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5)
        expect(screen.getByRole('tabpanel').textContent).not.toContain(
          'productionOutsourcing.'
        )
      }
    }
  )
})
