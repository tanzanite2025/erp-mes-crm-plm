import type {
  LogisticsEvent,
  LogisticsListPage,
  LogisticsRecord,
  SaveLogisticsRecordInput,
  UpdateLogisticsStatusInput,
} from '../data/schema'
import type {
  LogisticsEventApiDTO,
  LogisticsListPageApiDTO,
  LogisticsRecordApiDTO,
  SaveLogisticsRecordApiDTO,
  UpdateLogisticsStatusApiDTO,
} from '../contracts/logistics-api-dto'

function normalizeEvents(raw: LogisticsRecordApiDTO['events']): LogisticsEvent[] {
  if (Array.isArray(raw)) {
    return raw.map(toLogisticsEventContract)
  }

  if (typeof raw === 'string' && raw.trim() !== '') {
    try {
      const parsed = JSON.parse(raw) as LogisticsEventApiDTO[]
      return Array.isArray(parsed) ? parsed.map(toLogisticsEventContract) : []
    } catch {
      return []
    }
  }

  return []
}

export function toLogisticsEventContract(dto: LogisticsEventApiDTO): LogisticsEvent {
  return {
    id: dto.id ?? `${dto.time}-${dto.status}-${dto.location ?? ''}`,
    time: dto.time,
    location: dto.location ?? '',
    description: dto.description ?? '',
    status: dto.status,
  }
}

export function toLogisticsRecordContract(dto: LogisticsRecordApiDTO): LogisticsRecord {
  return {
    id: dto.id,
    orderNo: dto.orderNo,
    salesOrderId: dto.salesOrderId,
    purchaseOrderId: dto.purchaseOrderId,
    productId: dto.productId,
    shipmentId: dto.shipmentId,
    type: dto.type,
    carrier: dto.carrier,
    trackingNo: dto.trackingNo,
    status: dto.status,
    lastLocation: dto.lastLocation ?? '',
    contactPerson: dto.contactPerson ?? '',
    contactPhone: dto.contactPhone ?? '',
    events: normalizeEvents(dto.events),
    version: dto.version ?? 1,
    isDeleted: dto.isDeleted ?? false,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

export function toLogisticsListPageContract(dto: LogisticsListPageApiDTO): LogisticsListPage {
  return {
    items: dto.items.map(toLogisticsRecordContract),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
  }
}

export function toSaveLogisticsRecordApiDTO(input: SaveLogisticsRecordInput): SaveLogisticsRecordApiDTO {
  return {
    id: input.id,
    orderNo: input.orderNo,
    salesOrderId: input.salesOrderId,
    purchaseOrderId: input.purchaseOrderId,
    productId: input.productId,
    shipmentId: input.shipmentId,
    type: input.type,
    carrier: input.carrier,
    trackingNo: input.trackingNo,
    status: input.status,
    lastLocation: input.lastLocation,
    contactPerson: input.contactPerson,
    contactPhone: input.contactPhone,
    events: input.events.map(toLogisticsEventApiDTO),
    version: input.version,
    isDeleted: input.isDeleted,
  }
}

export function toLogisticsEventApiDTO(input: LogisticsEvent): LogisticsEventApiDTO {
  return {
    id: input.id,
    time: input.time,
    location: input.location,
    description: input.description,
    status: input.status,
  }
}

export function toUpdateLogisticsStatusApiDTO(
  input: UpdateLogisticsStatusInput,
  currentVersion: number,
  events: LogisticsEvent[]
): UpdateLogisticsStatusApiDTO {
  const nextEvent: LogisticsEvent = {
    id: `${new Date().toISOString()}-${input.status}`,
    time: new Date().toISOString(),
    location: input.location,
    description: input.description,
    status: input.status,
  }

  return {
    status: input.status,
    location: input.location,
    description: input.description,
    events: [nextEvent, ...events].map(toLogisticsEventApiDTO),
    version: currentVersion,
  }
}
