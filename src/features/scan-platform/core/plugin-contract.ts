import type {
  ScanPermissionContract,
  ScanPlatformMode,
  ScanResolveInput,
  ScanResolvedContext,
  ScanSubmitResult,
} from './types'

export interface ScanPluginDefinition<TPayload = unknown, TContext = unknown> {
  code: string
  name: string
  description: string
  entryPath: string
  mode: ScanPlatformMode
  permissions: ScanPermissionContract
  resolveScan: (
    input: ScanResolveInput<TContext>
  ) => Promise<ScanResolvedContext<TPayload>>
  submitAction?: (
    context: ScanResolvedContext<TPayload>
  ) => Promise<ScanSubmitResult>
}

export type AnyScanPluginDefinition = ScanPluginDefinition<any, any>
