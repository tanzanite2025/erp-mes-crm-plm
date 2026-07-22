import { z } from 'zod'
import { vehicleSpecSchema } from '../../vehicle-specs/services/vehicle-specs.schema'

const packageDimensionSchema = z.object({
  lengthMm: z.number().nonnegative(),
  widthMm: z.number().nonnegative(),
  heightMm: z.number().nonnegative(),
  canRotate: z.boolean(),
  canInvert: z.boolean(),
})

const vehicleLoadingPackageInputSchema = z.object({
  packageId: z.string().min(1),
  profileId: z.string().min(1).optional(),
  name: z.string().min(1),
  unitWeightKg: z.number().positive(),
  dimension: packageDimensionSchema,
})

export const shipmentSummarySchema = z.object({
  boxes: z.number().int().nonnegative(),
  totalVolumeM3: z.number().nonnegative(),
  totalWeightKg: z.number().nonnegative(),
})

export const vehicleRecommendationSchema = z.object({
  vehicle: vehicleSpecSchema,
  packageDimension: packageDimensionSchema,
  vehiclesNeeded: z.number().int().positive(),
  loadRateVolume: z.number().min(0).max(1),
  loadRateWeight: z.number().min(0).max(1),
  reason: z.string().min(1),
  warning: z.string().optional(),
  selectedOrientationLabel: z.string().optional(),
  selectedOrientationAxis: z.enum(['length', 'width', 'height']).optional(),
  boxesPerLayer: z.number().int().nonnegative().optional(),
  layerCount: z.number().int().nonnegative().optional(),
  maxBoxesPerVehicle: z.number().int().nonnegative().optional(),
})

export const vehicleRecommendationRequestSchema = z.object({
  summary: shipmentSummarySchema,
  vehicleSpecs: z.array(vehicleSpecSchema).min(1),
  packageInput: vehicleLoadingPackageInputSchema.optional(),
})

export const vehicleRecommendationResponseSchema = z.object({
  recommendations: z.array(vehicleRecommendationSchema),
  generatedAt: z.string().datetime(),
  engineVersion: z.string().min(1),
})

export type ShipmentSummaryDTO = z.infer<typeof shipmentSummarySchema>
export type VehicleRecommendationDTO = z.infer<
  typeof vehicleRecommendationSchema
>
export type VehicleRecommendationRequestDTO = z.infer<
  typeof vehicleRecommendationRequestSchema
>
export type VehicleRecommendationResponseDTO = z.infer<
  typeof vehicleRecommendationResponseSchema
>
