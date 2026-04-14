import { z } from 'zod'

export const vehicleCategorySchema = z.enum(['van', 'boxTruck', 'lightTruck', 'mediumTruck'])

export const vehicleSpecSchema = z.object({
  id: z.string().min(1),
  category: vehicleCategorySchema,
  name: z.string().min(1),
  payloadKg: z.number().nonnegative(),
  volumeM3: z.number().nonnegative(),
  innerLengthMm: z.number().nonnegative(),
  innerWidthMm: z.number().nonnegative(),
  innerHeightMm: z.number().nonnegative(),
  isBoxBody: z.boolean(),
})

export const shipmentSummarySchema = z.object({
  boxes: z.number().int().nonnegative(),
  totalVolumeM3: z.number().nonnegative(),
  totalWeightKg: z.number().nonnegative(),
})

export const vehicleRecommendationSchema = z.object({
  vehicle: vehicleSpecSchema,
  vehiclesNeeded: z.number().int().positive(),
  loadRateVolume: z.number().min(0).max(1),
  loadRateWeight: z.number().min(0).max(1),
  reason: z.string().min(1),
  warning: z.string().optional(),
  selectedOrientationLabel: z.string().optional(),
  boxesPerLayer: z.number().int().nonnegative().optional(),
  layerCount: z.number().int().nonnegative().optional(),
  maxBoxesPerVehicle: z.number().int().nonnegative().optional(),
})

export const vehicleRecommendationRequestSchema = z.object({
  summary: shipmentSummarySchema,
  vehicleSpecs: z.array(vehicleSpecSchema).min(1),
})

export const vehicleRecommendationResponseSchema = z.object({
  recommendations: z.array(vehicleRecommendationSchema),
  generatedAt: z.string().datetime(),
  engineVersion: z.string().min(1),
})

export type VehicleCategoryDTO = z.infer<typeof vehicleCategorySchema>
export type VehicleSpecDTO = z.infer<typeof vehicleSpecSchema>
export type ShipmentSummaryDTO = z.infer<typeof shipmentSummarySchema>
export type VehicleRecommendationDTO = z.infer<typeof vehicleRecommendationSchema>
export type VehicleRecommendationRequestDTO = z.infer<typeof vehicleRecommendationRequestSchema>
export type VehicleRecommendationResponseDTO = z.infer<typeof vehicleRecommendationResponseSchema>
