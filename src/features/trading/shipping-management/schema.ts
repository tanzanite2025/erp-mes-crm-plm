import { z } from 'zod'
import { ensureArrayResponse } from '@/lib/api-response'
import type { ShippingVehicleMatchItem } from './types'

const shippingVehicleMatchStatusSchema = z.enum(['待匹配', '待联系', '已锁定'])

export const shippingVehicleMatchItemSchema = z.object({
  id: z.string().min(1),
  shipmentId: z.string().min(1),
  orderNo: z.string(),
  customerName: z.string(),
  warehouseName: z.string(),
  materialName: z.string(),
  materialCode: z.string(),
  quantity: z.number(),
  boxCount: z.number().int().nullable(),
  volumeM3: z.number().nullable(),
  weightKg: z.number().nullable(),
  status: shippingVehicleMatchStatusSchema,
  shipmentStatus: z.string(),
  logisticsStatus: z.string().optional().default(''),
  packageProfileId: z.string().optional().default(''),
  packageProfileName: z.string().optional().default(''),
})

const shippingVehicleMatchItemArraySchema = z.array(
  shippingVehicleMatchItemSchema
)

export function parseShippingVehicleMatchItemsResponse(
  response: unknown
): ShippingVehicleMatchItem[] {
  return shippingVehicleMatchItemArraySchema.parse(
    ensureArrayResponse<unknown>(
      response,
      'shippingVehicleMatchService.getVehicleMatchItems'
    )
  )
}
