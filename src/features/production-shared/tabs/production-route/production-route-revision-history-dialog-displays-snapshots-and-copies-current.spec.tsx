// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import type { ProductionRoute } from '../../data/production-route'
import { ProductionRouteRevisionHistoryDialog } from './production-route-revision-history-dialog'

function createRouteRevision(
  id: string,
  revisionNo: number,
  options: { current?: boolean; basedOnRouteId?: string; processName?: string }
): ProductionRoute {
  return {
    id,
    routeFamilyId: 'family-g24',
    revisionNo,
    basedOnRouteId: options.basedOnRouteId ?? '',
    isCurrentRevision: options.current ?? false,
    code: 'G24-ROUTE',
    name: `G24 路线 R${revisionNo}`,
    productId: 'product-g24',
    productSKU: 'G24',
    productName: 'G24 产品',
    bomOwnerType: 'INTERNAL',
    bomOwnerCustomerId: '',
    bomOwnerCustomerName: '',
    bomVersionLevel: 'standard',
    description: `修订 ${revisionNo} 的说明`,
    version: 1,
    status: 'PUBLISHED',
    createdAt: '',
    updatedAt: '',
    steps: [
      {
        id: `step-${revisionNo}`,
        routeId: id,
        sequence: 1,
        branchOperationId: 'operation-g24',
        branchOperationName: options.processName ?? 'G24 成型',
        executionMode: 'IN_HOUSE',
        qualityGate: 'REQUIRED',
        estimatedMinutes: 18,
        transferRequired: true,
        description: `步骤快照 ${revisionNo}`,
        qualityRouting: undefined,
      },
    ],
  }
}

afterEach(() => cleanup())

describe('ProductionRouteRevisionHistoryDialog', () => {
  it('shows immutable revision snapshots and copies the current published revision', () => {
    const onCreateRevision = vi.fn()
    const revisionOne = createRouteRevision('route-r1', 1, {
      processName: '旧版成型名称',
    })
    const revisionTwo = createRouteRevision('route-r2', 2, {
      current: true,
      basedOnRouteId: revisionOne.id,
      processName: '当前成型名称',
    })

    render(
      <LanguageProvider defaultLocale='zh-CN'>
        <ProductionRouteRevisionHistoryDialog
          open
          routes={[revisionOne, revisionTwo]}
          canManage
          isCheckingPermission={false}
          isCreatingRevision={false}
          onOpenChange={vi.fn()}
          onCreateRevision={onCreateRevision}
        />
      </LanguageProvider>
    )

    expect(screen.getByText('路线修订历史')).toBeTruthy()
    expect(screen.getByText('旧版成型名称')).toBeTruthy()
    expect(screen.getByText('当前成型名称')).toBeTruthy()
    expect(screen.getByText('步骤快照 1')).toBeTruthy()
    expect(screen.getByText('步骤快照 2')).toBeTruthy()
    expect(screen.getByText('当前发布')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '复制为新修订' }))

    expect(onCreateRevision).toHaveBeenCalledWith(revisionTwo)
    expect(onCreateRevision).not.toHaveBeenCalledWith(revisionOne)
  })
})
