import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { quoteQueryKeys } from '@/features/quotes/query-keys'
import {
  createQuote,
  type CreateQuotePayload,
} from '@/features/quotes/services/quote-create-service'

export function useCreateQuote() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (payload: CreateQuotePayload) => createQuote(payload),
    onSuccess: () => {
      toast.success('报价已创建，已切换到可继续处理状态。')
      queryClient.invalidateQueries({ queryKey: quoteQueryKeys.all() })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '报价创建失败')
    },
  })

  return {
    createQuote: mutation.mutateAsync,
    isCreating: mutation.isPending,
    createError:
      mutation.error instanceof Error ? mutation.error.message : null,
  }
}
