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
import { OrganizationAndAccountOperationGuidePage } from './organization-and-account-operation-guide-page'

const organizationGuideReader = vi.hoisted(() => ({
  isIdentitySynced: true,
  isSyncing: false,
  user: {
    permissions: ['tab_personnel_organization_and_account_operation_guide'],
  },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: typeof organizationGuideReader) => unknown) =>
    select(organizationGuideReader),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

beforeEach(() => {
  organizationGuideReader.isIdentitySynced = true
  organizationGuideReader.user.permissions = [
    'tab_personnel_organization_and_account_operation_guide',
  ]
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderOrganizationAndAccountOperationGuide(
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
) {
  return render(
    <LanguageProvider
      defaultLocale={locale}
      storageKey='organization-and-account-guide-test-language'
    >
      <OrganizationAndAccountOperationGuidePage />
    </LanguageProvider>
  )
}

function selectOrganizationAndAccountGuideChapter(name: string) {
  fireEvent.mouseDown(screen.getByRole('tab', { name }), {
    button: 0,
    ctrlKey: false,
  })
}

describe('organization and account guide reading and authorization boundaries', () => {
  it('keeps seven chapters navigable outside the scrolling body without fetching business data', () => {
    const fetchBusinessData = vi.fn()
    vi.stubGlobal('fetch', fetchBusinessData)
    renderOrganizationAndAccountOperationGuide()
    const navigation = screen.getByRole('tablist', {
      name: '组织与账号指南目录',
    })
    const chapters = within(navigation).getAllByRole('tab')
    const readingArea = screen.getByRole('region', {
      name: '组织与账号指南正文',
    })
    expect(chapters).toHaveLength(7)
    expect(readingArea).not.toContainElement(navigation)
    expect(readingArea).not.toContainElement(
      screen.getByRole('heading', { level: 1 })
    )
    for (const chapter of chapters) {
      readingArea.scrollTop = 300
      fireEvent.mouseDown(chapter, { button: 0, ctrlKey: false })
      expect(chapter).toHaveAttribute('aria-selected', 'true')
      expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
      if (chapter !== chapters[0]) expect(readingArea.scrollTop).toBe(0)
    }
    expect(fetchBusinessData).not.toHaveBeenCalled()
  })

  it('explains separate records, optional employee binding, password rules and inherited access', () => {
    renderOrganizationAndAccountOperationGuide()
    expect(
      screen.getByRole('table', { name: '四类资料分别解决什么问题' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '组织归属和岗位不会自动授权' })
    ).toBeInTheDocument()
    selectOrganizationAndAccountGuideChapter('如何建立登录账号')
    expect(
      screen.getByRole('heading', {
        name: '员工绑定是可选项，一个员工不能重复绑定多个账号',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/当前账号表单要求密码至少 8 位/)
    ).toBeInTheDocument()
    selectOrganizationAndAccountGuideChapter('如何分配权限')
    expect(
      screen.getByText(/取消单独授权不能抵消预设继承的权限/)
    ).toBeInTheDocument()
    selectOrganizationAndAccountGuideChapter('调岗、离职与停用')
    expect(
      screen.getByRole('heading', { name: '改部门不会自动更换权限' })
    ).toBeInTheDocument()
    selectOrganizationAndAccountGuideChapter('常见问题怎么查')
    expect(screen.getByText(/遇到 500 时记录完整网址/)).toBeInTheDocument()
  })

  it('hides business links for guide-only readers and shows only separately granted destinations', () => {
    renderOrganizationAndAccountOperationGuide()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    cleanup()
    organizationGuideReader.user.permissions.push('tab_personnel_accounts')
    renderOrganizationAndAccountOperationGuide()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(
      screen.getByRole('link', { name: '建立与维护账号' })
    ).toHaveAttribute('href', '/personnel/accounts')
    selectOrganizationAndAccountGuideChapter('如何建立组织')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    selectOrganizationAndAccountGuideChapter('如何建立登录账号')
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(
      screen.queryByRole('link', { name: '分配用户权限' })
    ).not.toBeInTheDocument()
  })

  it('offers the same practical setup instructions in English', () => {
    renderOrganizationAndAccountOperationGuide('en-US')
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Organization & Account Guide',
      })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(7)
    selectOrganizationAndAccountGuideChapter('Create a sign-in account')
    expect(screen.getByText(/at least 8 characters/)).toBeInTheDocument()
    expect(screen.getByText(/zhangmin.ck/)).toBeInTheDocument()
  })

  it('requires both creation permission and destination access, and loads no form data before clicking', () => {
    const fetchBusinessData = vi.fn()
    vi.stubGlobal('fetch', fetchBusinessData)
    organizationGuideReader.user.permissions.push('user_create')
    renderOrganizationAndAccountOperationGuide()
    selectOrganizationAndAccountGuideChapter('如何建立登录账号')
    expect(
      screen.queryByRole('button', { name: '创建登录账号' })
    ).not.toBeInTheDocument()
    cleanup()
    organizationGuideReader.user.permissions.push('tab_personnel_accounts')
    renderOrganizationAndAccountOperationGuide()
    selectOrganizationAndAccountGuideChapter('如何建立登录账号')
    expect(screen.getByRole('button', { name: '创建登录账号' })).toBeEnabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetchBusinessData).not.toHaveBeenCalled()
    cleanup()
    organizationGuideReader.isIdentitySynced = false
    renderOrganizationAndAccountOperationGuide()
    selectOrganizationAndAccountGuideChapter('如何建立登录账号')
    expect(
      screen.queryByRole('button', { name: '创建登录账号' })
    ).not.toBeInTheDocument()
  })
})
