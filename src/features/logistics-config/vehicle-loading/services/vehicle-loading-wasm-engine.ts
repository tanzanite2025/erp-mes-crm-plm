import {
  VEHICLE_LOADING_GEOMETRY_PROJECTION_SCHEMA_VERSION,
  type VehicleGeometry,
  type VehicleLoadingGeometryProjection,
} from '../data/vehicle-loading-wasm-geometry.types'
import {
  LOADING_SPACE_PLAN_SCHEMA_VERSION,
  LOADING_PLAN_DIAGNOSTICS_SCHEMA_VERSION,
  VEHICLE_LOADING_PLAN_SCHEMA_VERSION,
  type LoadingPlanDiagnostics,
  type LoadingSpacePlan,
  type LoadingSpacePlanRequest,
  type VehicleLoadingPlan,
  type VehicleLoadingPlanRequest,
  type VehicleLoadingPlanDiagnostics,
} from '../data/vehicle-loading-wasm-plan.types'
import initVehicleLoadingWasm, {
  calculate_loading_plan,
  calculate_vehicle_loading_plan,
  diagnose_loading_plan_json,
  diagnose_vehicle_loading_plan_json,
  project_vehicle_geometry_to_loading_space_json,
} from '../wasm/pkg/vehicle_loading_engine_wasm.js'

let vehicleLoadingWasmInitializationPromise: Promise<void> | null = null

export class VehicleLoadingWasmCalculationError extends Error {
  constructor(reason: string) {
    super(`WASM 装箱计算失败：${reason}`)
    this.name = 'VehicleLoadingWasmCalculationError'
  }
}

export class LoadingSpaceWasmCalculationError extends Error {
  constructor(reason: string) {
    super(`WASM 装载空间计算失败：${reason}`)
    this.name = 'LoadingSpaceWasmCalculationError'
  }
}

export class VehicleLoadingWasmGeometryProjectionError extends Error {
  constructor(reason: string) {
    super(`WASM 车型几何投影失败：${reason}`)
    this.name = 'VehicleLoadingWasmGeometryProjectionError'
  }
}

function ensureVehicleLoadingWasmInitialized() {
  vehicleLoadingWasmInitializationPromise ??= initVehicleLoadingWasm().then(
    () => undefined
  )
  return vehicleLoadingWasmInitializationPromise
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseVehicleLoadingWasmPlanOutput(output: string): VehicleLoadingPlan {
  const value: unknown = JSON.parse(output)
  if (!isObjectRecord(value)) {
    throw new Error('WASM 装箱结果必须是对象。')
  }
  if (value.schemaVersion !== VEHICLE_LOADING_PLAN_SCHEMA_VERSION) {
    throw new Error(
      `WASM 装箱结果协议错误：${String(value.schemaVersion ?? '缺失')}`
    )
  }
  return value as VehicleLoadingPlan
}

function parseLoadingSpaceWasmPlanOutput(output: string): LoadingSpacePlan {
  const value: unknown = JSON.parse(output)
  if (!isObjectRecord(value)) {
    throw new Error('WASM 装载空间结果必须是对象。')
  }
  if (value.schemaVersion !== LOADING_SPACE_PLAN_SCHEMA_VERSION) {
    throw new Error(
      `WASM 装载空间结果协议错误：${String(value.schemaVersion ?? '缺失')}`
    )
  }
  return value as LoadingSpacePlan
}

function parseLoadingPlanDiagnosticsOutput(
  output: string
): LoadingPlanDiagnostics {
  const value: unknown = JSON.parse(output)
  if (!isObjectRecord(value)) {
    throw new Error('WASM 装箱诊断结果必须是对象。')
  }
  if (value.schemaVersion !== LOADING_PLAN_DIAGNOSTICS_SCHEMA_VERSION) {
    throw new Error(
      `WASM 装箱诊断协议错误：${String(value.schemaVersion ?? '缺失')}`
    )
  }
  return value as LoadingPlanDiagnostics
}

function parseVehicleLoadingGeometryProjectionOutput(
  output: string
): VehicleLoadingGeometryProjection {
  const value: unknown = JSON.parse(output)
  if (!isObjectRecord(value)) {
    throw new Error('WASM 车型几何投影结果必须是对象。')
  }
  if (
    value.schemaVersion !== VEHICLE_LOADING_GEOMETRY_PROJECTION_SCHEMA_VERSION
  ) {
    throw new Error(
      `WASM 车型几何投影协议错误：${String(value.schemaVersion ?? '缺失')}`
    )
  }
  return value as VehicleLoadingGeometryProjection
}

function getVehicleLoadingWasmFailureReason(error: unknown) {
  if (
    error instanceof VehicleLoadingWasmCalculationError ||
    error instanceof LoadingSpaceWasmCalculationError ||
    error instanceof VehicleLoadingWasmGeometryProjectionError
  ) {
    return error.message.replace(
      /^WASM (装箱计算|装载空间计算|车型几何投影)失败：/,
      ''
    )
  }
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message
  }
  return String(error || '未知错误')
}

export async function calculateVehicleLoadingPlanWithWasm(
  request: VehicleLoadingPlanRequest
): Promise<VehicleLoadingPlan> {
  try {
    await ensureVehicleLoadingWasmInitialized()

    const output = calculate_vehicle_loading_plan(JSON.stringify(request))
    return parseVehicleLoadingWasmPlanOutput(output)
  } catch (error) {
    throw new VehicleLoadingWasmCalculationError(
      getVehicleLoadingWasmFailureReason(error)
    )
  }
}

export async function calculateLoadingSpacePlanWithWasm(
  request: LoadingSpacePlanRequest
): Promise<LoadingSpacePlan> {
  try {
    await ensureVehicleLoadingWasmInitialized()

    const output = calculate_loading_plan(JSON.stringify(request))
    return parseLoadingSpaceWasmPlanOutput(output)
  } catch (error) {
    throw new LoadingSpaceWasmCalculationError(
      getVehicleLoadingWasmFailureReason(error)
    )
  }
}

export async function diagnoseVehicleLoadingPlanWithWasm(
  request: VehicleLoadingPlanRequest
): Promise<VehicleLoadingPlanDiagnostics> {
  try {
    await ensureVehicleLoadingWasmInitialized()

    const output = diagnose_vehicle_loading_plan_json(JSON.stringify(request))
    return parseLoadingPlanDiagnosticsOutput(output)
  } catch (error) {
    throw new VehicleLoadingWasmCalculationError(
      getVehicleLoadingWasmFailureReason(error)
    )
  }
}

export async function diagnoseLoadingSpacePlanWithWasm(
  request: LoadingSpacePlanRequest
): Promise<LoadingPlanDiagnostics> {
  try {
    await ensureVehicleLoadingWasmInitialized()

    const output = diagnose_loading_plan_json(JSON.stringify(request))
    return parseLoadingPlanDiagnosticsOutput(output)
  } catch (error) {
    throw new LoadingSpaceWasmCalculationError(
      getVehicleLoadingWasmFailureReason(error)
    )
  }
}

export async function projectVehicleGeometryToLoadingSpaceWithWasm(
  geometry: VehicleGeometry
): Promise<VehicleLoadingGeometryProjection> {
  try {
    await ensureVehicleLoadingWasmInitialized()

    const output = project_vehicle_geometry_to_loading_space_json(
      JSON.stringify(geometry)
    )
    return parseVehicleLoadingGeometryProjectionOutput(output)
  } catch (error) {
    throw new VehicleLoadingWasmGeometryProjectionError(
      getVehicleLoadingWasmFailureReason(error)
    )
  }
}
