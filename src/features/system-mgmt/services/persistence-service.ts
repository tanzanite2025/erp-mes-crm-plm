'use client'

import { DictionaryCoreService } from '@/features/basic-settings/services/dictionary-core-service'
import { createLogger } from '@/lib/logger'
import { useAuthStore } from '@/stores/auth-store'

const logger = createLogger('PersistenceService')

function normalizePermissionIds(permissionIds: unknown): string[] {
  if (!Array.isArray(permissionIds)) return []
  return permissionIds.map((permissionId) => String(permissionId).trim().toLowerCase()).filter(Boolean)
}

function hasAnyPermission(permissionIds: string[], required: string[]): boolean {
  return required.some((permissionId) => permissionIds.includes(permissionId))
}

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

      const currentUser = useAuthStore.getState().user
      const permissionIds = normalizePermissionIds(currentUser?.permissions)
      const canInitDictionary =
        permissionIds.includes('superadmin') ||
        hasAnyPermission(permissionIds, ['menu_settings', 'menu_engineering', 'menu_trading', 'menu_org'])

      if (canInitDictionary) {
        DictionaryCoreService.init().then(() => {
          logger.info('Dictionary background loaded')
        })
      } else {
        logger.info('Dictionary background skipped for current permission set')
      }

      logger.info('High-priority initialization detached and running in background')
    } catch (error) {
      logger.error('Cloud sync failure', error)
      PersistenceService._isCloudSyncStarted = false
    }
  },

  forceResetFromBackup: async () => {
    logger.warn('Manual reset restricted in Cloud-only mode')
  },

  saveLocal: (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      logger.error(`Save failed for ${key}`, error)
    }
  },

  getLocal: (key: string): any => {
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
