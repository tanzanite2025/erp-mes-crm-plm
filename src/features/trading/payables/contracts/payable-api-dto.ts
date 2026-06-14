import { z } from 'zod'
import type {
  LedgerSearchCandidateApiDTO,
  LedgerSearchResponseApiDTO,
} from '../../contracts/ledger-search-api-dto'
import {
  createSettlementRecordApiDTOSchema,
  settlementAllocationApiDTOSchema,
  settlementRecordApiDTOSchema,
  type CreateSettlementRecordApiDTO as TradingCreateSettlementRecordApiDTO,
  type SettlementAllocationApiDTO as TradingSettlementAllocationApiDTO,
  type SettlementRecordApiDTO as TradingSettlementRecordApiDTO,
} from '../../contracts/settlement-record-api-dto'
import {
  createLedgerDetailApiDTOSchema,
  createLedgerListPageApiDTOSchema,
  createSettlementMutationResponseApiDTOSchema,
  ledgerRecordBaseApiDTOShape,
} from '../../contracts/shared/ledger-contract-schema'

export const payableRecordApiDTOSchema = z
  .object({
    ...ledgerRecordBaseApiDTOShape,
    supplierName: z.string(),
    invoiceAmount: z.number(),
    paidAmount: z.number(),
  })
  .strict()

export const payableSummaryApiDTOSchema = z
  .object({
    totalPayable: z.number(),
    overduePayable: z.number(),
    pendingPaymentCount: z.number(),
  })
  .strict()

export const payableListPageApiDTOSchema = createLedgerListPageApiDTOSchema(
  payableRecordApiDTOSchema,
  payableSummaryApiDTOSchema
)

export type PayableRecordApiDTO = z.infer<typeof payableRecordApiDTOSchema>
export type PayableSummaryApiDTO = z.infer<typeof payableSummaryApiDTOSchema>
export type PayableListPageApiDTO = z.infer<typeof payableListPageApiDTOSchema>

export function deserializePayableListPageApiDTO(
  input: unknown
): PayableListPageApiDTO {
  return payableListPageApiDTOSchema.parse(input)
}

export type PayableLedgerSearchCandidateApiDTO = LedgerSearchCandidateApiDTO
export type PayableLedgerSearchResponseApiDTO = LedgerSearchResponseApiDTO

export const paymentRecordApiDTOSchema = settlementRecordApiDTOSchema

export const payableDetailApiDTOSchema = createLedgerDetailApiDTOSchema(
  payableRecordApiDTOSchema,
  {
    sourceType: z.string(),
    sourceRefId: z.string(),
    supplierId: z.string(),
    version: z.number(),
    paymentRecords: z.array(paymentRecordApiDTOSchema),
    allocations: z.array(settlementAllocationApiDTOSchema),
  }
)

export type PaymentRecordApiDTO = TradingSettlementRecordApiDTO
export type SettlementAllocationApiDTO = TradingSettlementAllocationApiDTO
export type PayableDetailApiDTO = z.infer<typeof payableDetailApiDTOSchema>

export function deserializePayableDetailApiDTO(
  input: unknown
): PayableDetailApiDTO {
  return payableDetailApiDTOSchema.parse(input)
}

export const createPaymentRecordApiDTOSchema =
  createSettlementRecordApiDTOSchema
export type CreatePaymentRecordApiDTO = TradingCreateSettlementRecordApiDTO

export const createPaymentRecordResponseApiDTOSchema =
  createSettlementMutationResponseApiDTOSchema(
    payableDetailApiDTOSchema,
    paymentRecordApiDTOSchema,
    settlementAllocationApiDTOSchema
  )

export type CreatePaymentRecordResponseApiDTO = z.infer<
  typeof createPaymentRecordResponseApiDTOSchema
>

export function deserializeCreatePaymentRecordResponseApiDTO(
  input: unknown
): CreatePaymentRecordResponseApiDTO {
  return createPaymentRecordResponseApiDTOSchema.parse(input)
}
