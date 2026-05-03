import type {
  ControlledTrackingDetail,
  ControlledTrackingOrder,
  LogisticsEvent,
  LogisticsListPage,
  LogisticsRecord,
  LogisticsStatus,
  LogisticsTrackingRefreshResult,
  SaveLogisticsRecordInput,
  UpdateLogisticsStatusInput,
} from '../data/schema'
import type {
  ControlledTrackingDetailApiDTO,
  ControlledTrackingOrderApiDTO,
  ControlledTrackingTraceApiDTO,
  LogisticsEventApiDTO,
  LogisticsTrackingRefreshResultApiDTO,
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

function toControlledTrackingTimelineStatus(status: string | undefined): LogisticsStatus {
  switch ((status ?? '').trim().toLowerCase()) {
    case 'pending':
    case 'collected':
      return 'Pending'
    case 'intransit':
    case 'delivering':
      return 'InTransit'
    case 'signed':
      return 'Delivered'
    case 'exception':
      return 'Exception'
    case 'returned':
    case 'canceled':
      return 'Canceled'
    default:
      return 'InTransit'
  }
}

function inferControlledTrackingEventStatus(context: string | undefined, fallbackStatus: LogisticsStatus): LogisticsStatus {
  const normalized = (context ?? '').trim().toLowerCase()
  if (normalized === '') {
    return fallbackStatus
  }
  if (
    normalized.includes('signed') ||
    normalized.includes('delivered') ||
    normalized.includes('签收') ||
    normalized.includes('妥投')
  ) {
    return 'Delivered'
  }
  if (
    normalized.includes('exception') ||
    normalized.includes('failed') ||
    normalized.includes('delay') ||
    normalized.includes('异常')
  ) {
    return 'Exception'
  }
  if (
    normalized.includes('returned') ||
    normalized.includes('return') ||
    normalized.includes('退回') ||
    normalized.includes('退件')
  ) {
    return 'Canceled'
  }
  if (
    normalized.includes('pending') ||
    normalized.includes('collected') ||
    normalized.includes('揽收') ||
    normalized.includes('待揽收')
  ) {
    return 'Pending'
  }
  return fallbackStatus
}

function toControlledTrackingOrderContract(dto: ControlledTrackingOrderApiDTO): ControlledTrackingOrder {
  return {
    id: dto.id,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    bizOrderNo: dto.bizOrderNo,
    bizType: dto.bizType,
    carrierCode: dto.carrierCode,
    carrierName: dto.carrierName,
    trackingNo: dto.trackingNo,
    status: dto.status,
    subscribedAt: dto.subscribedAt ?? undefined,
    lastPushAt: dto.lastPushAt ?? undefined,
    lastLocation: dto.lastLocation ?? '',
    lastEvent: dto.lastEvent ?? '',
    signedAt: dto.signedAt ?? undefined,
    version: dto.version ?? 1,
  }
}

function toLogisticsTrackingRefreshResultContract(
  dto: LogisticsTrackingRefreshResultApiDTO
): LogisticsTrackingRefreshResult {
  return {
    status: dto.status ?? '',
    message: dto.message ?? '',
    action: dto.action ?? '',
    providerCode: dto.providerCode ?? '',
    insertedTraces: dto.insertedTraces ?? 0,
    checkedAt: dto.checkedAt ?? '',
  }
}

export function toControlledTrackingEventContract(
  dto: ControlledTrackingTraceApiDTO,
  fallbackStatus: LogisticsStatus
): LogisticsEvent {
  return {
    id: dto.hashKey ?? `${dto.time}-${dto.context ?? ''}-${dto.location ?? ''}`,
    time: dto.time,
    location: dto.location ?? '',
    description: dto.context ?? '',
    status: inferControlledTrackingEventStatus(dto.context, fallbackStatus),
  }
}

export function toControlledTrackingDetailContract(dto: ControlledTrackingDetailApiDTO): ControlledTrackingDetail {
  const order = toControlledTrackingOrderContract(dto.order)
  const fallbackStatus = toControlledTrackingTimelineStatus(order.status)
  return {
    order,
    events: dto.traces.map((trace) => toControlledTrackingEventContract(trace, fallbackStatus)),
    refresh: dto.refresh ? toLogisticsTrackingRefreshResultContract(dto.refresh) : undefined,
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
