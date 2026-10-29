// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { type User } from '@/features/users/data/schema'
import * as userApi from '@/features/users/services/user-api'
import { type OrgNode } from '../data/org-schema'
import { type PersonnelRecordCreationType } from '../data/personnel-record-creation-action-definitions'
import { type Employee } from '../data/schema'
import { EmployeeMaintenanceService } from '../services/employee-maintenance-service'
import { OrgService } from '../services/org-service'
import { PositionService } from '../services/position-service'
import { PersonnelRecordCreationDialog } from './personnel-record-creation-dialog'

const personnelCreationTestNavigation = vi.hoisted(() => vi.fn())
const personnelCreationTestIdentity = vi.hoisted(() => ({
  user: { permissions: ['menu_org', 'user_create'] },
  isIdentitySynced: true,
  isSyncing: false,
}))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => personnelCreationTestNavigation,
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    select: (state: typeof personnelCreationTestIdentity) => unknown
  ) => select(personnelCreationTestIdentity),
}))
vi.mock('@/lib/handle-server-error', () => ({
  getServerErrorPresentation: (error: Error) => ({ message: error.message }),
}))

const organizationCreationTestParent: OrgNode = {
  id: 'existing-company',
  name: '总部',
  type: 'company',
  version: 1,
  children: [
    {
      id: 'terminal-production-unit',
      name: '末级单元',
      type: 'team',
      version: 1,
    },
  ],
}
const createdAccountTestResult: User = {
  id: 'created-account',
  username: 'guide.new.account',
  firstName: '测试',
  lastName: '指南',
  phoneNumber: '',
  status: 'active',
  isProtected: false,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}
const createdEmployeeTestResult: Employee = {
  id: 'created-employee',
  staffId: 'GUIDE001',
  name: '指南测试人员',
  phone: '',
  orgUnitId: 'existing-company',
  status: 'active',
  version: 1,
}

beforeEach(() => {
  vi.spyOn(OrgService, 'getOrgTree').mockResolvedValue([
    organizationCreationTestParent,
  ])
  vi.spyOn(PositionService, 'getPositions').mockResolvedValue([])
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  personnelCreationTestNavigation.mockClear()
})

function renderPersonnelCreationForm(recordType: PersonnelRecordCreationType) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const onOpenChange = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider defaultLocale='zh-CN'>
        <PersonnelRecordCreationDialog
          recordType={recordType}
          onOpenChange={onOpenChange}
        />
      </LanguageProvider>
    </QueryClientProvider>
  )
  return { onOpenChange, queryClient }
}

function fillNewAccountRequiredFields() {
  fireEvent.change(screen.getByLabelText('名字'), { target: { value: '测试' } })
  fireEvent.change(screen.getByLabelText('姓氏'), { target: { value: '指南' } })
  fireEvent.change(screen.getByLabelText('账户标识'), {
    target: { value: createdAccountTestResult.username },
  })
  const passwordInputs = screen
    .getByRole('dialog')
    .querySelectorAll('input[type=password]')
  for (const input of passwordInputs)
    fireEvent.change(input, { target: { value: 'testing123' } })
}

async function fillNewEmployeeRequiredFields() {
  fireEvent.change(screen.getByLabelText('工号'), {
    target: { value: createdEmployeeTestResult.staffId },
  })
  fireEvent.change(screen.getByLabelText('姓名'), {
    target: { value: createdEmployeeTestResult.name },
  })
  fireEvent.keyDown(screen.getByRole('combobox', { name: '组织归属' }), {
    key: 'ArrowDown',
  })
  fireEvent.click(await screen.findByRole('option', { name: '总部' }))
}

