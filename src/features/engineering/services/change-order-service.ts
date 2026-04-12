import { apiFetch } from '@/lib/api-client'
import { type ChangeOrder } from '../data/schema'
import { type SaveChangeOrderInput } from '../mutation-types'
import { normalizeChangeOrderInput } from '../utils/product-code-normalization'

interface GetChangeOrdersParams {
  isOptions?: boolean
  productId?: string
  changeType?: 'ECO' | 'ECN'
  status?: 'draft' | 'released' | 'obsolete'
}

export const changeOrderService = {
  async getChangeOrders(params?: GetChangeOrdersParams): Promise<ChangeOrder[]> {
    const search = new URLSearchParams()
    if (params?.isOptions) search.set('options', 'true')
    if (params?.productId) search.set('productId', params.productId)
    if (params?.changeType) search.set('changeType', params.changeType)
    if (params?.status) search.set('status', params.status)

    const query = search.toString()
    return apiFetch<ChangeOrder[]>(`/engineering/change-orders${query ? `?${query}` : ''}`)
  },

  async saveChangeOrder(changeOrder: SaveChangeOrderInput): Promise<ChangeOrder> {
    const normalizedChangeOrder = normalizeChangeOrderInput(changeOrder)
    return apiFetch<ChangeOrder>('/engineering/change-orders', {
      method: 'POST',
      body: JSON.stringify(normalizedChangeOrder),
    })
  },

  async deleteChangeOrder(id: string): Promise<void> {
    await apiFetch<void>(`/engineering/change-orders/${id}`, {
      method: 'DELETE',
    })
  },
}
