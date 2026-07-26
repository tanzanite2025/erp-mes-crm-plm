import { z } from 'zod'
import type { OrderEvidence } from '../../data/schema'

export const orderEvidenceSchema = z
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

const salesOrderActionAvailabilitySchema = z
  .object({
    action: z.enum([
      'submitPending',
      'startScheduling',
      'startProduction',
      'markDone',
      'cancel',
      'createReturn',
    ]),
    allowed: z.boolean(),
    reasonCode: z.string().optional(),
    reason: z.string().optional(),
  })
  .strict()

const salesOrderLinePackagingSelectionSchema = z
  .object({
    profileId: z.string(),
    profileCode: z.string(),
    profileName: z.string(),
    packagingType: z.string(),
    length: z.number(),
    width: z.number(),
    height: z.number(),
    dimensionUnitCode: z.string(),
    netWeight: z.number(),
    grossWeight: z.number(),
    weightUnitCode: z.string(),
    capacity: z.number(),
    capacityUnitCode: z.string(),
    canRotate: z.boolean().default(true),
    canInvert: z.boolean().default(false),
    source: z.enum(['auto', 'manual']),
  })
  .strict()

export const salesOrderLineApiDTOSchema = z
  .object({
    id: z.number().optional(),
    lineNo: z.number(),
    productId: z.string().optional(),
    productModel: z.string(),
    productCode: z.string(),
    specification: z.string(),
    engineeringSpecNameSnapshot: z.string().optional(),
    productDisplayTitleSnapshot: z.string().optional(),
    productDisplaySubtitleSnapshot: z.string().optional(),
    productDisplayCodeSnapshot: z.string().optional(),
    productDisplayFullLabelSnapshot: z.string().optional(),
    productDisplayStrategyVersionSnapshot: z.string().optional(),
    modelCodeSnapshot: z.string().optional(),
    holePrefixSnapshot: z.string().optional(),
    appearanceId: z.string().optional(),
    appearanceNameSnapshot: z.string().optional(),
    appearanceBarcodeCodeSnapshot: z.string().optional(),
    appearanceDescriptionSnapshot: z.string().optional(),
    appearanceImageUrlSnapshot: z.string().optional(),
    description: z.string(),
    qty: z.number(),
    uom: z.string(),
    price: z.number(),
    amount: z.number(),
    deliveredQty: z.number(),
    customerPartNo: z.string(),
    jobNo: z.string(),
    note: z.string().optional(),
    drillingPlanId: z.string().optional(),
    drillingPlanNameSnapshot: z.string().optional(),
    labelingPlanId: z.string().optional(),
    labelingPlanNameSnapshot: z.string().optional(),
    holeCount: z.number().optional(),
    route: z.string().optional(),
    orderDate: z.string(),
    status: z.string(),
    claimedBy: z.string().optional(),
    claimedAt: z.string().optional(),
    selectedPackaging: salesOrderLinePackagingSelectionSchema.optional(),
    returnedQuantity: z.number(),
    remainingReturnableQuantity: z.number(),
  })
  .strict()

export interface SalesOrderLineApiDTO {
  id?: number
  lineNo: number
  productId?: string
  productModel: string
  productCode: string
  specification: string
  engineeringSpecNameSnapshot?: string
  productDisplayTitleSnapshot?: string
  productDisplaySubtitleSnapshot?: string
  productDisplayCodeSnapshot?: string
  productDisplayFullLabelSnapshot?: string
  productDisplayStrategyVersionSnapshot?: string
  modelCodeSnapshot?: string
  holePrefixSnapshot?: string
  appearanceId?: string
  appearanceNameSnapshot?: string
  appearanceBarcodeCodeSnapshot?: string
  appearanceDescriptionSnapshot?: string
  appearanceImageUrlSnapshot?: string
  description: string
  qty: number
  uom: string
  price: number
  amount: number
  deliveredQty: number
  customerPartNo: string
  jobNo: string
  note?: string
  drillingPlanId?: string
  drillingPlanNameSnapshot?: string
  labelingPlanId?: string
  labelingPlanNameSnapshot?: string
  holeCount?: number
  route?: string
  orderDate: string
  status: string
  claimedBy?: string
  claimedAt?: string
  selectedPackaging?: z.infer<typeof salesOrderLinePackagingSelectionSchema>
  returnedQuantity: number
  remainingReturnableQuantity: number
}

