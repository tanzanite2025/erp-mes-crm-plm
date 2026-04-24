import { z } from 'zod'
import { orderEvidenceSchema } from '../../sales/contracts/sales-order-api-dto'
import {
  TRADING_LEDGER_AGING_BUCKET_OPTIONS,
  TRADING_LEDGER_STATUS_LABEL_OPTIONS,
} from '../../utils/ledger-display'

import type {
  LedgerSearchCandidateApiDTO,
  LedgerSearchResponseApiDTO,
} from '../../contracts/ledger-search-api-dto'
import {
  createLedgerDetailApiDTOSchema,
  createLedgerListPageApiDTOSchema,
  createSettlementMutationResponseApiDTOSchema,
  ledgerRecordBaseApiDTOShape,
} from '../../contracts/shared/ledger-contract-schema'
import {
  createSettlementRecordApiDTOSchema,
  settlementAllocationApiDTOSchema,
  settlementRecordApiDTOSchema,
  type CreateSettlementRecordApiDTO as TradingCreateSettlementRecordApiDTO,
  type SettlementAllocationApiDTO as TradingSettlementAllocationApiDTO,
  type SettlementRecordApiDTO as TradingSettlementRecordApiDTO,
} from '../../contracts/settlement-record-api-dto'

export const receivableRecordApiDTOSchema = z.object({
  ...ledgerRecordBaseApiDTOShape,
  customerName: z.string(),
  orderAmount: z.number(),
  receivedAmount: z.number(),
  agingBucket: z.enum(TRADING_LEDGER_AGING_BUCKET_OPTIONS),
  status: z.enum(TRADING_LEDGER_STATUS_LABEL_OPTIONS),
}).strict()

export const receivableSummaryApiDTOSchema = z.object({
  totalReceivable: z.number(),
  overdueReceivable: z.number(),
  pendingReceiptCount: z.number(),
}).strict()

export const receivableListPageApiDTOSchema = createLedgerListPageApiDTOSchema(
  receivableRecordApiDTOSchema,
  receivableSummaryApiDTOSchema
)

export type ReceivableRecordApiDTO = z.infer<typeof receivableRecordApiDTOSchema>
export type ReceivableSummaryApiDTO = z.infer<typeof receivableSummaryApiDTOSchema>
export type ReceivableListPageApiDTO = z.infer<typeof receivableListPageApiDTOSchema>

export function deserializeReceivableListPageApiDTO(input: unknown): ReceivableListPageApiDTO {
  return receivableListPageApiDTOSchema.parse(input)
}

export type ReceivableLedgerSearchCandidateApiDTO = LedgerSearchCandidateApiDTO
export type ReceivableLedgerSearchResponseApiDTO = LedgerSearchResponseApiDTO

export const receiptRecordApiDTOSchema = settlementRecordApiDTOSchema

export const salesReturnActualAmountRecordApiDTOSchema = z.object({
  id: z.string(),
  salesReturnId: z.string(),
  salesOrderId: z.string(),
  salesOrderNo: z.string(),
  returnNo: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  amount: z.number(),
  note: z.string().optional(),
  evidences: z.array(orderEvidenceSchema).optional(),
  estimatedReturnAmountSnapshot: z.number(),
  recordedAt: z.string(),
  recordedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict()

export const receivableDetailApiDTOSchema = createLedgerDetailApiDTOSchema(receivableRecordApiDTOSchema, {
  sourceType: z.string(),
  sourceRefId: z.string(),
  customerId: z.string(),
  version: z.number(),
  receiptRecords: z.array(receiptRecordApiDTOSchema),
  allocations: z.array(settlementAllocationApiDTOSchema),
  returnAdjustmentAmount: z.number(),
  salesReturnActualAmountRecords: z.array(salesReturnActualAmountRecordApiDTOSchema),
})

export type ReceiptRecordApiDTO = TradingSettlementRecordApiDTO
export type SettlementAllocationApiDTO = TradingSettlementAllocationApiDTO
export type SalesReturnActualAmountRecordApiDTO = z.infer<typeof salesReturnActualAmountRecordApiDTOSchema>
export type ReceivableDetailApiDTO = z.infer<typeof receivableDetailApiDTOSchema>

export function deserializeReceivableDetailApiDTO(input: unknown): ReceivableDetailApiDTO {
  return receivableDetailApiDTOSchema.parse(input)
}

export const createReceiptRecordApiDTOSchema = createSettlementRecordApiDTOSchema
export type CreateReceiptRecordApiDTO = TradingCreateSettlementRecordApiDTO

export const createReceiptRecordResponseApiDTOSchema = createSettlementMutationResponseApiDTOSchema(
  receivableDetailApiDTOSchema,
  receiptRecordApiDTOSchema,
  settlementAllocationApiDTOSchema
)

export type CreateReceiptRecordResponseApiDTO = z.infer<typeof createReceiptRecordResponseApiDTOSchema>

export function deserializeCreateReceiptRecordResponseApiDTO(input: unknown): CreateReceiptRecordResponseApiDTO {
  return createReceiptRecordResponseApiDTOSchema.parse(input)
}
