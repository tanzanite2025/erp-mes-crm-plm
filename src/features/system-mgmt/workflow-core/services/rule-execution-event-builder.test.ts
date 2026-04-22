import { describe, expect, it } from 'vitest'
import {
  buildLiveRuleExecutionEvent,
  buildRetroactiveOrderRuleExecutionEvent,
  buildRetroactiveProductionPlanRuleExecutionEvent,
  buildRetroactiveProductionTaskRuleExecutionEvent,
  buildRetroactivePurchaseOrderRuleExecutionEvent,
} from './rule-execution-event-builder'

describe('rule-execution-event-builder', () => {
  it('builds the live event payload expected by the shared execution core', () => {
    expect(
      buildLiveRuleExecutionEvent('ORDER_EVENT', {
        action: 'STATUS_CHANGED',
        sourceCode: 'SALES_ORDER',
        targetStatus: 'Pending',
        priority: 'info',
        metadata: {
          orderId: 'order-1',
          OrderId: 'order-1',
        },
      })
    ).toEqual({
      type: 'ORDER_EVENT',
      action: 'STATUS_CHANGED',
      sourceCode: 'SALES_ORDER',
      targetStatus: 'Pending',
      priority: 'info',
      metadata: {
        orderId: 'order-1',
        OrderId: 'order-1',
      },
    })
  })

  it('builds the retroactive order event payload expected by the shared execution core', () => {
    expect(
      buildRetroactiveOrderRuleExecutionEvent({
        id: 'order-1',
        orderNo: 'SO-001',
        status: 'Pending',
        createdBy: 'alice',
        lines: [
          {
            productModel: 'Cable-X1',
            claimedBy: 'bob',
          },
        ],
      })
    ).toEqual({
      type: 'ORDER_EVENT',
      action: 'STATUS_CHANGED',
      sourceCode: 'SALES_ORDER',
      targetStatus: 'Pending',
      actionUrl: '/trading/sales-orders?search=SO-001&detailId=order-1',
      metadata: {
        id: 'order-1',
        orderId: 'order-1',
        OrderId: 'order-1',
        orderNo: 'SO-001',
        OrderNo: 'SO-001',
        status: 'Pending',
        createdBy: 'alice',
        claimedBy: 'bob',
        ProductName: 'Cable-X1',
        sourceCode: 'SALES_ORDER',
        lines: [
          {
            productModel: 'Cable-X1',
            claimedBy: 'bob',
          },
        ],
      },
    })
  })

  it('builds the retroactive purchase order event payload expected by the shared execution core', () => {
    expect(
      buildRetroactivePurchaseOrderRuleExecutionEvent({
        id: 'po-1',
        orderNo: 'PO-001',
        status: 'Awaiting',
        supplierName: 'Shenzhen Metals',
        purchaser: 'Iris',
        lines: [
          {
            materialName: 'Copper Sheet',
          },
        ],
      })
    ).toEqual({
      type: 'ORDER_EVENT',
      action: 'STATUS_CHANGED',
      sourceCode: 'PURCHASE_ORDER',
      targetStatus: 'Awaiting',
      actionUrl: '/purchase/orders?search=PO-001&detailId=po-1',
      metadata: {
        id: 'po-1',
        purchaseOrderId: 'po-1',
        PurchaseOrderId: 'po-1',
        orderId: 'po-1',
        OrderId: 'po-1',
        purchaseOrderNo: 'PO-001',
        PurchaseOrderNo: 'PO-001',
        orderNo: 'PO-001',
        OrderNo: 'PO-001',
        status: 'Awaiting',
        supplierName: 'Shenzhen Metals',
        SupplierName: 'Shenzhen Metals',
        purchaser: 'Iris',
        Purchaser: 'Iris',
        MaterialName: 'Copper Sheet',
        sourceCode: 'PURCHASE_ORDER',
        lines: [
          {
            materialName: 'Copper Sheet',
          },
        ],
      },
    })
  })

  it('builds the retroactive production task event payload expected by the shared execution core', () => {
    expect(
      buildRetroactiveProductionTaskRuleExecutionEvent({
        id: 'task-1',
        planId: 'plan-1',
        status: 'RUNNING',
        batchNo: 'B-001',
        processName: 'Spoke drilling',
        operator: 'alice',
        orderNo: 'SO-001',
        productName: 'Wheel Hub',
        targetQty: 100,
        actualQty: 40,
      })
    ).toEqual({
      type: 'TASK_ASSIGNED',
      action: 'STATUS_CHANGED',
      sourceCode: 'PRODUCTION_TASK',
      targetStatus: 'RUNNING',
      actionUrl: '/dashboard/calendar?planId=plan-1',
      metadata: {
        id: 'task-1',
        taskId: 'task-1',
        TaskId: 'task-1',
        planId: 'plan-1',
        PlanId: 'plan-1',
        status: 'RUNNING',
        batchNo: 'B-001',
        BatchNo: 'B-001',
        processName: 'Spoke drilling',
        ProcessName: 'Spoke drilling',
        operator: 'alice',
        Operator: 'alice',
        orderNo: 'SO-001',
        OrderNo: 'SO-001',
        productName: 'Wheel Hub',
        ProductName: 'Wheel Hub',
        targetQty: 100,
        TargetQty: 100,
        actualQty: 40,
        ActualQty: 40,
        sourceCode: 'PRODUCTION_TASK',
      },
    })
  })

  it('builds the retroactive production plan event payload expected by the shared execution core', () => {
    expect(
      buildRetroactiveProductionPlanRuleExecutionEvent({
        id: 'plan-1',
        status: 'COMPLETED',
        orderNo: 'SO-001',
        productName: 'Wheel Hub',
        quantity: 100,
        startDate: '2026-04-20T00:00:00.000Z',
        endDate: '2026-04-21T00:00:00.000Z',
      })
    ).toEqual({
      type: 'SYSTEM_NOTICE',
      action: 'STATUS_CHANGED',
      sourceCode: 'PRODUCTION_PLAN',
      targetStatus: 'COMPLETED',
      actionUrl: '/dashboard/calendar?planId=plan-1',
      metadata: {
        id: 'plan-1',
        planId: 'plan-1',
        PlanId: 'plan-1',
        status: 'COMPLETED',
        orderNo: 'SO-001',
        OrderNo: 'SO-001',
        productName: 'Wheel Hub',
        ProductName: 'Wheel Hub',
        quantity: 100,
        Quantity: 100,
        startDate: '2026-04-20T00:00:00.000Z',
        StartDate: '2026-04-20T00:00:00.000Z',
        endDate: '2026-04-21T00:00:00.000Z',
        EndDate: '2026-04-21T00:00:00.000Z',
        sourceCode: 'PRODUCTION_PLAN',
      },
    })
  })
})
