import type {
  PDABulkSyncFailureApiDTO,
  PDABulkSyncResponseApiDTO,
  PDAScanPayloadApiDTO,
  StocktakeCreateRequestApiDTO,
  StocktakeItemApiDTO,
  StocktakeTaskApiDTO,
  WarehouseCommandAckApiDTO,
} from '../contracts/stocktake-api-dto'
import type {
  PDABulkSyncFailure,
  PDABulkSyncResponse,
  PDAScanPayload,
  StocktakeCreateInput,
  StocktakeItem,
  StocktakeTask,
  WarehouseCommandAck,
} from '../data/schema'

export function toStocktakeTaskContract(
  dto: StocktakeTaskApiDTO
): StocktakeTask {
  return {
    id: dto.id,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    version: dto.version ?? 1,
    title: dto.title,
    warehouseCategoryCode: dto.warehouseCategoryCode,
    status: dto.status,
    createdBy: dto.createdBy,
    startTime: dto.startTime || undefined,
    endTime: dto.endTime || undefined,
    remarks: dto.remarks,
  }
}

export function toStocktakeTaskContracts(
  dtos: StocktakeTaskApiDTO[]
): StocktakeTask[] {
  return dtos.map(toStocktakeTaskContract)
}

export function toStocktakeItemContract(
  dto: StocktakeItemApiDTO
): StocktakeItem {
  return {
    id: dto.id,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    taskId: dto.taskId,
    materialId: dto.materialId,
    materialCode: dto.materialCode,
    materialName: dto.materialName,
    batchNo: dto.batchNo,
    theoryQty: dto.theoryQty,
    actualQty: dto.actualQty,
    difference: dto.difference,
    uom: dto.uom,
    scannerId: dto.scannerId,
    scanTime: dto.scanTime || undefined,
    version: dto.version ?? 1,
  }
}

export function toStocktakeItemContracts(
  dtos: StocktakeItemApiDTO[]
): StocktakeItem[] {
  return dtos.map(toStocktakeItemContract)
}

export function toStocktakeCreateRequestApiDTO(
  contract: StocktakeCreateInput
): StocktakeCreateRequestApiDTO {
  return {
    title: contract.title,
    warehouseCategoryCode: contract.warehouseCategoryCode,
    remarks: contract.remarks,
  }
}

export function toPDAScanPayloadApiDTO(
  contract: PDAScanPayload
): PDAScanPayloadApiDTO {
  return {
    taskId: contract.taskId,
    materialCode: contract.materialCode,
    batchNo: contract.batchNo,
    scannedQty: contract.scannedQty,
    scanTime: contract.scanTime,
    scannerId: contract.scannerId,
  }
}

export function toPDABulkSyncFailureContract(
  dto: PDABulkSyncFailureApiDTO
): PDABulkSyncFailure {
  return {
    index: dto.index,
    taskId: dto.taskId,
    materialCode: dto.materialCode,
    batchNo: dto.batchNo,
    scannedQty: dto.scannedQty,
    error: dto.error,
  }
}

export function toPDABulkSyncResponseContract(
  dto: PDABulkSyncResponseApiDTO
): PDABulkSyncResponse {
  return {
    count: dto.count,
    successCount: dto.successCount,
    failedCount: dto.failedCount,
    failures: dto.failures.map(toPDABulkSyncFailureContract),
    message: dto.message,
  }
}

export function toWarehouseCommandAckContract(
  dto: WarehouseCommandAckApiDTO
): WarehouseCommandAck {
  return {
    message: dto.message,
  }
}
