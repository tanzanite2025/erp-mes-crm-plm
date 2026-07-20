import { z } from 'zod'
import type { OrderEvidence } from '@/features/sales-document/data/order-evidence'

const orderEvidenceSchema = z
  .object({
    id: z.string(),
    url: z.string(),
    name: z.string(),
    uploadedAt: z.string(),
    note: z.string().optional(),
    location: z.string().optional(),
    defectPart: z.string().optional(),
  })
  .strict()

export const purchaseOrderLineApiDTOSchema = z
  .object({
    id: z.number().optional(),
    version: z.number().optional(),
    lineNo: z.number(),
    materialId: z.string(),
    materialName: z.string(),
    materialCode: z.string(),
    specification: z.string(),
    qty: z.number(),
    uom: z.string(),
    price: z.number(),
    amount: z.number(),
    expectedDate: z.string(),
    receivedQty: z.number(),
    returnedQty: z.number(),
    status: z.string(),
    note: z.string().optional(),
  })
  .strict()

export interface PurchaseOrderLineApiDTO {
  id?: number
  version?: number
  lineNo: number
  materialId: string
  materialName: string
  materialCode: string
  specification: string
  qty: number
  uom: string
  price: number
  amount: number
  expectedDate: string
  receivedQty: number
  returnedQty: number
  status: string
  note?: string
}

const purchaseOrderListItemBaseSchema = z
  .object({
    id: z.string(),
    orderNo: z.string(),
    supplierName: z.string(),
    supplierId: z.string(),
    status: z.string(),
    amount: z.number(),
    orderDate: z.string(),
    expectedDate: z.string(),
    purchaser: z.string(),
    currency: z.string(),
    exchangeRate: z.number().optional(),
    paymentMethod: z.string().optional(),
    paymentMethodName: z.string().optional(),
    paymentTerm: z.string().optional(),
    paymentTermName: z.string().optional(),
    note: z.string().optional(),
    isDeleted: z.boolean().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    version: z.number().optional(),
    evidences: z.array(orderEvidenceSchema).optional(),
  })
  .strict()

export const purchaseOrderApiDTOSchema = purchaseOrderListItemBaseSchema
  .extend({
    lines: z.array(purchaseOrderLineApiDTOSchema),
  })
  .strict()

export const purchaseOrderListItemWithoutLinesApiDTOSchema =
  purchaseOrderListItemBaseSchema
    .extend({
      lines: z.undefined().optional(),
    })
    .strict()

export const purchaseOrderListItemWithLinesApiDTOSchema =
  purchaseOrderListItemBaseSchema
    .extend({
      lines: z.array(purchaseOrderLineApiDTOSchema),
    })
    .strict()

export interface PurchaseOrderApiDTO {
  id: string
  orderNo: string
  supplierName: string
  supplierId: string
  status: string
  amount: number
  orderDate: string
  expectedDate: string
  purchaser: string
  currency: string
  exchangeRate?: number
  paymentMethod?: string
  paymentMethodName?: string
  paymentTerm?: string
  paymentTermName?: string
  note?: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  version?: number
  evidences?: OrderEvidence[]
  lines?: PurchaseOrderLineApiDTO[]
}

export type PurchaseOrderListItemWithoutLinesApiDTO = z.infer<
  typeof purchaseOrderListItemWithoutLinesApiDTOSchema
>

export type PurchaseOrderListItemWithLinesApiDTO = z.infer<
  typeof purchaseOrderListItemWithLinesApiDTOSchema
>

export const purchaseOrderListPageWithoutLinesApiDTOSchema = z
  .object({
    items: z.array(purchaseOrderListItemWithoutLinesApiDTOSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  })
  .strict()

export const purchaseOrderListPageWithLinesApiDTOSchema = z
  .object({
    items: z.array(purchaseOrderListItemWithLinesApiDTOSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  })
  .strict()

export interface PurchaseOrderListPageApiDTO {
  items: Array<
    | PurchaseOrderListItemWithoutLinesApiDTO
    | PurchaseOrderListItemWithLinesApiDTO
  >
  total: number
  page: number
  pageSize: number
}

export interface ConfirmPurchaseReceiptResponseApiDTO {
  purchaseOrder: PurchaseOrderApiDTO
  createdInboundRecords: Array<{ id: string }>
}

export const confirmPurchaseReceiptResponseApiDTOSchema = z
  .object({
    purchaseOrder: purchaseOrderApiDTOSchema,
    createdInboundRecords: z.array(
      z
        .object({
          id: z.string(),
        })
        .strict()
    ),
  })
  .strict()

export function deserializePurchaseOrderApiDTO(
  input: unknown
): PurchaseOrderApiDTO {
  return purchaseOrderApiDTOSchema.parse(input)
}

export function deserializePurchaseOrderListPageApiDTO(
  input: unknown,
  options: {
    withLines: boolean
  }
): PurchaseOrderListPageApiDTO {
  return options.withLines
    ? purchaseOrderListPageWithLinesApiDTOSchema.parse(input)
    : purchaseOrderListPageWithoutLinesApiDTOSchema.parse(input)
}

export function deserializeConfirmPurchaseReceiptResponseApiDTO(
  input: unknown
): ConfirmPurchaseReceiptResponseApiDTO {
  return confirmPurchaseReceiptResponseApiDTOSchema.parse(input)
}