describe('personnel creation confirmation and redirect', () => {
  it('uses the selected parent, waits for server confirmation, and prevents duplicate organization submissions', async () => {
    let confirmOrganizationSave: (organization: OrgNode) => void = () =>
      undefined
    const saveOrganization = vi
      .spyOn(OrgService, 'saveOrgNode')
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            confirmOrganizationSave = resolve
          })
      )
    const { onOpenChange, queryClient } =
      renderPersonnelCreationForm('organization')
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    await screen.findByRole('option', { name: '总部' })
    expect(
      screen.queryByRole('option', { name: /末级单元/ })
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('名称'), {
      target: { value: '指南测试部门' },
    })
    fireEvent.change(screen.getByLabelText('父级组织'), {
      target: { value: organizationCreationTestParent.id },
    })
    expect(screen.getByLabelText('名称')).toHaveValue('指南测试部门')
    const saveButton = screen.getByRole('button', { name: '确认保存' })
    fireEvent.click(saveButton)
    await waitFor(() => expect(saveOrganization).toHaveBeenCalledOnce())
    expect(saveOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'department',
        parentId: 'existing-company',
        name: '指南测试部门',
      }),
      expect.anything()
    )
    expect(saveButton).toBeDisabled()
    fireEvent.click(saveButton)
    expect(saveOrganization).toHaveBeenCalledOnce()
    expect(personnelCreationTestNavigation).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
    await act(async () =>
      confirmOrganizationSave({
        id: 'new-department',
        name: '指南测试部门',
        type: 'department',
        parentId: 'existing-company',
        version: 1,
      })
    )
    await waitFor(() =>
      expect(personnelCreationTestNavigation).toHaveBeenCalledWith({
        to: '/personnel/org',
      })
    )
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['personnel', 'org-tree'],
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps organization values and stays in the guide on failure, then permits retry', async () => {
    const saveOrganization = vi
      .spyOn(OrgService, 'saveOrgNode')
      .mockRejectedValueOnce(new Error('机构名称重复'))
      .mockResolvedValue({
        id: 'new-company',
        name: '新单位',
        type: 'company',
        version: 1,
      })
    const { onOpenChange } = renderPersonnelCreationForm('organization')
    fireEvent.change(screen.getByLabelText('名称'), {
      target: { value: '新单位' },
    })
    fireEvent.click(screen.getByRole('button', { name: '确认保存' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('机构名称重复')
    expect(screen.getByLabelText('名称')).toHaveValue('新单位')
    expect(personnelCreationTestNavigation).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '确认保存' }))
    await waitFor(() =>
      expect(personnelCreationTestNavigation).toHaveBeenCalledWith({
        to: '/personnel/org',
      })
    )
    expect(saveOrganization).toHaveBeenCalledTimes(2)
  })

  it('uses the shared account form and filters the destination to the confirmed new account', async () => {
    let confirmAccountSave: (account: User) => void = () => undefined
    const createAccount = vi.spyOn(userApi, 'createUser').mockImplementation(
      () =>
        new Promise((resolve) => {
          confirmAccountSave = resolve
        })
    )
    const { onOpenChange } = renderPersonnelCreationForm('account')
    fillNewAccountRequiredFields()
    const saveButton = screen.getByRole('button', { name: '保存账户变更' })
    fireEvent.click(saveButton)
    await waitFor(() => expect(createAccount).toHaveBeenCalledOnce())
    expect(saveButton).toBeDisabled()
    fireEvent.click(saveButton)
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' })
    )
    expect(createAccount).toHaveBeenCalledOnce()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(personnelCreationTestNavigation).not.toHaveBeenCalled()
    await act(async () => confirmAccountSave(createdAccountTestResult))
    await waitFor(() =>
      expect(personnelCreationTestNavigation).toHaveBeenCalledWith({
        to: '/personnel/accounts',
        search: {
          username: 'guide.new.account',
          page: 1,
          pageSize: 10,
          status: [],
        },
      })
    )
    expect(createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'guide.new.account',
        password: 'testing123',
      }),
      expect.anything()
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not redirect or erase account inputs after a rejected save', async () => {
    vi.spyOn(userApi, 'createUser').mockRejectedValue(new Error('用户名已存在'))
    const { onOpenChange } = renderPersonnelCreationForm('account')
    fillNewAccountRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: '保存账户变更' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('用户名已存在')
    expect(screen.getByLabelText('账户标识')).toHaveValue('guide.new.account')
    expect(personnelCreationTestNavigation).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('retains failed employee inputs and only redirects after a confirmed retry', async () => {
    let confirmEmployeeSave: (employee: Employee) => void = () => undefined
    const saveEmployee = vi
      .spyOn(EmployeeMaintenanceService, 'saveEmployee')
      .mockRejectedValueOnce(new Error('工号已存在'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            confirmEmployeeSave = resolve
          })
      )
    const { onOpenChange, queryClient } =
      renderPersonnelCreationForm('employee')
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    await fillNewEmployeeRequiredFields()
    const saveButton = screen.getByRole('button', { name: '保存提交' })
    fireEvent.click(saveButton)
    expect(await screen.findByRole('alert')).toHaveTextContent('工号已存在')
    expect(screen.getByLabelText('工号')).toHaveValue('GUIDE001')
    expect(screen.getByLabelText('姓名')).toHaveValue('指南测试人员')
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(personnelCreationTestNavigation).not.toHaveBeenCalled()
    fireEvent.click(saveButton)
    await waitFor(() => expect(saveEmployee).toHaveBeenCalledTimes(2))
    expect(saveEmployee).toHaveBeenLastCalledWith(
      expect.objectContaining({
        staffId: 'GUIDE001',
        name: '指南测试人员',
        orgUnitId: 'existing-company',
      }),
      expect.anything()
    )
    expect(saveButton).toBeDisabled()
    fireEvent.click(saveButton)
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' })
    )
    expect(saveEmployee).toHaveBeenCalledTimes(2)
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(personnelCreationTestNavigation).not.toHaveBeenCalled()
    await act(async () => confirmEmployeeSave(createdEmployeeTestResult))
    await waitFor(() =>
      expect(personnelCreationTestNavigation).toHaveBeenCalledWith({
        to: '/personnel/employees',
      })
    )
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['personnel', 'employees'],
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not silently create a root when the selected parent is removed', async () => {
    const saveOrganization = vi.spyOn(OrgService, 'saveOrgNode')
    const { queryClient } = renderPersonnelCreationForm('organization')
    await screen.findByRole('option', { name: '总部' })
    fireEvent.change(screen.getByLabelText('父级组织'), {
      target: { value: organizationCreationTestParent.id },
    })
    fireEvent.change(screen.getByLabelText('名称'), {
      target: { value: '新部门' },
    })
    act(() => queryClient.setQueryData(['personnel', 'org-tree'], []))
    await waitFor(() =>
      expect(
        screen.queryByRole('option', { name: '总部' })
      ).not.toBeInTheDocument()
    )
    fireEvent.click(screen.getByRole('button', { name: '确认保存' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '所选父级组织已不可用'
    )
    expect(screen.getByLabelText('名称')).toHaveValue('新部门')
    expect(saveOrganization).not.toHaveBeenCalled()
    expect(personnelCreationTestNavigation).not.toHaveBeenCalled()
  })

  it.each(['organization', 'employee', 'account'] as const)(
    'cancels %s creation without saving or navigating',
    async (recordType) => {
      const saveOrganization = vi.spyOn(OrgService, 'saveOrgNode')
      const saveEmployee = vi.spyOn(EmployeeMaintenanceService, 'saveEmployee')
      const saveAccount = vi.spyOn(userApi, 'createUser')
      const { onOpenChange } = renderPersonnelCreationForm(recordType)
      fireEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: 'Close',
        })
      )
      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(personnelCreationTestNavigation).not.toHaveBeenCalled()
      expect(saveOrganization).not.toHaveBeenCalled()
      expect(saveEmployee).not.toHaveBeenCalled()
      expect(saveAccount).not.toHaveBeenCalled()
    }
  )
})
