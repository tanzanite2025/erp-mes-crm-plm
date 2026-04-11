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

export const productionResourceSync = {
  emit: (event: ProductionResourceSyncEvent): void => {
    productionResourceListeners.forEach((listener) => listener(event))
    emitLegacyWindowEvent(event.kind)
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
