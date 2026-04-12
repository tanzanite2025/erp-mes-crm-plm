import { useMutation, useQueryClient } from '@tanstack/react-query'
import { normalizeChangeOrderNo, normalizeRevisionNo, normalizeSiteCode } from '@/lib/codecs/code-normalization'
import { type SaveChangeOrderInput } from '../mutation-types'
import { CHANGE_ORDERS_QUERY_KEY } from '../query-keys'
import { changeOrderService } from '../services/change-order-service'

export function useChangeOrderWriteActions() {
  const queryClient = useQueryClient()

  const saveChangeOrderMutation = useMutation({
    mutationFn: (changeOrder: SaveChangeOrderInput) =>
      changeOrderService.saveChangeOrder({
        ...changeOrder,
        changeOrderNo: normalizeChangeOrderNo(changeOrder.changeOrderNo),
        siteCode: normalizeSiteCode(changeOrder.siteCode),
        revisionNo: normalizeRevisionNo(changeOrder.revisionNo),
      }),
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
