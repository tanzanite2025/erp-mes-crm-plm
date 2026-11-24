// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { translate } from '@/locales'
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
import { getSidebarData } from '@/components/layout/data/sidebar-data'
import { resolveActiveSidebarPath } from '@/components/layout/sidebar-active-path'
import { checkIsActive } from '@/components/layout/sidebar-nav-utils'
import { getAuthenticatedRoutePaths } from '@/features/authz/data/authenticated-route-paths'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import { resolveRecentVisitLabelKey } from '@/features/recent-visits/recent-visit-labels'
import { getQualityStandardCreationGuideTabs } from '../tab-config'
import type { ControlledProtocolDraft } from '../types/controlled-protocol'
import { QualityStandardCreationOperationGuidePage } from './quality-standard-creation-operation-guide-page'

const qualityGuideAccount = vi.hoisted(() => ({
  isSyncing: false,
  isIdentitySynced: true,
  user: { permissions: ['menu_quality'] },
}))
const qualityGuideSaveStandardMutation = vi.hoisted(() => ({
  isPending: false,
  mutateAsync: vi.fn().mockResolvedValue({}),
}))
const qualityGuideCreationDraft = vi.hoisted(() => ({
  productId: 'quality-guide-product',
  productName: '指南验证产品',
  criteria: [
    {
      id: 'quality-guide-weight-item',
      itemName: '内圈重量',
      inspectionStageId: 'forming-inspection-station',
      inspectionStageName: '成型检验站',
      targetWeight: 450,
      unit: 'G',
      gradingMode: 'DEVIATION_BANDS' as const,
      levels: [
        {
          level: '合格',
          lowerTolerance: 5,
          upperTolerance: 6,
          result: 'PASS' as const,
        },
      ],
    },
  ],
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: typeof qualityGuideAccount) => unknown) =>
    select(qualityGuideAccount),
}))
vi.mock('../hooks/use-quality', () => ({
  useQualityMutations: () => ({
    saveStandardMutation: qualityGuideSaveStandardMutation,
  }),
}))
vi.mock('../components/controlled-protocol-dialog', () => ({
  ControlledProtocolDialog: ({
    open,
    onOpenChange,
    onSubmit,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (draft: ControlledProtocolDraft) => Promise<void>
  }) =>
    open ? (
      <div role='dialog' aria-label='quality-standard-creation-dialog'>
        <input aria-label='guide creation draft input' defaultValue='450' />
        <button onClick={() => void onSubmit(qualityGuideCreationDraft)}>
          Submit guide creation draft
        </button>
        <button onClick={() => onOpenChange(false)}>
          Cancel guide creation
        </button>
      </div>
    ) : null,
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

beforeEach(() => {
  qualityGuideAccount.isSyncing = false
  qualityGuideAccount.isIdentitySynced = true
  qualityGuideAccount.user.permissions = ['menu_quality']
  qualityGuideSaveStandardMutation.isPending = false
  qualityGuideSaveStandardMutation.mutateAsync
    .mockReset()
    .mockResolvedValue({ id: 'quality-guide-created-standard' })
})
afterEach(cleanup)

function renderQualityStandardCreationOperationGuide(
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
) {
  return render(
    <LanguageProvider
      defaultLocale={locale}
      storageKey='quality-standard-guide-test-language'
    >
      <QualityStandardCreationOperationGuidePage />
    </LanguageProvider>
  )
}

describe('quality standard creation handbook', () => {
  it('provides five readable chapters, correct grading boundaries and a separate publication step', () => {
    renderQualityStandardCreationOperationGuide()
    expect(
      screen.getByRole('heading', { name: '如何建立品质标准' })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(5)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '打开品质标准列表' })
    ).toHaveAttribute('href', '/quality/standards')
    expect(
      screen.queryByRole('link', { name: '查看产品资料' })
    ).not.toBeInTheDocument()
    const readingArea = screen.getByRole('region', {
      name: '品质标准建立指南正文',
    })
    readingArea.scrollTop = 300
    fireEvent.mouseDown(screen.getByRole('tab', { name: '设置数值与分级' }), {
      button: 0,
      ctrlKey: false,
    })
    expect(readingArea.scrollTop).toBe(0)
    expect(screen.getByText(/上下允许偏差分别逐级递增/)).toBeInTheDocument()
    expect(
      screen.getByText(/小于 442 g 或大于 458 g 判为不合格，报废等处置另行确认/)
    ).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('tab', { name: '审批与发布' }), {
      button: 0,
      ctrlKey: false,
    })
    expect(
      screen.getByText(/执行发布并确认状态为“已发布”后/)
    ).toBeInTheDocument()
  })

  it('opens the existing creation dialog only for quality standard managers', async () => {
    qualityGuideAccount.user.permissions = [
      'menu_quality',
      'menu_engineering',
      'perm_manage',
    ]
    renderQualityStandardCreationOperationGuide()
    fireEvent.click(screen.getByRole('button', { name: '直接建立品质标准' }))
    expect(
      await screen.findByRole('dialog', {
        name: 'quality-standard-creation-dialog',
      })
    ).toBeInTheDocument()
  })

  it.each([
    ['tab_quality_standard_creation_guide'],
    ['menu_quality'],
    ['menu_quality', 'perm_manage'],
    ['menu_engineering', 'perm_manage'],
    ['menu_quality', 'menu_engineering'],
  ])(
    'keeps the handbook readable without a creation entry for %j',
    (...permissions) => {
      qualityGuideAccount.user.permissions = permissions
      renderQualityStandardCreationOperationGuide()
      expect(
        screen.getByRole('heading', { name: '如何建立品质标准' })
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: '直接建立品质标准' })
      ).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(
        qualityGuideSaveStandardMutation.mutateAsync
      ).not.toHaveBeenCalled()
    }
  )

  it('keeps creation hidden until the permission identity has synchronized', () => {
    qualityGuideAccount.user.permissions = [
      'menu_quality',
      'menu_engineering',
      'perm_manage',
    ]
    qualityGuideAccount.isIdentitySynced = false
    renderQualityStandardCreationOperationGuide()
    expect(
      screen.queryByRole('button', { name: '直接建立品质标准' })
    ).not.toBeInTheDocument()
  })

  it('preserves the open draft after a failed save and closes only after a successful retry', async () => {
    qualityGuideAccount.user.permissions = [
      'menu_quality',
      'menu_engineering',
      'perm_manage',
    ]
    qualityGuideSaveStandardMutation.mutateAsync.mockRejectedValueOnce(
      new Error('isolated guide draft save failed')
    )
    renderQualityStandardCreationOperationGuide()
    fireEvent.click(screen.getByRole('button', { name: '直接建立品质标准' }))
    const submitDraft = await screen.findByRole('button', {
      name: 'Submit guide creation draft',
    })
    fireEvent.change(screen.getByLabelText('guide creation draft input'), {
      target: { value: '451' },
    })
    await act(async () => fireEvent.click(submitDraft))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('guide creation draft input')).toHaveValue(
      '451'
    )
    await act(async () => fireEvent.click(submitDraft))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(qualityGuideSaveStandardMutation.mutateAsync).toHaveBeenCalledTimes(
      2
    )
    expect(
      qualityGuideSaveStandardMutation.mutateAsync
    ).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        productId: qualityGuideCreationDraft.productId,
        productName: qualityGuideCreationDraft.productName,
        status: 'DRAFT',
        items: [
          expect.objectContaining({
            inspectionStageId: 'forming-inspection-station',
            inspectionStageName: '成型检验站',
            name: '内圈重量',
            centerValue: 450,
            unit: 'G',
            levels: qualityGuideCreationDraft.criteria[0].levels,
          }),
        ],
      }),
      successMessage: expect.any(String),
    })
    expect(
      screen.getByRole('heading', { name: '如何建立品质标准' })
    ).toBeInTheDocument()
  })

  it('submits one draft when confirmation is clicked twice before the mutation rerenders', async () => {
    qualityGuideAccount.user.permissions = [
      'menu_quality',
      'menu_engineering',
      'perm_manage',
    ]
    let finishSavingDraft = (_savedStandard: object) => {}
    qualityGuideSaveStandardMutation.mutateAsync.mockReturnValueOnce(
      new Promise((resolve) => {
        finishSavingDraft = resolve
      })
    )
    renderQualityStandardCreationOperationGuide()
    fireEvent.click(screen.getByRole('button', { name: '直接建立品质标准' }))
    const submitDraft = await screen.findByRole('button', {
      name: 'Submit guide creation draft',
    })
    fireEvent.click(submitDraft)
    fireEvent.click(submitDraft)
    expect(qualityGuideSaveStandardMutation.mutateAsync).toHaveBeenCalledOnce()
    await act(async () =>
      finishSavingDraft({ id: 'quality-guide-created-standard' })
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('allows guide-only readers without exposing business page links and supports English', () => {
    qualityGuideAccount.user.permissions = [
      'tab_quality_standard_creation_guide',
    ]
    renderQualityStandardCreationOperationGuide('en-US')
    expect(
      screen.getByRole('heading', { name: 'How to Create a Quality Standard' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    fireEvent.mouseDown(
      screen.getByRole('tab', { name: 'Set Values and Grades' }),
      { button: 0, ctrlKey: false }
    )
    expect(
      screen.getByText(
        /below 442 or above 458 g fails; disposal is confirmed separately/
      )
    ).toBeInTheDocument()
  })

  it('registers the guide and selects only its handbook branch with domain or guide-only permission', () => {
    const route = '/quality/standard-creation-guide'
    const translateQualityGuideLabel = (key: Parameters<typeof translate>[1]) =>
      translate('zh-CN', key)
    expect(getAuthenticatedRoutePaths()).toContain(route)
    expect(resolveRecentVisitLabelKey(route)).toBe(
      'quality.standardCreationGuide.title'
    )
    expect(
      getQualityStandardCreationGuideTabs(translateQualityGuideLabel)[0]
    ).toMatchObject({ href: route, label: '如何建立品质标准' })
    for (const permissions of [
      ['menu_quality'],
      ['tab_quality_standard_creation_guide'],
    ]) {
      const groups = getAccessibleNavGroups(
        { permissions },
        getSidebarData(translateQualityGuideLabel).navGroups
      )
      expect(resolveActiveSidebarPath(groups, route)?.nodeIds).toEqual([
        'quality-handbook-group',
        'quality-standard-creation-handbook',
      ])
      const standards = groups
        .find((group) => group.id === 'quality-management')
        ?.children.find((node) => node.id === 'quality-standards-group')
      if (standards) expect(checkIsActive(route, standards)).toBe(false)
    }
    const unrelatedGroups = getAccessibleNavGroups(
      { permissions: ['menu_dashboard'] },
      getSidebarData(translateQualityGuideLabel).navGroups
    )
    expect(
      unrelatedGroups.some((group) => group.id === 'quality-management')
    ).toBe(false)
  })
})
