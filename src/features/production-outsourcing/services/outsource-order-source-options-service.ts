import { apiFetch } from '@/lib/api-client'
import { ensureArrayField, ensureObjectResponse } from '@/lib/api-response'
import { getSalesOrders } from '@/features/trading/sales/services/sales-query-service'

export interface OutsourceSalesOrderLineSourceOption {
  id: string
  lineNo: number
  productId: string
  productCode: string
  productName: string
  specification: string
  quantity: number
  uom: string
}

export interface OutsourceSalesOrderSourceOption {
  id: string
  orderNo: string
  customerId: string
  customerName: string
  quantity: number
  lines: OutsourceSalesOrderLineSourceOption[]
}

export interface OutsourceProductionPlanSourceOption {
  id: string
  orderNo: string
  productId: string
  productName: string
  quantity: number
  status: string
}

type ProductionPlanSourceApiItem = {
  id?: string
  orderNo?: string
  productId?: string
  productName?: string
  quantity?: number
  status?: string
}

interface ProductionPlanListApiResponse {
  items?: ProductionPlanSourceApiItem[]
}

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim() ?? '').find(Boolean) ?? ''
}

export async function getOutsourceSalesOrderSourceOptions(): Promise<
  OutsourceSalesOrderSourceOption[]
> {
  const page = await getSalesOrders({ pageSize: 100, withLines: true })
  return page.items.map((order) => ({
    id: order.id,
    orderNo: order.orderNo,
    customerId: order.customerId ?? '',
    customerName: order.customerName,
    quantity: order.quantity,
    lines: order.lines.map((line) => ({
      id: String(line.id ?? ''),
      lineNo: line.lineNo,
      productId: line.productId ?? '',
      productCode: firstNonEmpty(
        line.productDisplayCodeSnapshot,
        line.productCode,
        line.modelCodeSnapshot
      ),
      productName: firstNonEmpty(
        line.productDisplayFullLabelSnapshot,
        line.productDisplayTitleSnapshot,
        line.productModel,
        line.productCode
      ),
      specification: line.specification,
      quantity: line.qty,
      uom: line.uom || 'PCS',
    })),
  }))
}

export async function getOutsourceProductionPlanSourceOptions(): Promise<
  OutsourceProductionPlanSourceOption[]
> {
  const raw = await apiFetch<ProductionPlanListApiResponse>(
    '/production/plans?pageSize=100'
  )
  const response = ensureObjectResponse<
    ProductionPlanListApiResponse & Record<string, unknown>
  >(raw, 'OutsourceOrderSourceOptionsService.getProductionPlans')
  return ensureArrayField<ProductionPlanSourceApiItem>(
    response,
    'items',
    'OutsourceOrderSourceOptionsService.getProductionPlans'
  ).map((plan) => ({
    id: String(plan.id ?? ''),
    orderNo: String(plan.orderNo ?? ''),
    productId: String(plan.productId ?? ''),
    productName: String(plan.productName ?? ''),
    quantity: Number(plan.quantity ?? 0),
    status: String(plan.status ?? ''),
  }))
}
