/**
 * 仓库领域 API DTO ↔ Contract 双向适配器(契约层)。
 *
 * 此文件是仓库模块所有"网络协议 DTO"和"前端业务 Contract"间的转换中心,
 * 集中所有 toXxxContract / toXxxApiDTO 双向映射,保证:
 *   - UI 层只依赖业务 Contract(去掉网络协议噪音字段)
 *   - 后端 DTO 字段变更时,只需要改本文件,UI 层不动
 *
 * 涵盖实体: WarehouseCategory / Inventory / InboundRecord / ShipmentRecord /
 *           StocktakeTask / StocktakeItem / InventoryAdjustment / 其他统计/告警类型。
 *
 * 关键不变量:
 *   - 所有 toXxxContracts(复数)版本都返回新数组,不修改入参
 *   - 时间字段统一走 toDateOnlyString 规范化
 *   - 适配器纯函数,便于单元测试 / 契约测试覆盖
 */
import type {
  InventoryAlertSummaryApiDTO,
  InventoryAdjustmentApiDTO,
  InventoryAdjustmentItemApiDTO,
  InventoryInboundRecordApiDTO,
  InventoryItemApiDTO,
  InventoryShipmentRecordApiDTO,
  InventoryAdjustmentStatusApiDTO,
  InventoryAdjustmentTypeApiDTO,
  InventoryValuationApiDTO,
  MasterDataSearchResultApiDTO,
  PDABulkSyncFailureApiDTO,
  PDABulkSyncResponseApiDTO,
  PDAScanPayloadApiDTO,
  StocktakeCreateRequestApiDTO,
  StocktakeItemApiDTO,
  StocktakeTaskApiDTO,
  StocktakeTaskStatusApiDTO,
  WarehouseCommandAckApiDTO,
  WarehouseCategoryApiDTO,
  WarehouseCategoryOptionApiDTO,
} from '../contracts/warehouse-api-dto'

export interface WarehouseCategory {
  id: string
  createdAt?: string
  updatedAt?: string
  version: number
  name: string
  code: string
  description?: string
  isSystem: boolean
  active: boolean
  sortOrder: number
  allowInbound: boolean
  allowShipment: boolean
  allowStocktake: boolean
  allowPurchaseReceipt: boolean
  defaultForProductInbound: boolean
  defaultForMaterialInbound: boolean
  defaultForPurchaseReceipt: boolean
}

export interface WarehouseCategoryOption {
  value: string
  label: string
  code: string
  name: string
  active: boolean
  sortOrder: number
  allowInbound: boolean
  allowShipment: boolean
  allowStocktake: boolean
  allowPurchaseReceipt: boolean
  defaultForProductInbound: boolean
  defaultForMaterialInbound: boolean
  defaultForPurchaseReceipt: boolean
}

export interface InventoryRecord {
  id: string
  materialId: string
  quantity: number
  totalValue: number
  averageUnitCost: number
  categoryCode: string
  lastUpdated: string
  version: number
}

export interface InventoryView extends InventoryRecord {
  materialName: string
  materialCode: string
  materialCategory: string
  materialSpec: string
  batchNo: string
  uom: string
  createdAt?: string
  updatedAt?: string
}

export interface MasterDataSearchResult {
  id: string
  name: string
  code: string
  spec: string
  uom: string
  category: string
  sourceModule: 'MATERIAL' | 'PRODUCT'
  stock: number
}

export interface InboundRecord {
  id: string
  materialId: string
  materialName: string
  materialCode: string
  purchaseOrderId?: string
  purchaseOrderLineId?: number
  quantity: number
  purchasePrice: number
  batchNo: string
  entryDate: string
  operator: string
  remarks: string
  targetCategory: string
  createdAt?: string
  updatedAt?: string
}

export type ShipmentStatus = 'DRAFT' | 'COMMITTED' | 'VOID'

