import type { AnyScanPluginDefinition } from '../core/plugin-contract'
import { logisticsInboundScanPlugin } from '../plugins/logistics-inbound'
import { wheelTraceScanPlugin } from '../plugins/wheel-trace'

export const scanPluginRegistry: AnyScanPluginDefinition[] = [
  logisticsInboundScanPlugin,
  wheelTraceScanPlugin,
]

export function getScanPluginByCode(code: string) {
  return scanPluginRegistry.find((plugin) => plugin.code === code)
}
