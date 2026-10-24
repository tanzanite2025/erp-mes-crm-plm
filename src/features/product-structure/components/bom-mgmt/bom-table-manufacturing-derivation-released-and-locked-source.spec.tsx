// @vitest-environment jsdom
import { translate } from '@/locales'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type BOM } from '../../data/schema'
import { createEmptyBOMFormValue } from '../../utils/bom-form-defaults'
import { BOMTable } from './bom-table'

const lifecyclePermissions = vi.hoisted(() => ({ canPublish: true }))
vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({
    allowsAction: () => lifecyclePermissions.canPublish,
  }),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (
      key: Parameters<typeof translate>[1],
      values?: Parameters<typeof translate>[2]
    ) => translate('zh-CN', key, values),
  }),
}))
vi.mock('@/components/common/audit-timeline-trigger-button', () => ({
  AuditTimelineTriggerButton: () => null,
}))

afterEach(cleanup)
beforeEach(() => {
  lifecyclePermissions.canPublish = true
})

describe('manufacturing BOM derivation source in the real BOM table', () => {
  it('does not allow publishing a replacement revision with edit permission alone', () => {
    lifecyclePermissions.canPublish = false
    const onRevise = vi.fn()
    render(
      <BOMTable
        data={[
          createEmptyBOMFormValue({
            id: 'released-mbom',
            bomType: 'MBOM',
            status: 'RELEASED',
            isLocked: true,
          }),
        ]}
        products={[]}
        sections={[]}
        isLoading={false}
        onPreview={vi.fn()}
        onEdit={vi.fn()}
        onDerive={vi.fn()}
        onRevise={onRevise}
        onDelete={vi.fn()}
      />
    )
    const revision = screen.getByRole('button', {
      name: '需要 BOM 状态操作权限才能发布修订版本',
    })
    expect(revision).toBeDisabled()
    fireEvent.click(revision)
    expect(onRevise).not.toHaveBeenCalled()
  })
  it.each<{
    bomType: BOM['bomType']
    status: BOM['status']
    isLocked: boolean
    canDerive: boolean
  }>([
    { bomType: 'EBOM', status: 'DRAFT', isLocked: false, canDerive: false },
    { bomType: 'EBOM', status: 'DRAFT', isLocked: true, canDerive: false },
    { bomType: 'EBOM', status: 'REVIEWING', isLocked: false, canDerive: false },
    { bomType: 'EBOM', status: 'APPROVED', isLocked: false, canDerive: false },
    { bomType: 'EBOM', status: 'APPROVED', isLocked: true, canDerive: false },
    { bomType: 'EBOM', status: 'RELEASED', isLocked: false, canDerive: false },
    { bomType: 'EBOM', status: 'RELEASED', isLocked: true, canDerive: true },
    { bomType: 'EBOM', status: 'OBSOLETE', isLocked: true, canDerive: false },
    { bomType: 'MBOM', status: 'RELEASED', isLocked: true, canDerive: false },
  ])(
    '$bomType $status locked=$isLocked exposes derivation=$canDerive',
    ({ bomType, status, isLocked, canDerive }) => {
      const sourceBOM = createEmptyBOMFormValue({
        id: 'derivation-source',
        bomNo: 'BOM-SOURCE',
        productId: 'concrete-product',
        bomType,
        status,
        isLocked,
      })
      const onDerive = vi.fn()
      render(
        <BOMTable
          data={[sourceBOM]}
          products={[]}
          sections={[]}
          isLoading={false}
          onPreview={vi.fn()}
          onEdit={vi.fn()}
          onDerive={onDerive}
          onRevise={vi.fn()}
          onDelete={vi.fn()}
        />
      )

      const expectedStatusLabels = {
        DRAFT: '草稿',
        REVIEWING: '审核中',
        APPROVED: '已审核',
        RELEASED: '已发布',
        OBSOLETE: '已作废',
      }
      expect(
        screen.getByText(expectedStatusLabels[status], { exact: true })
      ).toBeInTheDocument()
      const deriveButton = screen.queryByRole('button', { name: '派生 MBOM' })
      if (canDerive) {
        expect(deriveButton).toBeEnabled()
        fireEvent.click(deriveButton!)
        expect(onDerive).toHaveBeenCalledExactlyOnceWith(sourceBOM)
      } else {
        expect(deriveButton).toBeNull()
        expect(onDerive).not.toHaveBeenCalled()
      }
    }
  )
})
