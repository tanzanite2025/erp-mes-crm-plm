import { z } from 'zod'
import { vehicleSpecSchema } from '../../vehicle-specs/services/vehicle-specs.schema'

const packageDimensionSchema = z.object({
  lengthMm: z.number().positive(),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  canRotate: z.boolean(),
  canInvert: z.boolean(),
})

export const vehicleRecommendationSchema = z.object({
  vehicle: vehicleSpecSchema,
  packageDimension: packageDimensionSchema,
  vehiclesNeeded: z.number().int().positive(),
  loadRateVolume: z.number().min(0).max(1),
  loadRateWeight: z.number().min(0).max(1),
  reason: z.string().min(1),
  warning: z.string().optional(),
  selectedOrientation: z.object({
    label: z.string().min(1),
    lengthAxis: z.enum(['length', 'width', 'height']),
    widthAxis: z.enum(['length', 'width', 'height']),
    heightAxis: z.enum(['length', 'width', 'height']),
    lengthMm: z.number().positive(),
    widthMm: z.number().positive(),
    heightMm: z.number().positive(),
  }),
  boxesPerLayer: z.number().int().nonnegative().optional(),
  layerCount: z.number().int().nonnegative().optional(),
  maxBoxesPerVehicle: z.number().int().nonnegative().optional(),
})

export const vehicleRecommendationRequestSchema = z.object({
  boxes: z.number().int().positive(),
  packagingProfileId: z.string().min(1),
  vehicleSpecIds: z.array(z.string().min(1)).min(1),
})

export const vehicleRecommendationResponseSchema = z.object({
  recommendations: z.array(vehicleRecommendationSchema),
  generatedAt: z.string().datetime(),
  engineVersion: z.string().min(1),
})

export type VehicleRecommendationDTO = z.infer<
  typeof vehicleRecommendationSchema
>
export type VehicleRecommendationRequestDTO = z.infer<
  typeof vehicleRecommendationRequestSchema
>
export type VehicleRecommendationResponseDTO = z.infer<
  typeof vehicleRecommendationResponseSchema
>
