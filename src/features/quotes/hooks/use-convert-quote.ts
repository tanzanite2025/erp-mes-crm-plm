import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { quoteQueryKeys } from '@/features/quotes/query-keys'
import { convertQuote } from '@/features/quotes/services/quote-convert-service'

export function useConvertQuote() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (id: string) => convertQuote(id),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: quoteQueryKeys.all() }),
        queryClient.invalidateQueries({ queryKey: quoteQueryKeys.detail(data.quoteId) }),
      ])
      toast.success(`已转正式销售订单：${data.targetSalesOrderNo}`)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '转正式销售订单失败'
      toast.error(message)
    },
  })

  return {
    convertQuote: mutation.mutateAsync,
    isConverting: mutation.isPending,
    convertError: mutation.error instanceof Error ? mutation.error.message : null,
  }
}
