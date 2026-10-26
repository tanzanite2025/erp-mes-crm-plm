import { z } from 'zod'
import { apiFetch } from '@/lib/api-client'
import { createApiClientError } from '@/lib/api-error'

const globalBusinessSearchItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  code: z.string(),
  category: z.string().min(1),
  parentTitle: z.string(),
  href: z
    .string()
    .refine(
      (href) => href.startsWith('/') && !href.startsWith('//'),
      'Expected an internal result destination'
    ),
})

const globalBusinessSearchPageSchema = z.object({
  data: z.array(globalBusinessSearchItemSchema),
  hasMore: z.boolean(),
  nextOffset: z.number().int().nonnegative(),
  generation: z.string().max(128),
  candidateLimitReached: z.boolean(),
})

export type GlobalBusinessSearchPage = z.infer<
  typeof globalBusinessSearchPageSchema
>
export type GlobalBusinessSearchPageCursor = {
  offset: number
  generation?: string
}

export async function fetchGlobalBusinessRecordSearchPage(
  query: string,
  cursor: GlobalBusinessSearchPageCursor,
  signal?: AbortSignal
): Promise<GlobalBusinessSearchPage> {
  const parameters = new URLSearchParams({
    q: query,
    offset: String(cursor.offset),
  })
  if (cursor.generation) parameters.set('generation', cursor.generation)
  const endpoint = `/search/global?${parameters}`
  const response = await apiFetch<unknown>(endpoint, {
    signal,
    circuitBreakerScope: 'global-business-search',
    suppressErrorStatuses: [409],
  })
  const parsed = globalBusinessSearchPageSchema.safeParse(response)
  if (!parsed.success) {
    throw createApiClientError({
      kind: 'invalid_response',
      endpoint,
      message:
        '[INVALID_RESPONSE] Business search returned an invalid result page.',
      details: {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      },
    })
  }
  const page = parsed.data
  if (
    (page.candidateLimitReached && page.hasMore) ||
    (page.hasMore &&
      (!page.generation ||
        page.nextOffset >= 100000 ||
        page.nextOffset <= cursor.offset ||
        page.data.length === 0)) ||
    (cursor.generation && page.generation !== cursor.generation)
  ) {
    throw createApiClientError({
      kind: 'invalid_response',
      endpoint,
      message:
        '[INVALID_RESPONSE] Business search returned inconsistent pagination.',
    })
  }
  return page
}
