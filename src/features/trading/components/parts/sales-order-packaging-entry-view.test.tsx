// @vitest-environment jsdom

import { Plus } from 'lucide-react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SalesOrderPackagingEntryTarget } from '../../hooks/use-sales-order-packaging-entry'
import {
  SalesOrderPackagingEntryView,
  type SalesOrderPackagingEntryStateMeta,
} from './sales-order-packaging-entry-view'

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'zh-CN',
  }),
}))

const baseStateMeta: SalesOrderPackagingEntryStateMeta = {
  badgeClassName: 'border-rose-500/20 bg-rose-500/10 text-rose-600',
  surfaceClassName: 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10',
  icon: Plus,
  title: '待建规则',
  hint: '还有 1 行缺少可用包装规则',
}

function buildCreateRuleTarget(): SalesOrderPackagingEntryTarget {
  const line = {
    lineNo: 1,
    productId: 'product-1',
    productDisplayTitle: 'Fork Alpha',
    productDisplaySubtitle: 'trail/disc/v2',
    qty: 10,
    uom: 'PCS',
    state: 'create_new' as const,
    selectedPackaging: undefined,
    matchedProfiles: [],
    candidateProfiles: [],
  }

  return {
    state: 'create_new',
    lineCount: 1,
    resolvedLineCount: 0,
    pendingSelectionLineCount: 0,
    createRuleLineCount: 1,
    missingProductLineCount: 0,
    lines: [line],
    actionLine: line,
  }
}

describe('SalesOrderPackagingEntryView', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders unavailable state when target is missing and not loading', () => {
    render(
      <SalesOrderPackagingEntryView
        orderId='order-1'
        target={null}
        profiles={[]}
        summary={null}
        stateMeta={baseStateMeta}
        warningCount={0}
        hasComputedSummary={false}
        lineSummaryText={null}
        isLoading={false}
        selectOpen={false}
        isSelectionPending={false}
        isFormSavePending={false}
        onSelectOpenChange={vi.fn()}
        onPersistLineSelection={vi.fn()}
        onStartCreateRule={vi.fn()}
        onEditRule={vi.fn()}
      />
    )

    expect(screen.getByText('暂无可配置包装入口')).toBeTruthy()
  })

  it('triggers create rule callback from the create_new line action', async () => {
    const user = userEvent.setup()
    const onStartCreateRule = vi.fn()

    render(
      <SalesOrderPackagingEntryView
        orderId='order-1'
        target={buildCreateRuleTarget()}
        profiles={[]}
        summary={null}
        stateMeta={baseStateMeta}
        warningCount={0}
        hasComputedSummary={false}
        lineSummaryText='待建规则行 1 · Fork Alpha · 10 PCS'
        isLoading={false}
        selectOpen={true}
        isSelectionPending={false}
        isFormSavePending={false}
        onSelectOpenChange={vi.fn()}
        onPersistLineSelection={vi.fn()}
        onStartCreateRule={onStartCreateRule}
        onEditRule={vi.fn()}
      />
    )

    await user.click(
      screen.getByRole('button', {
        name: 'logisticsConfig.packagingRules.addRule',
      })
    )

    expect(onStartCreateRule).toHaveBeenCalledWith(1, 'product-1')
    expect(onStartCreateRule).toHaveBeenCalledTimes(1)
  })

  it('renders display snapshot title and subtitle inside the popover line card', () => {
    render(
      <SalesOrderPackagingEntryView
        orderId='order-1'
        target={buildCreateRuleTarget()}
        profiles={[]}
        summary={null}
        stateMeta={baseStateMeta}
        warningCount={0}
        hasComputedSummary={false}
        lineSummaryText='待建规则行 1 · Fork Alpha · 10 PCS'
        isLoading={false}
        selectOpen={true}
        isSelectionPending={false}
        isFormSavePending={false}
        onSelectOpenChange={vi.fn()}
        onPersistLineSelection={vi.fn()}
        onStartCreateRule={vi.fn()}
        onEditRule={vi.fn()}
      />
    )

    expect(screen.getByText('Fork Alpha')).toBeTruthy()
    expect(screen.getByText('trail/disc/v2')).toBeTruthy()
    expect(screen.queryByText('MODEL-A')).toBeNull()
  })
})
