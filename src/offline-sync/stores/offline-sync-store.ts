import { create } from 'zustand'

export type OfflineSyncSeverity = 'healthy' | 'alert' | 'critical'

export interface OfflineSyncSummary {
  pendingCount: number
  conflictCount: number
  unhandledPendingCount: number
  activeAdapterCount: number
  unhandledIntents: string[]
}

interface OfflineSyncStoreState {
  isEngineStarted: boolean
  isOnline: boolean
  isSyncing: boolean
  severity: OfflineSyncSeverity
  headline: string
  detail: string
  summary: OfflineSyncSummary
  lastFlushAt?: string
  lastErrorMessage?: string
  updatedAt?: string
  setBannerState: (
    patch: Partial<Omit<OfflineSyncStoreState, 'setBannerState'>>
  ) => void
}

const initialSummary: OfflineSyncSummary = {
  pendingCount: 0,
  conflictCount: 0,
  unhandledPendingCount: 0,
  activeAdapterCount: 0,
  unhandledIntents: [],
}

export const useOfflineSyncStore = create<OfflineSyncStoreState>()((set) => ({
  isEngineStarted: false,
  isOnline: true,
  isSyncing: false,
  severity: 'healthy',
  headline: '',
  detail: '',
  summary: initialSummary,
  lastFlushAt: undefined,
  lastErrorMessage: undefined,
  updatedAt: undefined,
  setBannerState: (patch) =>
    set((state) => ({
      ...state,
      ...patch,
      summary: patch.summary ?? state.summary,
    })),
}))
