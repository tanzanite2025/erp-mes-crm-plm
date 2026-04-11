import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type SaveChangeOrderInput } from '../mutation-types'
import { CHANGE_ORDERS_QUERY_KEY } from '../query-keys'
import { changeOrderService } from '../services/change-order-service'

export function useChangeOrderWriteActions() {
  const queryClient = useQueryClient()

  const saveChangeOrderMutation = useMutation({
    mutationFn: (changeOrder: SaveChangeOrderInput) => changeOrderService.saveChangeOrder(changeOrder),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHANGE_ORDERS_QUERY_KEY })
    },
  })

  const deleteChangeOrderMutation = useMutation({
    mutationFn: (id: string) => changeOrderService.deleteChangeOrder(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHANGE_ORDERS_QUERY_KEY })
    },
  })

  return {
    saveChangeOrder: saveChangeOrderMutation.mutateAsync,
    deleteChangeOrder: deleteChangeOrderMutation.mutateAsync,
    isSavingChangeOrder: saveChangeOrderMutation.isPending,
    isDeletingChangeOrder: deleteChangeOrderMutation.isPending,
  }
}
