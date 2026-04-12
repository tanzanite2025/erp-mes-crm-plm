import type { Material, MaterialDimensions, MaterialOption } from '../data/schema'
import type {
  BulkSyncMaterialsApiDTO,
  MaterialApiDTO,
  MaterialListPageApiDTO,
  MaterialOptionApiDTO,
  SaveMaterialApiDTO,
} from '../contracts/material-api-contract'
import type { MaterialDimensionsApiDTO } from '../contracts/material-api-contract'

export interface MaterialListPageContract {
  items: Material[]
  total: number
  page: number
  pageSize: number
  version: string
}

function toDimensionsContract(
  value: MaterialDimensionsApiDTO | null | undefined
): MaterialDimensions | undefined {
  if (!value || typeof value !== 'object') return undefined

  return {
    length: Number(value.length) || 0,
    width: Number(value.width) || 0,
    height: Number(value.height) || 0,
    unit: value.unit || 'mm',
  }
}

function toImagesContract(value: string[] | undefined): string[] {
  return Array.isArray(value) ? value : []
}

function toVersion(dto: { version?: number }): number {
  return dto.version ?? 1
}

export function toMaterialContract(dto: MaterialApiDTO): Material {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    category: dto.category,
    spec: dto.spec || '',
    internalDimensions: toDimensionsContract(dto.internalDimensions),
    externalDimensions: toDimensionsContract(dto.externalDimensions),
    uom: dto.uom || 'PCS',
    minStock: Number(dto.minStock) || 0,
    costPrice: dto.costPrice ?? 0,
    supplierId: dto.supplierId || '',
    description: dto.description || '',
    images: toImagesContract(dto.images),
    status: dto.status || 'Active',
    revisionNo: dto.revisionNo || 'R1',
    effectiveFrom: dto.effectiveFrom ?? undefined,
    effectiveTo: dto.effectiveTo ?? undefined,
    changeType: dto.changeType || 'MANUAL',
    changeOrderNo: dto.changeOrderNo || '',
    siteCode: dto.siteCode || '',
    isDefaultSite: dto.isDefaultSite ?? false,
    createdAt: dto.createdAt || '',
    updatedAt: dto.updatedAt || '',
    version: toVersion(dto),
  }
}

export function toMaterialOptionContract(dto: MaterialOptionApiDTO): MaterialOption {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    category: dto.category || 'RAW_MATERIAL',
    spec: dto.spec || '',
    uom: dto.uom || 'PCS',
    costPrice: dto.costPrice ?? 0,
    status: dto.status || 'Active',
  }
}

export function toMaterialContracts(dtos: MaterialApiDTO[]): Material[] {
  return dtos.map(toMaterialContract)
}

export function toMaterialOptionContracts(dtos: MaterialOptionApiDTO[]): MaterialOption[] {
  return dtos.map(toMaterialOptionContract)
}

export function toMaterialListPageContract(dto: MaterialListPageApiDTO): MaterialListPageContract {
  return {
    items: toMaterialContracts(dto.items),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
    version: dto.version || '1',
  }
}

function toDimensionsApiDTO(value: MaterialDimensions | undefined): MaterialDimensionsApiDTO | undefined {
  if (!value) return undefined

  return {
    length: Number(value.length) || 0,
    width: Number(value.width) || 0,
    height: Number(value.height) || 0,
    unit: value.unit || 'mm',
  }
}

export function toSaveMaterialApiDTO(material: Partial<Material>): SaveMaterialApiDTO {
  return {
    id: material.id || undefined,
    code: material.code || '',
    name: material.name || '',
    category: material.category || 'RAW_MATERIAL',
    spec: material.spec || '',
    internalDimensions: toDimensionsApiDTO(material.internalDimensions),
    externalDimensions: toDimensionsApiDTO(material.externalDimensions),
    uom: material.uom || 'PCS',
    minStock: Number(material.minStock) || 0,
    costPrice: material.costPrice ?? 0,
    supplierId: material.supplierId || '',
    description: material.description || '',
    images: Array.isArray(material.images) ? material.images : [],
    status: material.status || 'Active',
    revisionNo: material.revisionNo || undefined,
    effectiveFrom: material.effectiveFrom ?? undefined,
    effectiveTo: material.effectiveTo ?? undefined,
    changeType: material.changeType || undefined,
    changeOrderNo: material.changeOrderNo || undefined,
    siteCode: material.siteCode || undefined,
    isDefaultSite: material.isDefaultSite ?? undefined,
    version: material.version,
  }
}

export function toBulkSyncMaterialsApiDTO(
  materials: Partial<Material>[],
  options?: { globalVersion?: number | string }
): BulkSyncMaterialsApiDTO {
  const parsedVersion =
    options?.globalVersion === undefined || options.globalVersion === null || options.globalVersion === ''
      ? undefined
      : Number(options.globalVersion)

  return {
    materials: materials.map(toSaveMaterialApiDTO),
    globalVersion: Number.isFinite(parsedVersion) ? parsedVersion : undefined,
  }
}
