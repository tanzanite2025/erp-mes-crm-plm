// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { SidebarCommandAssignmentPage } from '.'
import { SidebarCommandLibraryPage } from './library'

const {
  assignmentViewModelMock,
  libraryViewModelMock,
  openCreateFormMock,
  openCreateCategoryFormMock,
  openEditFormMock,
  openEditCategoryFormMock,
  toggleEnabledMock,
  toggleCategoryEnabledMock,
  moveCommandMock,
} = vi.hoisted(() => ({
  assignmentViewModelMock: vi.fn(),
  libraryViewModelMock: vi.fn(),
  openCreateFormMock: vi.fn(),
  openCreateCategoryFormMock: vi.fn(),
  openEditFormMock: vi.fn(),
  openEditCategoryFormMock: vi.fn(),
  toggleEnabledMock: vi.fn(),
  toggleCategoryEnabledMock: vi.fn(),
  moveCommandMock: vi.fn(),
}))

vi.mock('./components/sidebar-command-shell', () => ({
  SidebarCommandShell: ({ children }: { children: ReactNode }) => (
    <div data-testid='sidebar-command-shell'>{children}</div>
  ),
}))

vi.mock('./hooks/use-sidebar-command-assignment', () => ({
  useSidebarCommandAssignmentViewModel: assignmentViewModelMock,
}))

vi.mock('./hooks/use-sidebar-command-library', () => ({
  useSidebarCommandLibraryViewModel: libraryViewModelMock,
}))

vi.mock('@/lib/cookies', () => ({
  getCookie: vi.fn(() => undefined),
  removeCookie: vi.fn(),
  setCookie: vi.fn(),
}))

function renderWithLanguage(children: ReactNode) {
  return render(
    <LanguageProvider defaultLocale='en-US'>{children}</LanguageProvider>
  )
}

function createLibraryCommand(overrides = {}) {
  return {
    commandId: 'quality_scan',
    title: 'Quality Scan',
    description: 'Quality scan entry',
    route: '/quality/scan',
    searchParams: { mode: 'scan' },
    icon: 'ClipboardCheck',
    category: 'quality',
    assignable: true,
    enabled: true,
    status: 'active',
    sortOrder: 10,
    ...overrides,
  }
}

function createCategory(overrides = {}) {
  return {
    categoryId: 'warehouse',
    name: 'Warehouse Scan',
    description: 'Warehouse command group',
    enabled: true,
    status: 'active',
    sortOrder: 10,
    commandCount: 2,
    ...overrides,
  }
}

