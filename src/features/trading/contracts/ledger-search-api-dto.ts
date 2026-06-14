import { z } from 'zod'

export const ledgerSearchCandidateApiDTOSchema = z
  .object({
    id: z.string(),
    documentNo: z.string(),
    partnerName: z.string(),
    outstandingAmount: z.number(),
    status: z.string(),
    currency: z.string(),
  })
  .strict()

export const ledgerSearchResponseApiDTOSchema = z
  .object({
    items: z.array(ledgerSearchCandidateApiDTOSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  })
  .strict()

export type LedgerSearchCandidateApiDTO = z.infer<
  typeof ledgerSearchCandidateApiDTOSchema
>
export type LedgerSearchResponseApiDTO = z.infer<
  typeof ledgerSearchResponseApiDTOSchema
>

export function deserializeLedgerSearchResponseApiDTO(
  input: unknown
): LedgerSearchResponseApiDTO {
  return ledgerSearchResponseApiDTOSchema.parse(input)
}
