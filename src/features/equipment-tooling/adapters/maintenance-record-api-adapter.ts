import { maintenanceRecordSchema, type MaintenanceRecord } from '../data/schema'
import type {
  MaintenanceRecordApiDTO,
  SaveMaintenanceRecordApiDTO,
} from '../contracts/maintenance-record-api-dto'

/**
 * Transform API DTO to domain contract with runtime validation
 * @param dto - MaintenanceRecordApiDTO from backend
 * @returns MaintenanceRecord - validated domain object
 */
export function toMaintenanceRecordContract(dto: MaintenanceRecordApiDTO): MaintenanceRecord {
  const parseResult = maintenanceRecordSchema.safeParse({
    id: dto.id,
    assetType: dto.assetType,
    assetId: dto.assetId,
    assetSn: dto.assetSn,
    type: dto.type,
    status: dto.status,
    title: dto.title,
    description: dto.description,
    priority: dto.priority,
    startedAt: dto.startedAt,
    completedAt: dto.completedAt,
    cost: dto.cost,
    remarks: dto.remarks,
    createdBy: dto.createdBy,
    updatedBy: dto.updatedBy,
    version: dto.version,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  })

  if (!parseResult.success) {
    console.error('MaintenanceRecord schema validation failed:', parseResult.error)
    console.error('DTO that failed validation:', dto)
    // Re-throw to surface the validation error
    throw new Error(`MaintenanceRecord validation failed: ${parseResult.error.message}`)
  }

  return parseResult.data
}

/**
 * Transform array of API DTOs to domain contracts
 * @param dtos - Array of MaintenanceRecordApiDTO from backend
 * @returns Array of validated MaintenanceRecord domain objects
 */
export function toMaintenanceRecordContracts(dtos: MaintenanceRecordApiDTO[]): MaintenanceRecord[] {
  return dtos.map(toMaintenanceRecordContract)
}

/**
 * Transform form data to API DTO for create/save operations
 * @param formData - Form data from UI
 * @returns SaveMaintenanceRecordApiDTO - wire format for backend
 */
export function toSaveMaintenanceRecordApiDTO(
  formData: Omit<SaveMaintenanceRecordApiDTO, 'assetType' | 'assetId' | 'assetSn'> & {
    assetType: string
    assetId: string
    assetSn: string
  }
): SaveMaintenanceRecordApiDTO {
  return {
    assetType: formData.assetType.trim(),
    assetId: formData.assetId.trim(),
    assetSn: formData.assetSn.trim(),
    type: formData.type,
    title: formData.title.trim(),
    description: formData.description?.trim() || undefined,
    priority: formData.priority || 'MEDIUM',
    cost: formData.cost ?? 0,
    remarks: formData.remarks?.trim() || undefined,
  }
}