describe('sidebar command tab pages', () => {
  beforeEach(() => {
    openCreateFormMock.mockReset()
    openCreateCategoryFormMock.mockReset()
    openEditFormMock.mockReset()
    openEditCategoryFormMock.mockReset()
    toggleEnabledMock.mockReset()
    toggleCategoryEnabledMock.mockReset()
    moveCommandMock.mockReset()

    libraryViewModelMock.mockReturnValue({
      query: '',
      setQuery: vi.fn(),
      isFormOpen: false,
      isCategoryFormOpen: false,
      formRevision: 1,
      categoryFormRevision: 1,
      editingCommand: null,
      editingCategory: null,
      commands: [createLibraryCommand()],
      categories: [createCategory()],
      commandsQuery: { isLoading: false },
      categoriesQuery: { isLoading: false },
      totalCount: 1,
      totalCategoryCount: 1,
      enabledCount: 1,
      enabledCategoryCount: 1,
      assignableCount: 1,
      isSaving: false,
      isCategorySaving: false,
      openCreateForm: openCreateFormMock,
      openEditForm: openEditFormMock,
      openCreateCategoryForm: openCreateCategoryFormMock,
      openEditCategoryForm: openEditCategoryFormMock,
      closeForm: vi.fn(),
      closeCategoryForm: vi.fn(),
      saveCommand: vi.fn(),
      saveCategory: vi.fn(),
      toggleCommandEnabled: toggleEnabledMock,
      toggleCategoryEnabled: toggleCategoryEnabledMock,
      moveCommand: moveCommandMock,
    })

    assignmentViewModelMock.mockReturnValue({
      query: '',
      setQuery: vi.fn(),
      usersQuery: { isLoading: false },
      commandsQuery: { isLoading: false },
      categoriesQuery: { isLoading: false },
      assignmentQuery: { isFetching: false },
      accounts: [
        {
          id: 'account-1',
          username: 'operator_a',
          name: 'Operator A',
          employeeId: 'EMP-WH',
          status: 'active',
        },
      ],
      filteredAccounts: [
        {
          id: 'account-1',
          username: 'operator_a',
          name: 'Operator A',
          employeeId: 'EMP-WH',
          status: 'active',
        },
      ],
      selectedAccount: {
        id: 'account-1',
        username: 'operator_a',
        name: 'Operator A',
        employeeId: 'EMP-WH',
        status: 'active',
      },
      selectedAccountId: 'account-1',
      hasSelectedAccount: true,
      assignableCommands: [
        {
          code: 'quality_scan',
          title: 'Quality Scan',
          description: 'Quality scan entry',
          route: '/quality/scan',
          category: 'warehouse',
          sortOrder: 10,
          iconName: 'ClipboardCheck',
        },
      ],
      assignableCategories: [createCategory()],
      selectedCodeSet: new Set(['quality_scan']),
      selectedCategorySet: new Set(['warehouse']),
      effectivePreviewCommands: [
        {
          code: 'quality_scan',
          title: 'Quality Scan',
          description: 'Quality scan entry',
          route: '/quality/scan',
          category: 'warehouse',
          sortOrder: 10,
          iconName: 'ClipboardCheck',
          assignmentSource: 'category',
          sourceCategoryName: 'Warehouse Scan',
        },
      ],
      directCommandCount: 1,
      assignedCount: 1,
      assignedCategoryCount: 1,
      targetUserIds: [],
      selectedTargetCount: 0,
      batchMode: 'replace',
      setBatchMode: vi.fn(),
      saveMutation: { isPending: false, mutate: vi.fn() },
      batchMutation: { isPending: false, mutate: vi.fn() },
      copyMutation: { isPending: false, mutate: vi.fn() },
      selectAccount: vi.fn(),
      toggleCommand: vi.fn(),
      toggleCategory: vi.fn(),
      selectAllCommands: vi.fn(),
      clearCommands: vi.fn(),
      toggleTarget: vi.fn(),
      selectFilteredTargets: vi.fn(),
      clearTargets: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the command library tab with maintenance actions', async () => {
    renderWithLanguage(<SidebarCommandLibraryPage />)

    expect(screen.getByText('Command Library')).toBeTruthy()
    expect(screen.getByText('Quality Scan')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: /New Command/ }))
    expect(openCreateFormMock).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: /Edit/ }))
    expect(openEditFormMock).toHaveBeenCalledWith(
      expect.objectContaining({ commandId: 'quality_scan' })
    )
  })

  it('renders command categories as a separate library section', async () => {
    renderWithLanguage(<SidebarCommandLibraryPage />)

    await userEvent.click(
      screen.getByRole('tab', { name: /Custom Categories/ })
    )

    expect(screen.getByText('Warehouse Scan')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: /New Category/ }))
    expect(openCreateCategoryFormMock).toHaveBeenCalledTimes(1)
  })

  it('renders assignment from categories plus direct commands and keeps private tools separate', () => {
    renderWithLanguage(<SidebarCommandAssignmentPage />)

    expect(screen.getByText('Sidebar Command Assignment')).toBeTruthy()
    expect(screen.getAllByText('Operator A').length).toBeGreaterThan(0)
    expect(screen.getByText('Category Assignment')).toBeTruthy()
    expect(screen.getByText('Direct Command Add-ons')).toBeTruthy()
    expect(screen.getByText('Final Sidebar Preview')).toBeTruthy()
    expect(screen.getAllByText('Warehouse Scan').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Quality Scan').length).toBeGreaterThan(0)
    expect(screen.getByText('Personal Photo')).toBeTruthy()
    expect(screen.getByText('Personal Video')).toBeTruthy()
    expect(screen.getByText('Personal Buffer')).toBeTruthy()
  })
})
