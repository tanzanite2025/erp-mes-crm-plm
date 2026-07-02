import { type Edge, type Node } from 'reactflow'

type BlueprintNodeStatus = 'PRIMARY' | 'HEALTHY' | 'ALERT' | 'CRITICAL'

export interface OrderBlueprintOrder {
  id?: string
  orderNo: string
  customer: string
  target: number
  completed: number
  wip: number
}

export interface OrderBlueprintGraph {
  nodes: Node[]
  edges: Edge[]
}

function normalizeQuantity(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function resolveGapStatus(
  remaining: number,
  target: number
): BlueprintNodeStatus {
  if (remaining <= 0) return 'HEALTHY'
  return remaining > target * 0.3 ? 'CRITICAL' : 'ALERT'
}

export function createFallbackOrderBlueprintOrder(
  orderNo = 'UNASSIGNED'
): OrderBlueprintOrder {
  return {
    orderNo,
    customer: 'Unknown Customer',
    target: 1,
    completed: 0,
    wip: 0,
  }
}

export function createOrderBlueprintGraph(
  order: OrderBlueprintOrder
): OrderBlueprintGraph {
  const target = Math.max(1, normalizeQuantity(order.target))
  const completed = Math.min(target, normalizeQuantity(order.completed))
  const wip = Math.min(target - completed, normalizeQuantity(order.wip))
  const remaining = Math.max(0, target - completed - wip)
  const activeTotal = completed + wip
  const gapStatus = resolveGapStatus(remaining, target)

  const nodes: Node[] = [
    {
      id: 'node-requested',
      type: 'mrpNode',
      position: { x: 0, y: 180 },
      data: {
        label: 'Order',
        title: `#${order.orderNo}`,
        subtitle: order.customer,
        quantity: target,
        unit: 'PCS',
        status: 'PRIMARY',
        icon: 'box',
      },
    },
    {
      id: 'node-router',
      type: 'routerNode',
      position: { x: 300, y: 210 },
      data: {},
    },
    {
      id: 'node-completed',
      type: 'mrpNode',
      position: { x: 520, y: 40 },
      data: {
        label: 'Completed',
        title: 'Finished Qty',
        subtitle: `${completed}/${target}`,
        quantity: completed,
        unit: 'PCS',
        status: completed >= target ? 'HEALTHY' : 'PRIMARY',
        icon: 'check-circle',
      },
    },
    {
      id: 'node-wip',
      type: 'mrpNode',
      position: { x: 520, y: 210 },
      data: {
        label: 'WIP',
        title: 'In Production',
        subtitle: `${activeTotal}/${target} active`,
        quantity: wip,
        unit: 'PCS',
        status: wip > 0 ? 'ALERT' : 'PRIMARY',
        icon: 'factory',
      },
    },
    {
      id: 'node-gap',
      type: 'mrpNode',
      position: { x: 520, y: 380 },
      data: {
        label: 'Gap',
        title: remaining > 0 ? 'Pending Qty' : 'No Gap',
        subtitle: remaining > 0 ? 'Requires scheduling' : 'Target covered',
        quantity: remaining,
        unit: 'PCS',
        status: gapStatus,
        icon: remaining > 0 ? 'alert' : 'warehouse',
      },
    },
    {
      id: 'node-delivery',
      type: 'mrpNode',
      position: { x: 900, y: 210 },
      data: {
        label: 'Delivery',
        title: remaining > 0 ? 'At Risk' : 'Ready',
        subtitle: `${activeTotal}/${target} covered`,
        quantity: activeTotal,
        unit: 'PCS',
        status: gapStatus,
        icon: remaining > 0 ? 'truck' : 'check-circle',
      },
    },
  ]

  const edges: Edge[] = [
    {
      id: 'e-order-router',
      source: 'node-requested',
      target: 'node-router',
      animated: true,
    },
    {
      id: 'e-router-completed',
      source: 'node-router',
      target: 'node-completed',
      style: { strokeWidth: 2 },
    },
    {
      id: 'e-router-wip',
      source: 'node-router',
      target: 'node-wip',
      style: { strokeWidth: 2 },
    },
    {
      id: 'e-router-gap',
      source: 'node-router',
      target: 'node-gap',
      style: { strokeWidth: 2 },
    },
    {
      id: 'e-completed-delivery',
      source: 'node-completed',
      target: 'node-delivery',
      type: 'smoothstep',
    },
    {
      id: 'e-wip-delivery',
      source: 'node-wip',
      target: 'node-delivery',
      type: 'smoothstep',
      animated: wip > 0,
    },
    {
      id: 'e-gap-delivery',
      source: 'node-gap',
      target: 'node-delivery',
      type: 'smoothstep',
      animated: remaining > 0,
    },
  ]

  return { nodes, edges }
}
