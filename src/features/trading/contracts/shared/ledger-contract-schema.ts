import { z } from 'zod'

export const ledgerRecordBaseApiDTOShape = {
  id: z.string(),
  documentNo: z.string(),
  currency: z.string(),
  outstandingAmount: z.number(),
  dueDate: z.string(),
  agingBucket: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
} satisfies z.ZodRawShape

export function createLedgerListPageApiDTOSchema<
  ItemSchema extends z.ZodTypeAny,
  SummarySchema extends z.ZodTypeAny,
>(itemSchema: ItemSchema, summarySchema: SummarySchema) {
  return z
    .object({
      items: z.array(itemSchema),
      total: z.number(),
      page: z.number(),
      pageSize: z.number(),
      summary: summarySchema,
    })
    .strict()
}

export function createLedgerDetailApiDTOSchema<
  BaseShape extends z.ZodRawShape,
  ExtraShape extends z.ZodRawShape,
>(baseSchema: z.ZodObject<BaseShape>, extraShape: ExtraShape) {
  return baseSchema.extend(extraShape).strict()
}

export function createSettlementMutationResponseApiDTOSchema<
  LedgerSchema extends z.ZodTypeAny,
  RecordSchema extends z.ZodTypeAny,
  AllocationSchema extends z.ZodTypeAny,
>(
  ledgerSchema: LedgerSchema,
  recordSchema: RecordSchema,
  allocationSchema: AllocationSchema
) {
  return z
    .object({
      ledger: ledgerSchema,
      record: recordSchema,
      allocations: z.array(allocationSchema),
    })
    .strict()
}