export interface ShipmentRecord {
  id: string
  materialId: string
  materialName: string
  materialCode: string
  salesOrderId?: string
  salesOrderLineId?: number
  quantity: number
  cogs: number
  batchNo: string
  shipmentDate: string
  operator: string
  orderNo: string
  remarks: string
  sourceCategory: string
  status: ShipmentStatus
  version: number
  createdAt?: string
  updatedAt?: string
}

function toDateOnlyString(value?: string): string {
  if (!value) return ''
  return value.slice(0, 10)
}

export function toWarehouseCategoryContract(
  dto: WarehouseCategoryApiDTO
): WarehouseCategory {
  return {
    id: dto.id,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    version: dto.version,
    name: dto.name,
    code: dto.code,
    description: dto.description,
    isSystem: dto.isSystem,
    active: dto.active,
    sortOrder: dto.sortOrder,
    allowInbound: dto.allowInbound,
    allowShipment: dto.allowShipment,
    allowStocktake: dto.allowStocktake,
    allowPurchaseReceipt: dto.allowPurchaseReceipt,
    defaultForProductInbound: dto.defaultForProductInbound,
    defaultForMaterialInbound: dto.defaultForMaterialInbound,
    defaultForPurchaseReceipt: dto.defaultForPurchaseReceipt,
  }
}

export function toWarehouseCategoryContracts(
  dtos: WarehouseCategoryApiDTO[]
): WarehouseCategory[] {
  return dtos.map(toWarehouseCategoryContract)
}

export function toWarehouseCategoryApiDTO(
  contract: Omit<
    WarehouseCategory,
    'id' | 'version' | 'createdAt' | 'updatedAt'
  >
): Omit<WarehouseCategoryApiDTO, 'id' | 'version' | 'createdAt' | 'updatedAt'> {
  return {
    name: contract.name,
    code: contract.code,
    description: contract.description,
    isSystem: contract.isSystem,
    active: contract.active,
    sortOrder: contract.sortOrder,
    allowInbound: contract.allowInbound,
    allowShipment: contract.allowShipment,
    allowStocktake: contract.allowStocktake,
    allowPurchaseReceipt: contract.allowPurchaseReceipt,
    defaultForProductInbound: contract.defaultForProductInbound,
    defaultForMaterialInbound: contract.defaultForMaterialInbound,
    defaultForPurchaseReceipt: contract.defaultForPurchaseReceipt,
  }
}

export function toWarehouseCategoryOptionContract(
  dto: WarehouseCategoryOptionApiDTO
): WarehouseCategoryOption {
  return {
    value: dto.value,
    label: dto.label,
    code: dto.code,
    name: dto.name,
    active: dto.active,
    sortOrder: dto.sortOrder,
    allowInbound: dto.allowInbound,
    allowShipment: dto.allowShipment,
    allowStocktake: dto.allowStocktake,
    allowPurchaseReceipt: dto.allowPurchaseReceipt,
    defaultForProductInbound: dto.defaultForProductInbound,
    defaultForMaterialInbound: dto.defaultForMaterialInbound,
    defaultForPurchaseReceipt: dto.defaultForPurchaseReceipt,
  }
}

export function toWarehouseCategoryOptionContracts(
  dtos: WarehouseCategoryOptionApiDTO[]
): WarehouseCategoryOption[] {
  return dtos.map(toWarehouseCategoryOptionContract)
}

export function toInventoryRecordContract(
  dto: InventoryItemApiDTO
): InventoryRecord {
  return {
    id: dto.id,
    materialId: dto.materialId,
    quantity: dto.quantity,
    totalValue: dto.totalValue,
    averageUnitCost: dto.averageUnitCost,
    categoryCode: dto.categoryCode,
    lastUpdated: dto.lastUpdated || dto.updatedAt || dto.createdAt || '',
    version: dto.version,
  }
}

