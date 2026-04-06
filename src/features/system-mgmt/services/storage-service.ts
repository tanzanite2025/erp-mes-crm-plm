/**
 * IndexedDB key-value storage wrapper used by lightweight client state.
 * It is intentionally simple and does not implement version locking.
 */

const DB_NAME = 'xdfc_indexed_db'
const STORE_NAME = 'key_value_store'
const DB_VERSION = 1

/** Global storage update event name. */
export const XDFC_STORAGE_EVENT = 'xdfc_storage_updated'

export const StorageService = {
  /** Open (or initialize) the IndexedDB database. */
  _getDB: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }

      request.onsuccess = (event: any) => resolve(event.target.result)
      request.onerror = (event: any) => reject(event.target.error)
    })
  },

  /** 
   * Read one key. 
   * Use this for non-critical paths where null is an acceptable state.
   */
  getItem: async <T>(key: string): Promise<T | null> => {
    const db = await StorageService._getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(key)

      request.onsuccess = () => {
        const result = request.result
        if (!result) return resolve(null)

        // Backward compatibility for legacy wrapped value format.
        if (result && typeof result === 'object' && '_v' in result) {
          return resolve(result._v as T)
        }
        resolve(result as T)
      }
      request.onerror = () => reject(request.error)
    })
  },

  /**
   * Read a critical key.
   * Throws an error if the key is missing. Use this for Auth/Permissions/Config.
   */
  getCriticalItem: async <T>(key: string): Promise<T> => {
    const data = await StorageService.getItem<T>(key)
    if (data === null || data === undefined) {
      throw new Error(`[CRITICAL] Storage key "${key}" not found in IndexedDB. Ensure initial sync is complete.`)
    }
    return data
  },

  /** Write one key. */
  setItem: async (key: string, value: any): Promise<void> => {
    const db = await StorageService._getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(value, key)

      request.onsuccess = () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(XDFC_STORAGE_EVENT, { detail: { key, action: 'SET' } }))
          window.dispatchEvent(new CustomEvent(`${key}_updated`, { detail: { action: 'SET' } }))
        }
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  },

  /** Delete one key. */
  removeItem: async (key: string): Promise<void> => {
    const db = await StorageService._getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(key)

      request.onsuccess = () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(XDFC_STORAGE_EVENT, { detail: { key, action: 'REMOVE' } }))
        }
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  },

  /** List all keys. */
  getAllKeys: async (): Promise<string[]> => {
    const db = await StorageService._getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAllKeys()

      request.onsuccess = () => resolve(request.result as string[])
      request.onerror = () => reject(request.error)
    })
  },

  /** Snapshot all key-value pairs. */
  getAllData: async (): Promise<Record<string, any>> => {
    const keys = await StorageService.getAllKeys()
    const data: Record<string, any> = {}
    for (const key of keys) {
      data[key] = await StorageService.getItem(key)
    }
    return data
  },
}

// Expose in development for quick debugging in browser console.
if (typeof window !== 'undefined' && (import.meta.env.DEV || window.location.hostname === 'localhost')) {
  ;(window as any).StorageService = StorageService
}

