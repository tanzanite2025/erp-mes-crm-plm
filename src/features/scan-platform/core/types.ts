export type ScanPlatformMode = 'submit' | 'view'
export type ScanCaptureSource = 'camera' | 'manual' | 'hardware'
export type ScanHostSurface = 'standalone' | 'embedded-dialog' | 'embedded-inline'

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

export interface ScanSubmitResult {
  success: boolean
  message: string
}
