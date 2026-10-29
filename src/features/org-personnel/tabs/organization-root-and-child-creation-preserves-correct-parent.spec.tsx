// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { OrgMgmt } from './org-mgmt'

const selectedOrganizationFixture = vi.hoisted(() => ({
  selectedNode: {
    id: 'headquarters',
    name: '总部',
    type: 'company' as const,
    version: 1,
  },
  handleOrgSubmit: vi.fn(),
}))

vi.mock('../hooks/use-org-mgmt', () => ({
  useOrgMgmt: () => ({
    orgData: [selectedOrganizationFixture.selectedNode],
    selectedNode: selectedOrganizationFixture.selectedNode,
    setSelectedNode: vi.fn(),
    error: null,
    isLoading: false,
    loadError: null,
    loadData: vi.fn(),
    handleOrgSubmit: selectedOrganizationFixture.handleOrgSubmit,
    handleDelete: vi.fn(),
    handleLinkSave: vi.fn(),
  }),
}))
vi.mock('../components/production-selector', () => ({
  ProductionSelector: () => null,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('organization creation parent selection', () => {
  it('creates a root even when the organization tree has a selected company, then creates a child under that company', async () => {
    render(
      <LanguageProvider defaultLocale='zh-CN'>
        <OrgMgmt />
      </LanguageProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: '新增一级单位' }))
    const rootDialog = screen.getByRole('dialog')
    expect(
      within(rootDialog).getByText('未选择父级节点时，将创建一级单位。')
    ).toBeInTheDocument()
    fireEvent.change(within(rootDialog).getByLabelText('名称'), {
      target: { value: '新单位' },
    })
    fireEvent.click(
      within(rootDialog).getByRole('button', { name: '确认保存' })
    )
    await vi.waitFor(() =>
      expect(selectedOrganizationFixture.handleOrgSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '新单位',
          type: 'company',
          parentId: undefined,
        }),
        false,
        undefined
      )
    )
    fireEvent.click(screen.getByRole('button', { name: '新增子项' }))
    const childDialog = screen.getByRole('dialog')
    expect(
      within(childDialog).getByText(/当前选中的是一级单位“总部”/)
    ).toBeInTheDocument()
    fireEvent.change(within(childDialog).getByLabelText('名称'), {
      target: { value: '仓储部' },
    })
    fireEvent.click(
      within(childDialog).getByRole('button', { name: '确认保存' })
    )
    await vi.waitFor(() =>
      expect(
        selectedOrganizationFixture.handleOrgSubmit
      ).toHaveBeenLastCalledWith(
        expect.objectContaining({
          name: '仓储部',
          type: 'department',
          parentId: 'headquarters',
        }),
        false,
        undefined
      )
    )
  })
})
