import type {
  MoldDrawingApiDTO,
  MoldDrawingLogApiDTO,
  SaveMoldDrawingApiDTO,
} from '../contracts/equipment-drawing-api-dto'
import type { MoldDrawing, MoldDrawingLog } from '../data/schema'

function optimisticVersionFromTimestamps(
  updatedAt?: string,
  createdAt?: string
): number {
  const versionSource = updatedAt || createdAt
  if (!versionSource) return 1

  const version = new Date(versionSource).getTime()
  if (!Number.isFinite(version) || version < 1) return 1
  return version
}

export function toMoldDrawingContract(dto: MoldDrawingApiDTO): MoldDrawing {
  return {
    id: dto.id,
    moldId: dto.moldId || '',
    moldSn: dto.moldSn || '',
    name: dto.name,
    type: dto.type,
    fileUrl: dto.fileUrl,
    version: dto.version,
    sysVersion:
      dto.sysVersion ||
      optimisticVersionFromTimestamps(dto.updatedAt, dto.createdAt),
    status: dto.status,
    uploadedAt: dto.uploadedAt,
    remarks: dto.remarks || '',
  }
}

export function toMoldDrawingContracts(
  dtos: MoldDrawingApiDTO[]
): MoldDrawing[] {
  return dtos.map(toMoldDrawingContract)
}

export function toMoldDrawingLogContract(
  dto: MoldDrawingLogApiDTO
): MoldDrawingLog {
  return {
    id: dto.id,
    drawingId: dto.drawingId,
    action: dto.action,
    details: dto.details,
    operator: dto.operator || 'SYSTEM',
    timestamp: dto.timestamp,
  }
}

export function toMoldDrawingLogContracts(
  dtos: MoldDrawingLogApiDTO[]
): MoldDrawingLog[] {
  return dtos.map(toMoldDrawingLogContract)
}

export function toSaveMoldDrawingApiDTO(
  contract: MoldDrawing
): SaveMoldDrawingApiDTO {
  return {
    id: contract.id || undefined,
    moldId: contract.moldId || '',
    moldSn: contract.moldSn || '',
    name: contract.name,
    type: contract.type,
    fileUrl: contract.fileUrl,
    version: contract.version,
    status: contract.status,
    uploadedAt: contract.uploadedAt,
    remarks: contract.remarks || '',
  }
}
