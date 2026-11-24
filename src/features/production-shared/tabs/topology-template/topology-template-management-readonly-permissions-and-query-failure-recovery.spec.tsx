// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TopologyTemplateMgmt } from './index'

const templateManagementTestState = vi.hoisted(() => ({
  canManage: false,
  error: null as Error | null,
  refresh: vi.fn(),
}))
vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({
    allowsPermission: () => templateManagementTestState.canManage,
    isChecking: false,
  }),
}))
vi.mock('../../hooks/use-production-resources', () => ({
  useProductionLinesQuery: () => ({ data: [], isLoading: false, error: null }),
  useProductionLineBOMBranchesQuery: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}))
vi.mock('../../topology/use-topology-templates', () => ({
  useTopologyTemplates: () => ({
    templates: [],
    isLoaded: true,
    error: templateManagementTestState.error,
    isSaving: false,
    captureFromLine: vi.fn(),
    updateTemplate: vi.fn(),
    removeTemplate: vi.fn(),
    applyToNewLine: vi.fn(),
    refresh: templateManagementTestState.refresh,
  }),
}))
afterEach(() => {
  cleanup()
  templateManagementTestState.error = null
  templateManagementTestState.canManage = false
  vi.clearAllMocks()
})

describe('topology template management access and load failures', () => {
  it('hides write entry points from users with read access only', () => {
    render(<TopologyTemplateMgmt />)
    expect(
      screen.queryByRole('button', { name: '从实际 L1 生成模板' })
    ).toBeNull()
    expect(screen.getByText(/暂无拓扑模板/)).toBeTruthy()
  })
  it('shows server loading errors and retry without pretending the template list is empty', () => {
    templateManagementTestState.canManage = true
    templateManagementTestState.error = new Error('模板服务暂时无法读取')
    render(<TopologyTemplateMgmt />)
    expect(screen.getByRole('alert').textContent).toContain(
      '模板服务暂时无法读取'
    )
    expect(screen.queryByText(/暂无拓扑模板/)).toBeNull()
    expect(
      (
        screen.getByRole('button', {
          name: '从实际 L1 生成模板',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '重新读取模板' }))
    expect(templateManagementTestState.refresh).toHaveBeenCalledTimes(1)
  })
})
