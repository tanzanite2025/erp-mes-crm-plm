import { productionResourceInvalidation } from './production-resource-invalidation'

export type ProductionResourceKind = 'lines' | 'processes'

export interface ProductionResourceSyncEvent {
  kind: ProductionResourceKind
}

export interface ProductionResourceSyncEmitOptions {
  invalidate?: boolean
}

export const PRODUCTION_LINES_UPDATED_EVENT = 'xdfc_production_lines_v2_updated'
export const PRODUCTION_PROCESSES_UPDATED_EVENT =
  'xdfc_production_processes_updated'
const productionResourceListeners = new Set<
  (event: ProductionResourceSyncEvent) => void
>()

function getLegacyEventName(kind: ProductionResourceKind): string {
  switch (kind) {
    case 'lines':
      return PRODUCTION_LINES_UPDATED_EVENT
    case 'processes':
      return PRODUCTION_PROCESSES_UPDATED_EVENT
    default:
      return PRODUCTION_LINES_UPDATED_EVENT
  }
}

function emitLegacyWindowEvent(kind: ProductionResourceKind): void {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent(getLegacyEventName(kind), { detail: { kind } })
  )
}

async function invalidateProductionResource(
  kind: ProductionResourceKind
): Promise<void> {
  switch (kind) {
    case 'lines':
      await productionResourceInvalidation.invalidateLines()
      return
    case 'processes':
      await productionResourceInvalidation.invalidateProcesses()
      return
    default:
      await productionResourceInvalidation.invalidateAll()
  }
}

export const productionResourceSync = {
  emit: (
    event: ProductionResourceSyncEvent,
    options?: ProductionResourceSyncEmitOptions
  ): void => {
    productionResourceListeners.forEach((listener) => listener(event))
    emitLegacyWindowEvent(event.kind)
    if (options?.invalidate !== false) {
      void invalidateProductionResource(event.kind)
    }
  },

  subscribe: (
    listener: (event: ProductionResourceSyncEvent) => void
  ): (() => void) => {
    productionResourceListeners.add(listener)

    return () => {
      productionResourceListeners.delete(listener)
    }
  },

  emitLinesUpdated: (options?: ProductionResourceSyncEmitOptions): void => {
    productionResourceSync.emit({ kind: 'lines' }, options)
  },

  emitProcessesUpdated: (options?: ProductionResourceSyncEmitOptions): void => {
    productionResourceSync.emit({ kind: 'processes' }, options)
  },
}
