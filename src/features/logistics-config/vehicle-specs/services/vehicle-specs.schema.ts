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

export type VehicleCategoryDTO = z.infer<typeof vehicleCategorySchema>
export type VehiclePhotoViewTypeDTO = z.infer<typeof vehiclePhotoViewTypeSchema>
export type VehiclePhotoAnnotationDTO = z.infer<
  typeof vehiclePhotoAnnotationSchema
>
export type VehiclePhotoImageDTO = z.infer<typeof vehiclePhotoImageSchema>
export type VehiclePhotoEntryDTO = z.infer<typeof vehiclePhotoEntrySchema>
export type VehicleSpecDTO = z.infer<typeof vehicleSpecSchema>
