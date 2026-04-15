import { z } from 'zod'

export const vehicleContactChannelTypeApiDTOSchema = z.enum(['phone', 'wechat', 'email', 'whatsapp', 'other'])
export const vehicleContactCategoryApiDTOSchema = z.enum(['van', 'boxTruck', 'lightTruck', 'mediumTruck'])

export const vehicleContactChannelApiDTOSchema = z.object({
  type: vehicleContactChannelTypeApiDTOSchema,
  value: z.string(),
  primary: z.boolean().optional(),
})

const vehicleContactChannelDTOArraySchema = z.array(vehicleContactChannelApiDTOSchema).transform((channels) =>
  channels.map((channel) => ({
    ...channel,
    primary: channel.primary === true,
  }))
)

const vehicleContactChannelsFromJsonSchema = z.string().optional().transform((value, ctx) => {
  const rawValue = value ?? '[]'

  let parsed: unknown
  try {
    parsed = JSON.parse(rawValue)
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'channelsJson must be valid JSON',
    })
    return z.NEVER
  }

  const result = vehicleContactChannelDTOArraySchema.safeParse(parsed)
  if (!result.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'channelsJson must be a valid contact channel array',
    })
    return z.NEVER
  }

  return result.data
})

export const vehicleContactBindingRawApiDTOSchema = z.object({
  id: z.string().min(1),
  vehicleId: z.string().min(1),
  vehicleName: z.string().min(1),
  category: vehicleContactCategoryApiDTOSchema,
  supplierName: z.string().optional(),
  contactName: z.string().min(1),
  primaryPhone: z.string().optional(),
  channelsJson: z.string().optional(),
  region: z.string().optional(),
  dispatchAdvice: z.string().optional(),
  note: z.string().optional(),
  enabled: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

const vehicleContactBindingParsedApiDTOSchema = vehicleContactBindingRawApiDTOSchema.extend({
  channelsJson: vehicleContactChannelsFromJsonSchema,
})

export const vehicleContactBindingDTOSchema = vehicleContactBindingParsedApiDTOSchema.transform(({ channelsJson, ...dto }) => ({
  id: dto.id,
  vehicleId: dto.vehicleId,
  vehicleName: dto.vehicleName,
  category: dto.category,
  supplierName: dto.supplierName ?? '',
  contactName: dto.contactName,
  channels: channelsJson,
  region: dto.region ?? '',
  dispatchAdvice: dto.dispatchAdvice ?? '',
  note: dto.note ?? '',
  enabled: dto.enabled,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
}))

export const vehicleContactBindingDTOArraySchema = z.array(vehicleContactBindingDTOSchema)

export type VehicleContactChannelApiDTO = z.infer<typeof vehicleContactChannelApiDTOSchema>
export type VehicleContactBindingRawApiDTO = z.infer<typeof vehicleContactBindingRawApiDTOSchema>
export type VehicleContactBindingDTO = z.infer<typeof vehicleContactBindingDTOSchema>