const salesOrderListItemBaseSchema = z
  .object({
    id: z.string(),
    orderNo: z.string(),
    orderName: z.string().optional(),
    customerName: z.string(),
    customerId: z.string().optional(),
    type: z.string(),
    currency: z.string(),
    exchangeRateSnapshot: z.number().optional(),
    classification: z.string(),
    status: z.string(),
    statusNote: z.string().optional(),
    amount: z.number(),
    quantity: z.number(),
    orderDate: z.string(),
    deliveryDate: z.string(),
    paymentMethod: z.string().optional(),
    paymentMethodName: z.string().optional(),
    paymentTerm: z.string().optional(),
    paymentTermName: z.string().optional(),
    purchaseOrderNo: z.string().optional(),
    barcode: z.string().optional(),
    requirements: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    updatedBy: z.string().optional(),
    isDeleted: z.boolean().optional(),
    version: z.number().optional(),
    evidences: z.array(orderEvidenceSchema).optional(),
    fulfillmentRate: z.number().optional(),
    availableActions: z.array(salesOrderActionAvailabilitySchema).optional(),
  })
  .strict()

export const salesOrderApiDTOSchema = salesOrderListItemBaseSchema
  .extend({
    lines: z.array(salesOrderLineApiDTOSchema),
  })
  .strict()

export const salesOrderListItemWithoutLinesApiDTOSchema =
  salesOrderListItemBaseSchema
    .extend({
      lines: z.undefined().optional(),
    })
    .strict()

export const salesOrderListItemWithLinesApiDTOSchema =
  salesOrderListItemBaseSchema
    .extend({
      lines: z.array(salesOrderLineApiDTOSchema),
    })
    .strict()

export interface SalesOrderApiDTO {
  id: string
  orderNo: string
  orderName?: string
  customerName: string
  customerId?: string
  type: string
  currency: string
  exchangeRateSnapshot?: number
  classification: string
  status: string
  statusNote?: string
  amount: number
  quantity: number
  orderDate: string
  deliveryDate: string
  paymentMethod?: string
  paymentMethodName?: string
  paymentTerm?: string
  paymentTermName?: string
  purchaseOrderNo?: string
  barcode?: string
  requirements?: string
  createdAt: string
  updatedAt: string
  updatedBy?: string
  isDeleted?: boolean
  version?: number
  evidences?: OrderEvidence[]
  fulfillmentRate?: number
  availableActions?: z.infer<typeof salesOrderActionAvailabilitySchema>[]
  lines?: SalesOrderLineApiDTO[]
}

export type SalesOrderListItemWithoutLinesApiDTO = z.infer<
  typeof salesOrderListItemWithoutLinesApiDTOSchema
>

export type SalesOrderListItemWithLinesApiDTO = z.infer<
  typeof salesOrderListItemWithLinesApiDTOSchema
>

export const salesOrderListPageWithoutLinesApiDTOSchema = z
  .object({
    items: z.array(salesOrderListItemWithoutLinesApiDTOSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  })
  .strict()

export const salesOrderListPageWithLinesApiDTOSchema = z
  .object({
    items: z.array(salesOrderListItemWithLinesApiDTOSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  })
  .strict()

export interface SalesOrderListPageApiDTO {
  items: Array<
    SalesOrderListItemWithoutLinesApiDTO | SalesOrderListItemWithLinesApiDTO
  >
  total: number
  page: number
  pageSize: number
}

export function deserializeSalesOrderApiDTO(input: unknown): SalesOrderApiDTO {
  return salesOrderApiDTOSchema.parse(input)
}

export function deserializeSalesOrderListPageApiDTO(
  input: unknown,
  options: {
    withLines: boolean
  }
): SalesOrderListPageApiDTO {
  return options.withLines
    ? salesOrderListPageWithLinesApiDTOSchema.parse(input)
    : salesOrderListPageWithoutLinesApiDTOSchema.parse(input)
}