export function toInventoryViewContract(
  dto: InventoryItemApiDTO
): InventoryView {
  return {
    ...toInventoryRecordContract(dto),
    materialName: dto.materialName,
    materialCode: dto.materialCode,
    materialCategory: dto.materialCategory,
    materialSpec: dto.materialSpec,
    batchNo: dto.batchNo,
    uom: dto.uom,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

export function toInventoryViewContracts(
  dtos: InventoryItemApiDTO[]
): InventoryView[] {
  return dtos.map(toInventoryViewContract)
}

export function toMasterDataSearchResultContract(
  dto: MasterDataSearchResultApiDTO
): MasterDataSearchResult {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    spec: dto.spec,
    uom: dto.uom,
    category: dto.category,
    sourceModule: dto.sourceModule,
    stock: dto.stock,
  }
}

export function toMasterDataSearchResultContracts(
  dtos: MasterDataSearchResultApiDTO[]
): MasterDataSearchResult[] {
  return dtos.map(toMasterDataSearchResultContract)
}

export function toInboundRecordContract(
  dto: InventoryInboundRecordApiDTO
): InboundRecord {
  return {
    id: dto.id,
    materialId: dto.materialId,
    materialName: dto.materialName,
    materialCode: dto.materialCode,
    purchaseOrderId: dto.purchaseOrderId,
    purchaseOrderLineId: dto.purchaseOrderLineId,
    quantity: dto.quantity,
    purchasePrice: dto.purchasePrice,
    batchNo: dto.batchNo,
    entryDate: toDateOnlyString(dto.inboundDate),
    operator: dto.operator,
    remarks: dto.remarks,
    targetCategory: dto.targetCategory,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

export function toInboundRecordContracts(
  dtos: InventoryInboundRecordApiDTO[]
): InboundRecord[] {
  return dtos.map(toInboundRecordContract)
}

export function toInboundRecordApiDTO(
  contract: Omit<InboundRecord, 'id' | 'createdAt' | 'updatedAt'>
): Omit<InventoryInboundRecordApiDTO, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    materialId: contract.materialId,
    materialName: contract.materialName,
    materialCode: contract.materialCode,
    purchaseOrderId: contract.purchaseOrderId,
    purchaseOrderLineId: contract.purchaseOrderLineId,
    quantity: contract.quantity,
    purchasePrice: contract.purchasePrice,
    targetCategory: contract.targetCategory,
    batchNo: contract.batchNo,
    inboundDate: contract.entryDate,
    operator: contract.operator,
    remarks: contract.remarks,
  }
}

export function toShipmentRecordContract(
  dto: InventoryShipmentRecordApiDTO
): ShipmentRecord {
  return {
    id: dto.id,
    materialId: dto.materialId,
    materialName: dto.materialName,
    materialCode: dto.materialCode,
    salesOrderId: dto.salesOrderId,
    salesOrderLineId: dto.salesOrderLineId,
    quantity: dto.quantity,
    cogs: dto.cogs,
    batchNo: dto.batchNo,
    shipmentDate: toDateOnlyString(dto.shipmentDate),
    operator: dto.operator,
    orderNo: dto.orderNo,
    remarks: dto.remarks,
    sourceCategory: dto.sourceCategory,
    status: dto.status,
    version: dto.version,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

export function toShipmentRecordContracts(
  dtos: InventoryShipmentRecordApiDTO[]
): ShipmentRecord[] {
  return dtos.map(toShipmentRecordContract)
}

export function toShipmentRecordApiDTO(
  contract: Omit<ShipmentRecord, 'id' | 'createdAt' | 'updatedAt'>
): Omit<InventoryShipmentRecordApiDTO, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    materialId: contract.materialId,
    materialName: contract.materialName,
    materialCode: contract.materialCode,
    salesOrderId: contract.salesOrderId,
    salesOrderLineId: contract.salesOrderLineId,
    quantity: contract.quantity,
    sourceCategory: contract.sourceCategory,
    batchNo: contract.batchNo,
    orderNo: contract.orderNo,
    status: contract.status,
    cogs: contract.cogs,
    shipmentDate: contract.shipmentDate,
    operator: contract.operator,
    remarks: contract.remarks,
    version: contract.version,
  }
}

export function toInventoryValuationContract(
  dto: InventoryValuationApiDTO
): number {
  return dto.totalValue
}

export function toInventoryAlertSummaryContract(
  dto: InventoryAlertSummaryApiDTO
): { alertCount: number } {
  return { alertCount: dto.alertCount }
}

export type StocktakeTaskStatus = StocktakeTaskStatusApiDTO

export interface StocktakeTask {
  id: string
  createdAt: string
  updatedAt: string
  title: string
  warehouseCategoryCode: string
  status: StocktakeTaskStatus
  createdBy: string
  startTime?: string
  endTime?: string
  remarks?: string
}

export interface StocktakeItem {
  id: string
  createdAt: string
  updatedAt: string
  taskId: string
  materialId: string
  materialCode: string
  materialName: string
  batchNo: string
  theoryQty: number
  actualQty: number
  difference: number
  uom: string
  scannerId?: string
  scanTime?: string
  version: number
}

export interface StocktakeCreateInput {
  title: string
  warehouseCategoryCode: string
  remarks?: string
}

export interface PDAScanPayload {
  taskId: string
  materialCode: string
  batchNo: string
  scannedQty: number
  scanTime?: string
  scannerId?: string
}

export interface PDABulkSyncFailure {
  index: number
  taskId: string
  materialCode: string
  batchNo: string
  scannedQty: number
  error: string
}

export interface PDABulkSyncResponse {
  count: number
  successCount: number
  failedCount: number
  failures: PDABulkSyncFailure[]
  message: string
}

export interface WarehouseCommandAck {
  message: string
}

export function toStocktakeTaskContract(
  dto: StocktakeTaskApiDTO
): StocktakeTask {
  return {
    id: dto.id,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
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

export type InventoryAdjustmentType = InventoryAdjustmentTypeApiDTO

export type InventoryAdjustmentStatus = InventoryAdjustmentStatusApiDTO

export interface AdjustmentItem {
  id: string
  createdAt: string
  updatedAt: string
  adjustmentId: string
  materialId: string
  materialCode: string
  materialName: string
  categoryCode: string
  batchNo: string
  theoryQty: number
  actualQty: number
  diffQty: number
  uom: string
}

export interface InventoryAdjustment {
  id: string
  createdAt: string
  updatedAt: string
  taskId?: string
  adjustmentNo: string
  type: InventoryAdjustmentType
  status: InventoryAdjustmentStatus
  reason: string
  createdBy: string
  approvedBy?: string
  approvedAt?: string
  executedBy?: string
  executedAt?: string
  totalItems: number
  items?: AdjustmentItem[]
}

export function toAdjustmentItemContract(
  dto: InventoryAdjustmentItemApiDTO
): AdjustmentItem {
  return {
    id: dto.id,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    adjustmentId: dto.adjustmentId,
    materialId: dto.materialId,
    materialCode: dto.materialCode,
    materialName: dto.materialName,
    categoryCode: dto.categoryCode,
    batchNo: dto.batchNo,
    theoryQty: dto.theoryQty,
    actualQty: dto.actualQty,
    diffQty: dto.diffQty,
    uom: dto.uom,
  }
}

export function toAdjustmentItemContracts(
  dtos: InventoryAdjustmentItemApiDTO[]
): AdjustmentItem[] {
  return dtos.map(toAdjustmentItemContract)
}

export function toInventoryAdjustmentContract(
  dto: InventoryAdjustmentApiDTO
): InventoryAdjustment {
  return {
    id: dto.id,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    taskId: dto.taskId,
    adjustmentNo: dto.adjustmentNo,
    type: dto.type,
    status: dto.status,
    reason: dto.reason,
    createdBy: dto.createdBy,
    approvedBy: dto.approvedBy,
    approvedAt: dto.approvedAt || undefined,
    executedBy: dto.executedBy,
    executedAt: dto.executedAt || undefined,
    totalItems: dto.totalItems,
    items: dto.items ? toAdjustmentItemContracts(dto.items) : undefined,
  }
}

export function toInventoryAdjustmentContracts(
  dtos: InventoryAdjustmentApiDTO[]
): InventoryAdjustment[] {
  return dtos.map(toInventoryAdjustmentContract)
}
