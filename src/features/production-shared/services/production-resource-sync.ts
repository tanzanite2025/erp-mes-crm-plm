import { productionResourceInvalidation } from './production-resource-invalidation'

export type ProductionResourceKind = 'lines' | 'processes' | 'mappings'

export interface ProductionResourceSyncEvent {
  kind: ProductionResourceKind
}

export const PRODUCTION_LINES_UPDATED_EVENT = 'xdfc_production_lines_v2_updated'
export const PRODUCTION_PROCESSES_UPDATED_EVENT = 'xdfc_production_processes_updated'
export const PRODUCTION_MAPPINGS_UPDATED_EVENT = 'xdfc_production_mappings_updated'

const productionResourceListeners = new Set<(event: ProductionResourceSyncEvent) => void>()

function getLegacyEventName(kind: ProductionResourceKind): string {
  switch (kind) {
    case 'lines':
      return PRODUCTION_LINES_UPDATED_EVENT
    case 'processes':
      return PRODUCTION_PROCESSES_UPDATED_EVENT
    case 'mappings':
      return PRODUCTION_MAPPINGS_UPDATED_EVENT
    default:
      return PRODUCTION_LINES_UPDATED_EVENT
  }
}

function emitLegacyWindowEvent(kind: ProductionResourceKind): void {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(getLegacyEventName(kind), { detail: { kind } }))
}

async function invalidateProductionResource(kind: ProductionResourceKind): Promise<void> {
  switch (kind) {
    case 'lines':
      await productionResourceInvalidation.invalidateLines()
      return
    case 'processes':
      await productionResourceInvalidation.invalidateProcesses()
      return
    case 'mappings':
      await productionResourceInvalidation.invalidateMappings()
      return
    default:
      await productionResourceInvalidation.invalidateAll()
  }
}

export const productionResourceSync = {
  emit: (event: ProductionResourceSyncEvent): void => {
    productionResourceListeners.forEach((listener) => listener(event))
    emitLegacyWindowEvent(event.kind)
    void invalidateProductionResource(event.kind)
  },

  subscribe: (listener: (event: ProductionResourceSyncEvent) => void): (() => void) => {
    productionResourceListeners.add(listener)

    return () => {
      productionResourceListeners.delete(listener)
    }
  },

  emitLinesUpdated: (): void => {
    productionResourceSync.emit({ kind: 'lines' })
  },

  emitProcessesUpdated: (): void => {
    productionResourceSync.emit({ kind: 'processes' })
  },

  emitMappingsUpdated: (): void => {
    productionResourceSync.emit({ kind: 'mappings' })
  },
}
