import { z } from 'zod'
import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import type { VehicleModelTemplateStatus } from '../../shared/vehicle-model-template.types'
import type {
  VehicleModelTemplateDTO,
  VehicleModelTemplateVersionDTO,
  VehicleModelTemplateSourceAsset,
} from '../data/vehicle-model-templates.types'

const vehicleModelTemplateFootprintSchema = z.object({
  lengthMm: z.number().nonnegative(),
  widthMm: z.number().nonnegative(),
  heightMm: z.number().nonnegative(),
})

const vehicleModelTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  seedVehicleSpecId: z.string().min(1),
  seedVehicleName: z.string().min(1),
  sourceAssetUrl: z.string().min(1),
  sourceAssetName: z.string().min(1),
  sourceFormat: z.literal('glb'),
  status: z.enum(['uploaded', 'normalized']),
  normalizedFootprint: vehicleModelTemplateFootprintSchema,
  version: z.number().int().positive(),
  versionCount: z.number().int().nonnegative().optional().default(0),
  notes: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const vehicleModelTemplateVersionSchema = vehicleModelTemplateSchema
  .omit({ versionCount: true })
  .extend({
    templateId: z.string().min(1),
    snapshot: z.unknown().optional(),
  })

const parseVehicleModelTemplateGeometryResponseSchema = z.object({
  template: vehicleModelTemplateSchema,
  geometry: z.unknown(),
})

export type SaveVehicleModelTemplateInput = {
  id?: string
  name: string
  seedVehicleSpecId: string
  sourceAsset: VehicleModelTemplateSourceAsset
  status: Extract<VehicleModelTemplateStatus, 'uploaded'>
  normalizedFootprint: {
    lengthMm: number
    widthMm: number
    heightMm: number
  }
  notes: string[]
}

export type ParseVehicleModelTemplateGeometryResult = {
  template: VehicleModelTemplateDTO
  geometry: unknown
}

function buildVehicleModelTemplatePayload(
  input: SaveVehicleModelTemplateInput
) {
  return {
    name: input.name,
    seedVehicleSpecId: input.seedVehicleSpecId,
    sourceAssetUrl: input.sourceAsset.url,
    sourceAssetName: input.sourceAsset.fileName,
    sourceFormat: input.sourceAsset.format,
    status: input.status,
    normalizedFootprint: input.normalizedFootprint,
    notes: input.notes,
  }
}

export async function getVehicleModelTemplates(
  seedVehicleSpecId?: string
): Promise<VehicleModelTemplateDTO[]> {
  const query = seedVehicleSpecId
    ? `?seedVehicleSpecId=${encodeURIComponent(seedVehicleSpecId)}`
    : ''
  const response = await apiFetch<unknown>(
    `/logistics-config/vehicle-model-templates${query}`
  )
  return vehicleModelTemplateSchema
    .array()
    .parse(
      ensureArrayResponse<unknown>(
        response,
        'VehicleModelTemplateService.getVehicleModelTemplates'
      )
    )
}

export async function saveVehicleModelTemplate(
  input: SaveVehicleModelTemplateInput
): Promise<VehicleModelTemplateDTO> {
  const endpoint = input.id
    ? `/logistics-config/vehicle-model-templates/${encodeURIComponent(input.id)}`
    : '/logistics-config/vehicle-model-templates'
  const method = input.id ? 'PATCH' : 'POST'
  const response = await apiFetch<unknown>(endpoint, {
    method,
    body: JSON.stringify(buildVehicleModelTemplatePayload(input)),
  })
  return vehicleModelTemplateSchema.parse(
    ensureObjectResponse<Record<string, unknown>>(
      response,
      'VehicleModelTemplateService.saveVehicleModelTemplate'
    )
  )
}

export async function getVehicleModelTemplateVersions(
  templateId: string
): Promise<VehicleModelTemplateVersionDTO[]> {
  const response = await apiFetch<unknown>(
    `/logistics-config/vehicle-model-templates/${encodeURIComponent(
      templateId
    )}/versions`
  )
  return vehicleModelTemplateVersionSchema
    .array()
    .parse(
      ensureArrayResponse<unknown>(
        response,
        'VehicleModelTemplateService.getVehicleModelTemplateVersions'
      )
    )
}

export async function restoreVehicleModelTemplateVersion(
  templateId: string,
  version: number
): Promise<VehicleModelTemplateDTO> {
  const response = await apiFetch<unknown>(
    `/logistics-config/vehicle-model-templates/${encodeURIComponent(
      templateId
    )}/versions/${encodeURIComponent(String(version))}/restore`,
    { method: 'POST' }
  )
  return vehicleModelTemplateSchema.parse(
    ensureObjectResponse<Record<string, unknown>>(
      response,
      'VehicleModelTemplateService.restoreVehicleModelTemplateVersion'
    )
  )
}

export async function parseVehicleModelTemplateGeometry(
  templateId: string
): Promise<ParseVehicleModelTemplateGeometryResult> {
  const response = await apiFetch<unknown>(
    `/logistics-config/vehicle-model-templates/${encodeURIComponent(
      templateId
    )}/parse`,
    { method: 'POST' }
  )
  return parseVehicleModelTemplateGeometryResponseSchema.parse(
    ensureObjectResponse<Record<string, unknown>>(
      response,
      'VehicleModelTemplateService.parseVehicleModelTemplateGeometry'
    )
  )
}
