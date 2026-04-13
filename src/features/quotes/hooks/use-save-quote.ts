import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { quoteQueryKeys } from '@/features/quotes/query-keys'
import { patchQuote, type PatchQuotePayload } from '@/features/quotes/services/quote-maintenance-service'

export function useSaveQuote() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (payload: PatchQuotePayload) => patchQuote(payload),
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
