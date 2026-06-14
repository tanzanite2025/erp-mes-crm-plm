import { z } from 'zod'
import { settlementRecordEvidenceApiDTOSchema } from '../settlement-evidences/contracts/settlement-evidence-api-dto'

export const settlementAllocationRequestApiDTOSchema = z
  .object({
    ledgerId: z.string(),
    allocatedAmount: z.number(),
    sequenceNo: z.number().optional(),
    remark: z.string().optional(),
  })
  .strict()

export const createSettlementRecordApiDTOSchema = z
  .object({
    amount: z.number(),
    currency: z.string().optional(),
    paymentMethod: z.string().optional(),
    paymentTerm: z.string().optional(),
    recordDate: z.string().optional(),
    receivedAt: z.string().optional(),
    receiptAccount: z.string().optional(),
    referenceNo: z.string().optional(),
    allocations: z.array(settlementAllocationRequestApiDTOSchema).min(1),
  })
  .strict()

export const settlementRecordApiDTOSchema = z
  .object({
    id: z.string(),
    recordNo: z.string(),
    ledgerId: z.string(),
    amount: z.number(),
    currency: z.string(),
    paymentMethod: z.string(),
    paymentTerm: z.string(),
    recordDate: z.string(),
    receivedAt: z.string().optional(),
    receiptAccount: z.string().optional(),
    status: z.string(),
    referenceNo: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    evidences: z.array(settlementRecordEvidenceApiDTOSchema),
  })
  .strict()

export const settlementAllocationApiDTOSchema = z
  .object({
    id: z.string(),
    ledgerId: z.string(),
    receiptRecordId: z.string(),
    paymentRecordId: z.string(),
    allocatedAmount: z.number(),
    sequenceNo: z.number(),
    remark: z.string(),
    operator: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict()

export type SettlementAllocationRequestApiDTO = z.infer<
  typeof settlementAllocationRequestApiDTOSchema
>
export type CreateSettlementRecordApiDTO = z.infer<
  typeof createSettlementRecordApiDTOSchema
>
export type SettlementRecordApiDTO = z.infer<
  typeof settlementRecordApiDTOSchema
>
export type SettlementAllocationApiDTO = z.infer<
  typeof settlementAllocationApiDTOSchema
>

export function deserializeCreateSettlementRecordApiDTO(
  input: unknown
): CreateSettlementRecordApiDTO {
  return createSettlementRecordApiDTOSchema.parse(input)
}

export function deserializeSettlementRecordApiDTO(
  input: unknown
): SettlementRecordApiDTO {
  return settlementRecordApiDTOSchema.parse(input)
}

export function deserializeSettlementAllocationApiDTO(
  input: unknown
): SettlementAllocationApiDTO {
  return settlementAllocationApiDTOSchema.parse(input)
}
