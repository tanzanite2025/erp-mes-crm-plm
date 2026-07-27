import type {
  VehicleModelTemplate,
  VehicleModelTemplateSourceFormat,
} from '../../shared/vehicle-model-template.types'
import type { VehicleSpec } from '../../vehicle-specs/data/vehicle-specs.types'
import type {
  VehicleModelTemplateDraft,
  VehicleModelTemplateDraftInput,
  VehicleModelTemplateDTO,
  VehicleModelTemplateSourceAsset,
} from '../data/vehicle-model-templates.types'

const DEFAULT_TEMPLATE_SUFFIX = '模板'

function getVehicleModelTemplateUpdatedAtTime(
  template: VehicleModelTemplateDTO
): number {
  const time = new Date(template.updatedAt).getTime()
  return Number.isFinite(time) ? time : 0
}

export function selectLatestVehicleModelTemplateForSeedVehicle(
  templates: VehicleModelTemplateDTO[],
  seedVehicleSpecId?: string
): VehicleModelTemplateDTO | undefined {
  const normalizedSeedVehicleSpecId = seedVehicleSpecId?.trim()
  if (!normalizedSeedVehicleSpecId) return undefined

  return templates
    .filter(
      (template) => template.seedVehicleSpecId === normalizedSeedVehicleSpecId
    )
    .sort(
      (left, right) =>
        getVehicleModelTemplateUpdatedAtTime(right) -
        getVehicleModelTemplateUpdatedAtTime(left)
    )[0]
}

export function inferVehicleModelTemplateSourceFormat(
  fileName?: string | null
): VehicleModelTemplateSourceFormat {
  const extension = fileName?.split('.').pop()?.toLowerCase() ?? ''

  switch (extension) {
    case 'glb':
      return extension
    default:
      return 'seed-spec'
  }
}

export function formatVehicleModelTemplateSourceLabel(
  sourceFormat: VehicleModelTemplateSourceFormat
): string {
  if (sourceFormat === 'seed-spec') return '种子车型'
  return sourceFormat.toUpperCase()
}

export function formatVehicleModelTemplateStatusLabel(
  status: VehicleModelTemplateDraft['status']
): string {
  switch (status) {
    case 'seed-only':
      return '仅种子'
    case 'uploaded':
      return '已上传'
    case 'normalized':
      return '已归一'
  }
}

function resolveVehicleModelTemplateStatus(
  sourceAsset?: VehicleModelTemplateSourceAsset
): VehicleModelTemplateDraft['status'] {
  if (!sourceAsset) return 'seed-only'
  return 'uploaded'
}

function buildVehicleModelTemplateNotes(
  vehicleSpec: VehicleSpec,
  sourceAsset?: VehicleModelTemplateSourceAsset
): string[] {
  const notes = [
    '种子车型来自车型规格库，可作为唯一主数据入口。',
    '归一装载空间当前直接复用车型的可用装载空间，后续由解析器覆盖为真实模板几何。',
  ]

  if (sourceAsset) {
    notes.push(`源文件已接收：${sourceAsset.fileName}`)
  } else {
    notes.push('尚未上传 3D 源文件，当前仅保留种子定义。')
  }

  if (vehicleSpec.loadingConstraint.hasCenterPillar) {
    notes.push('车型本身包含中柱干涉约束，后续解析器需保留障碍区。')
  }

  return notes
}

export function buildVehicleModelTemplateDraftFromVehicleSpec({
  vehicleSpec,
  sourceAsset,
  templateName,
}: VehicleModelTemplateDraftInput): VehicleModelTemplateDraft {
  const resolvedSourceAsset = sourceAsset
    ? {
        ...sourceAsset,
        format: sourceAsset.format,
      }
    : undefined

  return {
    id: `vehicle-model-template:${vehicleSpec.id}`,
    name: templateName ?? `${vehicleSpec.name} ${DEFAULT_TEMPLATE_SUFFIX}`,
    seedVehicleSpecId: vehicleSpec.id,
    seedVehicleName: vehicleSpec.name,
    sourceFormat: resolvedSourceAsset?.format ?? 'seed-spec',
    status: resolveVehicleModelTemplateStatus(resolvedSourceAsset),
    sourceAssetName: resolvedSourceAsset?.fileName,
    sourceAssetUrl: resolvedSourceAsset?.url,
    normalizedFootprint: {
      lengthMm: vehicleSpec.usableInnerSize.lengthMm,
      widthMm: vehicleSpec.usableInnerSize.widthMm,
      heightMm: vehicleSpec.usableInnerSize.heightMm,
    },
    notes: buildVehicleModelTemplateNotes(vehicleSpec, resolvedSourceAsset),
    version: 1,
  }
}

export function buildVehicleModelTemplateFromVehicleSpec(
  input: VehicleModelTemplateDraftInput
): VehicleModelTemplate {
  const draft = buildVehicleModelTemplateDraftFromVehicleSpec(input)

  return {
    id: draft.id,
    name: draft.name,
    seedVehicleSpecId: draft.seedVehicleSpecId,
    seedVehicleName: draft.seedVehicleName,
    sourceFormat: draft.sourceFormat,
    status: draft.status,
    sourceAssetName: draft.sourceAssetName,
    sourceAssetUrl: draft.sourceAssetUrl,
    normalizedFootprint: draft.normalizedFootprint,
    notes: draft.notes,
  }
}
