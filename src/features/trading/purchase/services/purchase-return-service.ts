import { apiFetch } from '@/lib/api-client'
import { ensureArrayField, ensureObjectResponse } from '@/lib/api-response'
import type { OrderEvidence, PurchaseOrder } from '../../data/schema'
import { toPurchaseOrderContract } from '../adapters/purchase-order-api-adapter'
import type {
  CreatePurchaseReturnResponseApiDTO,
  PurchaseReturnApiDTO,
  PurchaseReturnLineApiDTO,
  PurchaseReturnListPageApiDTO,
} from '../contracts/purchase-return-api-dto'

export interface PurchaseReturnLine {
  id: number
  purchaseOrderLineId: number
  lineNo: number
  materialId: string
  materialCode: string
  materialName: string
  specification: string
  uom: string
  quantity: number
  price: number
  amount: number
  issueCategory?: string
  reason?: string
  evidences?: OrderEvidence[]
}

export interface PurchaseReturnRecord {
  id: string
  returnNo: string
  purchaseOrderId: string
  purchaseOrderNo: string
  supplierId: string
  supplierName: string
  status: string
  returnDate: string
  issueCategory?: string
  reason?: string
  remarks?: string
  evidences?: OrderEvidence[]
  operator?: string
  totalQuantity: number
  totalAmount: number
  createdAt: string
  updatedAt: string
  lines: PurchaseReturnLine[]
}

export interface PaginatedPurchaseReturns {
  items: PurchaseReturnRecord[]
  total: number
  page: number
  pageSize: number
}

export interface CreatePurchaseReturnLinePayload {
  purchaseOrderLineId: number
  quantity: number
  price: number
  issueCategory?: string
  reason?: string
  evidences?: OrderEvidence[]
}

export interface CreatePurchaseReturnPayload {
  operator?: string
  issueCategory?: string
  reason?: string
  remarks?: string
  evidences?: OrderEvidence[]
  returnDate?: string
  lines: CreatePurchaseReturnLinePayload[]
}

export interface CreatePurchaseReturnResponse {
  purchaseReturn: PurchaseReturnRecord
  purchaseOrder: PurchaseOrder
}

function toPurchaseReturnLineContract(dto: PurchaseReturnLineApiDTO): PurchaseReturnLine {
  return {
    id: dto.id,
    purchaseOrderLineId: dto.purchaseOrderLineId,
    lineNo: dto.lineNo,
    materialId: dto.materialId,
    materialCode: dto.materialCode,
    materialName: dto.materialName,
    specification: dto.specification,
    uom: dto.uom,
    quantity: dto.quantity,
    price: dto.price,
    amount: dto.amount,
    issueCategory: dto.issueCategory,
    reason: dto.reason,
    evidences: dto.evidences ?? [],
  }
}

function toPurchaseReturnContract(dto: PurchaseReturnApiDTO): PurchaseReturnRecord {
  return {
    id: dto.id,
    returnNo: dto.returnNo,
    purchaseOrderId: dto.purchaseOrderId,
    purchaseOrderNo: dto.purchaseOrderNo,
    supplierId: dto.supplierId,
    supplierName: dto.supplierName,
    status: dto.status,
    returnDate: dto.returnDate,
    issueCategory: dto.issueCategory,
    reason: dto.reason,
    remarks: dto.remarks,
    evidences: dto.evidences ?? [],
    operator: dto.operator,
    totalQuantity: dto.totalQuantity,
    totalAmount: dto.totalAmount,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    lines: ensureArrayField<PurchaseReturnLineApiDTO>(
      dto,
      'lines',
      'PurchaseReturnService.toPurchaseReturnContract'
    ).map(toPurchaseReturnLineContract),
  }
}

export async function getPurchaseReturns(page = 1, pageSize = 50): Promise<PaginatedPurchaseReturns> {
  const res = await apiFetch<PurchaseReturnListPageApiDTO>(`/purchase/returns?page=${page}&pageSize=${pageSize}`)
  const dto = ensureObjectResponse<PurchaseReturnListPageApiDTO & Record<string, unknown>>(
    res,
    'PurchaseReturnService.getPurchaseReturns'
  ) as PurchaseReturnListPageApiDTO

  return {
    items: ensureArrayField<PurchaseReturnApiDTO>(
      dto,
      'items',
      'PurchaseReturnService.getPurchaseReturns'
    ).map(toPurchaseReturnContract),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
  }
}

export async function createPurchaseReturn(
  purchaseOrderId: string,
  payload: CreatePurchaseReturnPayload
): Promise<CreatePurchaseReturnResponse> {
  const res = await apiFetch<CreatePurchaseReturnResponseApiDTO>(`/purchase/orders/${purchaseOrderId}/returns`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const dto = ensureObjectResponse<CreatePurchaseReturnResponseApiDTO & Record<string, unknown>>(
    res,
    'PurchaseReturnService.createPurchaseReturn'
  ) as CreatePurchaseReturnResponseApiDTO

  return {
    purchaseReturn: toPurchaseReturnContract(dto.purchaseReturn),
    purchaseOrder: toPurchaseOrderContract(dto.purchaseOrder),
  }
}
