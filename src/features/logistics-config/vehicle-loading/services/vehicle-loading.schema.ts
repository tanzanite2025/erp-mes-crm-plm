import { z } from 'zod'

export const vehicleCategorySchema = z.enum([
  'van',
  'boxTruck',
  'lightTruck',
  'mediumTruck',
])
export const vehiclePhotoViewTypeSchema = z.enum([
  'exterior',
  'sideDoorOpen',
  'rearDoorInterior',
])

const vehicleDimensionSchema = z.object({
  lengthMm: z.number().nonnegative(),
  widthMm: z.number().nonnegative(),
  heightMm: z.number().nonnegative(),
})

const vehicleSafetyAllowanceSchema = z.object({
  topClearanceMm: z.number().nonnegative(),
  sideClearanceMm: z.number().nonnegative(),
  rearClearanceMm: z.number().nonnegative(),
})

const vehicleLoadingConstraintSchema = z.object({
  doorWidthMm: z.number().nonnegative(),
  doorHeightMm: z.number().nonnegative(),
  wheelArchWidthMm: z.number().nonnegative(),
  wheelArchHeightMm: z.number().nonnegative(),
  hasCenterPillar: z.boolean(),
})

export const vehiclePhotoAnnotationSchema = z.object({
  id: z.string().min(1),
  xPercent: z.number(),
  yPercent: z.number(),
  title: z.string().min(1),
  description: z.string().min(1),
  tag: z.string().optional(),
})

export const vehiclePhotoImageSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  url: z.string().min(1),
  alt: z.string().min(1),
  viewType: vehiclePhotoViewTypeSchema,
  caption: z.string().optional(),
  annotations: z.array(vehiclePhotoAnnotationSchema),
})

export const vehiclePhotoEntrySchema = z.object({
  vehicleId: z.string().min(1),
  displayTitle: z.string().min(1),
  description: z.string().optional(),
  coverImageUrl: z.string().optional(),
  tags: z.array(z.string()),
  images: z.array(vehiclePhotoImageSchema),
})

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

export const vehicleSpecSchema = z.object({
  id: z.string().min(1),
  category: vehicleCategorySchema,
  name: z.string().min(1),
  payloadKg: z.number().nonnegative(),
  volumeM3: z.number().nonnegative(),
  nominalVolumeM3: z.number().nonnegative(),
  physicalInnerSize: vehicleDimensionSchema,
  usableInnerSize: vehicleDimensionSchema,
  safetyAllowance: vehicleSafetyAllowanceSchema,
  loadingConstraint: vehicleLoadingConstraintSchema,
  photoEntry: vehiclePhotoEntrySchema,
  isBoxBody: z.boolean(),
  enabled: z.boolean(),
  notes: z.string(),
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

export type VehicleCategoryDTO = z.infer<typeof vehicleCategorySchema>
export type VehiclePhotoViewTypeDTO = z.infer<typeof vehiclePhotoViewTypeSchema>
export type VehiclePhotoAnnotationDTO = z.infer<
  typeof vehiclePhotoAnnotationSchema
>
export type VehiclePhotoImageDTO = z.infer<typeof vehiclePhotoImageSchema>
export type VehiclePhotoEntryDTO = z.infer<typeof vehiclePhotoEntrySchema>
export type VehicleSpecDTO = z.infer<typeof vehicleSpecSchema>
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
