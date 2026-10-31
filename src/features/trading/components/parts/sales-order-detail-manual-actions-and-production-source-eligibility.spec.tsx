// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SALES_ORDER_PRODUCTION_SOURCE_STATUSES,
  isSalesOrderStatusEligibleForProduction,
} from '../../data/sales-order-production-source-eligibility'
import { createEmptySalesOrderDraft, type SalesOrder } from '../../data/schema'
import { SalesOrderDetailHeader } from './sales-order-detail-header'

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))

afterEach(cleanup)

describe('sales order manual actions and production sources', () => {
  it('ignores legacy production action flags while keeping confirmation and print actions', () => {
    const onMutateStatus = vi.fn()
    const onPrint = vi.fn()
    const order: SalesOrder = {
      ...createEmptySalesOrderDraft('SO-TEST'),
      id: 'order-1',
      createdAt: '',
      updatedAt: '',
      isDeleted: false,
      status: 'Draft',
      availableActions: [
        { action: 'submitPending', allowed: true },
        { action: 'cancel', allowed: true },
        { action: 'startScheduling', allowed: true },
        { action: 'startProduction', allowed: true },
        { action: 'markDone', allowed: true },
      ],
    }
    render(
      <SalesOrderDetailHeader
        order={order}
        isClaimAction={false}
        onMutateStatus={onMutateStatus}
        onPrint={onPrint}
      />
    )
    expect(screen.getAllByRole('button')).toHaveLength(3)
    fireEvent.click(
      screen.getByRole('button', {
        name: 'tradingSalesOrder.detail.submitPending',
      })
    )
    expect(onMutateStatus).toHaveBeenCalledWith({ status: 'Pending' })
    fireEvent.click(
      screen.getByRole('button', { name: 'tradingSalesOrder.print.printOrder' })
    )
    expect(onPrint).toHaveBeenCalledOnce()
  })

  it('permits confirmed active orders throughout production preparation', () => {
    expect(SALES_ORDER_PRODUCTION_SOURCE_STATUSES).toEqual([
      'Pending',
      'Scheduling',
      'InProgress',
    ])
    for (const status of SALES_ORDER_PRODUCTION_SOURCE_STATUSES) {
      expect(isSalesOrderStatusEligibleForProduction(status)).toBe(true)
    }
    for (const status of ['Draft', 'Done', 'Canceled'] as const) {
      expect(isSalesOrderStatusEligibleForProduction(status)).toBe(false)
    }
  })
})
