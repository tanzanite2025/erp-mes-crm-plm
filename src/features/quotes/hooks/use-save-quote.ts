import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { quoteQueryKeys } from '@/features/quotes/query-keys'
import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { toQuoteDetailContract } from '@/features/quotes/adapters/quote-api-adapter'
import type { QuoteDetailApiDTO } from '@/features/quotes/contracts/quote-detail-api-dto'
import type { QuoteDetail } from '@/features/quotes/data/quote-detail'

export type PatchQuoteDraftPayload = {
  id: string
  amount: number
  requirements: string
  previousAmount: number
  previousRequirements: string
}

async function patchQuoteDraftRequest(payload: PatchQuoteDraftPayload): Promise<QuoteDetail> {
  const delta = {
    amount: { o: payload.previousAmount, n: payload.amount },
    requirements: { o: payload.previousRequirements, n: payload.requirements },
  }

  const response = await apiFetch<QuoteDetailApiDTO>(`/quotes/${payload.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      op: 'PATCH',
      delta,
      metadata: { id: payload.id },
    }),
  })

  const normalized = ensureObjectResponse<QuoteDetailApiDTO & Record<string, unknown>>(response, 'useSaveQuote.patchQuoteDraftRequest')
  return toQuoteDetailContract(normalized)
}

export function useSaveQuote() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (payload: PatchQuoteDraftPayload) => patchQuoteDraftRequest(payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: quoteQueryKeys.all() }),
        queryClient.invalidateQueries({ queryKey: quoteQueryKeys.detail(variables.id) }),
      ])
      toast.success('报价已保存')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '报价保存失败'
      toast.error(message)
    },
  })

  return {
    saveQuote: mutation.mutateAsync,
    isSaving: mutation.isPending,
    saveError: mutation.error instanceof Error ? mutation.error.message : null,
  }
}
