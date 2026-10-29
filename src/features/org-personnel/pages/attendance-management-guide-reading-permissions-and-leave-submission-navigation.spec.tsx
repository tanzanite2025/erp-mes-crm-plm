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
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { EmployeeCoreService } from '../services/employee-core-service'
import { LeaveService } from '../services/leave-service'
import { AttendanceManagementOperationGuidePage } from './attendance-management-operation-guide-page'

const attendanceGuideTestIdentity = vi.hoisted(() => ({
  isIdentitySynced: true,
  isSyncing: false,
  user: {
    permissions: ['tab_personnel_attendance_management_operation_guide'],
  },
}))
const attendanceGuideTestNavigation = vi.hoisted(() => vi.fn())

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    select: (state: typeof attendanceGuideTestIdentity) => unknown
  ) => select(attendanceGuideTestIdentity),
}))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => attendanceGuideTestNavigation,
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const attendanceGuideTestPreview = {
  employeeId: 'guide-leave-employee',
  employeeName: '指南请假员工',
  leaveType: 'annual' as const,
  startTime: '2026-10-28T01:00:00Z',
  endTime: '2026-10-28T10:00:00Z',
  durationDays: 0.5,
}
const attendanceGuideTestCreatedRequest = {
  ...attendanceGuideTestPreview,
  id: 'confirmed-leave',
  reason: '指南申请事由',
  status: 'PENDING' as const,
  version: 1,
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class AttendanceGuideTestResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  attendanceGuideTestIdentity.isIdentitySynced = true
  attendanceGuideTestIdentity.user.permissions = [
    'tab_personnel_attendance_management_operation_guide',
  ]
  vi.spyOn(EmployeeCoreService, 'getEmployees').mockResolvedValue([
    {
      id: 'guide-leave-employee',
      staffId: 'GUIDE001',
      name: '指南请假员工',
      phone: '',
      status: 'active',
      version: 1,
    },
  ])
  vi.spyOn(LeaveService, 'previewLeaveRequest').mockResolvedValue(
    attendanceGuideTestPreview
  )
  vi.spyOn(LeaveService, 'submitLeaveRequest').mockResolvedValue(
    attendanceGuideTestCreatedRequest
  )
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function renderAttendanceManagementGuide(locale: 'zh-CN' | 'en-US' = 'zh-CN') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider
        defaultLocale={locale}
        storageKey='attendance-guide-test-language'
      >
        <AttendanceManagementOperationGuidePage />
      </LanguageProvider>
    </QueryClientProvider>
  )
  return queryClient
}

function selectAttendanceManagementGuideChapter(name: string) {
  fireEvent.mouseDown(screen.getByRole('tab', { name }), {
    button: 0,
    ctrlKey: false,
  })
}

async function openAndFillGuideLeaveRequest() {
  attendanceGuideTestIdentity.user.permissions = ['menu_org']
  const queryClient = renderAttendanceManagementGuide()
  selectAttendanceManagementGuideChapter('如何办理请假')
  expect(EmployeeCoreService.getEmployees).not.toHaveBeenCalled()
  const launcher = screen.getByRole('button', { name: '新建请假申请' })
  expect(launcher).toHaveClass('rounded-full')
  fireEvent.click(launcher)
  const dialog = await screen.findByRole('dialog', { name: '新建请假申请' })
  await waitFor(() =>
    expect(EmployeeCoreService.getEmployees).toHaveBeenCalledOnce()
  )
  fireEvent.click(within(dialog).getAllByRole('combobox')[0])
  fireEvent.click(await screen.findByRole('option', { name: /指南请假员工/ }))
  fireEvent.change(screen.getByLabelText('开始时间'), {
    target: { value: '2026-10-28T09:00' },
  })
  fireEvent.change(screen.getByLabelText('结束时间'), {
    target: { value: '2026-10-28T18:00' },
  })
  fireEvent.change(screen.getByLabelText('请假事由'), {
    target: { value: '指南申请事由' },
  })
  return queryClient
}

