import {
  VEHICLE_LOADING_LAYOUT_SNAPSHOT_SCHEMA_VERSION,
  type VehicleLoadingLayoutSnapshot,
} from '../data/vehicle-loading-layout-snapshot.types'

export class VehicleLoadingLayoutSnapshotJsonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VehicleLoadingLayoutSnapshotJsonError'
  }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function serializeVehicleLoadingLayoutSnapshot(
  snapshot: VehicleLoadingLayoutSnapshot
) {
  return JSON.stringify(snapshot, null, 2)
}

export function parseVehicleLoadingLayoutSnapshotJson(
  input: string
): VehicleLoadingLayoutSnapshot {
  let value: unknown
  try {
    value = JSON.parse(input)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new VehicleLoadingLayoutSnapshotJsonError(
      `装载快照 JSON 无效：${message}`
    )
  }

  if (!isObjectRecord(value)) {
    throw new VehicleLoadingLayoutSnapshotJsonError('装载快照必须是对象。')
  }
  if (value.schemaVersion !== VEHICLE_LOADING_LAYOUT_SNAPSHOT_SCHEMA_VERSION) {
    throw new VehicleLoadingLayoutSnapshotJsonError(
      `装载快照协议错误：${String(value.schemaVersion ?? '缺失')}`
    )
  }

  return value as VehicleLoadingLayoutSnapshot
}
