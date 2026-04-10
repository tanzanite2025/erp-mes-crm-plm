'use client'

import { createLogger } from '@/lib/logger'

const logger = createLogger('PersistenceService')

export const PersistenceService = {
  _isLocalInitialized: false,
  _isCloudSyncStarted: false,

  initLocalStore: async () => {
    if (typeof window === 'undefined') return
    if (PersistenceService._isLocalInitialized) return

    PersistenceService._isLocalInitialized = true
    logger.info('Phase 1 (Core Boot) complete')
  },

  initCloudSync: async () => {
    if (typeof window === 'undefined') return
    if (PersistenceService._isCloudSyncStarted) return

    PersistenceService._isCloudSyncStarted = true
    try {
      logger.info('Starting parallel cloud sync')

      logger.info('High-priority initialization detached and running in background')
    } catch (error) {
      logger.error('Cloud sync failure', error)
      PersistenceService._isCloudSyncStarted = false
    }
  },

  forceResetFromBackup: async () => {
    logger.warn('Manual reset restricted in Cloud-only mode')
  },

  saveLocal: (key: string, data: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      logger.error(`Save failed for ${key}`, error)
    }
  },

  getLocal: (key: string): unknown => {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      logger.error(`Load failed for ${key}`, error)
      return null
    }
  },

  deleteLocal: (key: string) => {
    localStorage.removeItem(key)
  },

  getFullDataSnapshot: async () => {
    return JSON.stringify({ mode: 'Cloud-Only', timestamp: new Date().toISOString() }, null, 2)
  },
}