describe('attendance guide reading and business permission boundaries', () => {
  it('keeps five chapters outside the scrolling body and reads them without business requests', () => {
    const fetchBusinessData = vi.fn()
    vi.stubGlobal('fetch', fetchBusinessData)
    renderAttendanceManagementGuide()
    const chapterNavigation = screen.getByRole('tablist', {
      name: '出勤管理指南目录',
    })
    const readingArea = screen.getByRole('region', { name: '出勤管理指南正文' })
    expect(readingArea).not.toContainElement(chapterNavigation)
    expect(within(chapterNavigation).getAllByRole('tab')).toHaveLength(5)
    for (const chapter of within(chapterNavigation).getAllByRole('tab')) {
      readingArea.scrollTop = 250
      fireEvent.mouseDown(chapter, { button: 0, ctrlKey: false })
      expect(chapter).toHaveAttribute('aria-selected', 'true')
      expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: '新建请假申请' })
      ).not.toBeInTheDocument()
    }
    expect(readingArea.scrollTop).toBe(0)
    expect(EmployeeCoreService.getEmployees).not.toHaveBeenCalled()
    expect(fetchBusinessData).not.toHaveBeenCalled()
  })

  it('separates read access, business destinations and the API permission needed to submit', () => {
    attendanceGuideTestIdentity.user.permissions.push(
      'tab_attendance_management_leave'
    )
    renderAttendanceManagementGuide()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: '打开请假管理' })).toHaveAttribute(
      'href',
      '/attendance-management/leave'
    )
    selectAttendanceManagementGuideChapter('如何办理请假')
    expect(
      screen.queryByRole('button', { name: '新建请假申请' })
    ).not.toBeInTheDocument()
    cleanup()
    attendanceGuideTestIdentity.user.permissions = ['menu_org']
    attendanceGuideTestIdentity.isIdentitySynced = false
    renderAttendanceManagementGuide()
    selectAttendanceManagementGuideChapter('如何办理请假')
    expect(
      screen.queryByRole('button', { name: '新建请假申请' })
    ).not.toBeInTheDocument()
  })

  it('documents actual duration, approval and ranking limitations in Chinese and English', () => {
    renderAttendanceManagementGuide()
    selectAttendanceManagementGuideChapter('如何办理请假')
    expect(screen.getByText(/未扣除周末、节假日或休息时段/)).toBeInTheDocument()
    expect(screen.getByText(/未提供直接批准或拒绝的操作/)).toBeInTheDocument()
    selectAttendanceManagementGuideChapter('如何查看优秀员工榜')
    expect(screen.getByText(/未按月份筛选/)).toBeInTheDocument()
    expect(screen.getByText(/未使用设备打卡事件计算出勤率/)).toBeInTheDocument()
    cleanup()
    renderAttendanceManagementGuide('en-US')
    expect(
      screen.getByRole('heading', {
        name: 'Attendance Management Operation Guide',
      })
    ).toBeInTheDocument()
    selectAttendanceManagementGuideChapter('Reading the employee ranking')
    expect(screen.getByText(/without a monthly filter/)).toBeInTheDocument()
  })
})

describe('shared leave form confirmation and navigation from the guide', () => {
  it('loads employees only after opening, retains the guide after preview and discards a canceled draft without navigating', async () => {
    await openAndFillGuideLeaveRequest()
    fireEvent.click(screen.getByRole('button', { name: '试算请假时长' }))
    await waitFor(() =>
      expect(LeaveService.previewLeaveRequest).toHaveBeenCalledOnce()
    )
    expect(await screen.findByText('0.5')).toBeInTheDocument()
    expect(attendanceGuideTestNavigation).not.toHaveBeenCalled()
    expect(LeaveService.submitLeaveRequest).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(attendanceGuideTestNavigation).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '新建请假申请' }))
    expect(await screen.findByLabelText('请假事由')).toHaveValue('')
  })

  it('retains failed drafts and navigates only after a confirmed save, blocking duplicate submissions and closing while pending', async () => {
    const queryClient = await openAndFillGuideLeaveRequest()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    vi.mocked(LeaveService.previewLeaveRequest).mockRejectedValueOnce(
      new Error('试算失败')
    )
    fireEvent.click(screen.getByRole('button', { name: '试算请假时长' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '试算请假时长' })
      ).not.toBeDisabled()
    )
    expect(attendanceGuideTestNavigation).not.toHaveBeenCalled()
    expect(screen.getByLabelText('请假事由')).toHaveValue('指南申请事由')
    vi.mocked(LeaveService.submitLeaveRequest).mockRejectedValueOnce(
      new Error('提交失败')
    )
    fireEvent.click(screen.getByRole('button', { name: '提交请假申请' }))
    await waitFor(() =>
      expect(LeaveService.submitLeaveRequest).toHaveBeenCalledOnce()
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '提交请假申请' })
      ).not.toBeDisabled()
    )
    expect(screen.getByLabelText('请假事由')).toHaveValue('指南申请事由')
    expect(attendanceGuideTestNavigation).not.toHaveBeenCalled()
    let confirmLeaveSubmission: (
      value: typeof attendanceGuideTestCreatedRequest
    ) => void = () => undefined
    vi.mocked(LeaveService.submitLeaveRequest).mockImplementation(
      () =>
        new Promise((resolve) => {
          confirmLeaveSubmission = resolve
        })
    )
    fireEvent.click(screen.getByRole('button', { name: '提交请假申请' }))
    await waitFor(() =>
      expect(LeaveService.submitLeaveRequest).toHaveBeenCalledTimes(2)
    )
    expect(screen.getByRole('button', { name: '提交请假申请' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '关闭' })).toBeDisabled()
    fireEvent.submit(document.getElementById('leave-action-form')!)
    expect(LeaveService.submitLeaveRequest).toHaveBeenCalledTimes(2)
    expect(attendanceGuideTestNavigation).not.toHaveBeenCalled()
    await act(async () =>
      confirmLeaveSubmission(attendanceGuideTestCreatedRequest)
    )
    await waitFor(() =>
      expect(attendanceGuideTestNavigation).toHaveBeenCalledExactlyOnceWith({
        to: '/attendance-management/leave',
      })
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['personnel', 'leaves', 'list'],
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['personnel', 'leaves', 'stats'],
    })
  })
})
