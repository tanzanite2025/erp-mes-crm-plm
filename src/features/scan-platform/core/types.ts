import { type DeltaSet } from '@/lib/delta/types'

export type ScanPlatformMode = 'submit' | 'view'
export type ScanCaptureSource = 'camera' | 'manual' | 'hardware'
export type ScanHostSurface =
  | 'standalone'
  | 'embedded-dialog'
  | 'embedded-inline'

export interface ScanPermissionContract {
  page: string
  action?: string
}

export interface ScanResolveInput<TContext = unknown> {
  rawCode: string
  source?: ScanCaptureSource
  surface?: ScanHostSurface
  context?: TContext
}

export interface ScanResolvedContext<TPayload = unknown> {
  rawCode: string
  mode: ScanPlatformMode
  payload: TPayload
}

export interface ScanDeltaResult {
  id: string
  delta: DeltaSet // SDRTS 差量对象
  version: number // 悲观并发版次
}

export interface ScanSubmitResult {
  success: boolean
  message: string
  deltaResult?: ScanDeltaResult // 可选的 SDRTS 成功结果
}
