import type { PersonalLocalMediaDraft } from '../data/schema'

const databaseName = 'xdfc-personal-workbench'
const objectStoreName = 'local-media-drafts'
const databaseVersion = 1

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, databaseVersion)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(objectStoreName)) {
        database.createObjectStore(objectStoreName, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('无法打开本地媒体草稿数据库'))
  })
}

function sortDraftsByCreatedAtDesc(items: PersonalLocalMediaDraft[]) {
  return [...items].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  )
}

export const localMediaDraftStore = {
  async getAll(): Promise<PersonalLocalMediaDraft[]> {
    const database = await openDatabase()

    return await new Promise<PersonalLocalMediaDraft[]>((resolve, reject) => {
      const transaction = database.transaction(objectStoreName, 'readonly')
      const store = transaction.objectStore(objectStoreName)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve((request.result as PersonalLocalMediaDraft[] | undefined) ?? [])
      }

      request.onerror = () => {
        reject(request.error ?? new Error('读取本地媒体草稿失败'))
      }

      transaction.oncomplete = () => {
        database.close()
      }

      transaction.onerror = () => {
        database.close()
        reject(transaction.error ?? new Error('读取本地媒体草稿事务失败'))
      }
    })
  },

  async getAllByOwner(
    ownerUserId: string,
    ownerAccountNo: string
  ): Promise<PersonalLocalMediaDraft[]> {
    const items = await this.getAll()
    return sortDraftsByCreatedAtDesc(
      items.filter(
        (item) =>
          item.ownerUserId === ownerUserId ||
          item.ownerAccountNo === ownerAccountNo
      )
    )
  },

  async save(draft: PersonalLocalMediaDraft): Promise<void> {
    const database = await openDatabase()

    return await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(objectStoreName, 'readwrite')
      const store = transaction.objectStore(objectStoreName)
      store.put(draft)

      transaction.oncomplete = () => {
        database.close()
        resolve()
      }

      transaction.onerror = () => {
        database.close()
        reject(transaction.error ?? new Error('保存本地媒体草稿失败'))
      }
    })
  },

  async remove(id: string): Promise<void> {
    const database = await openDatabase()

    return await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(objectStoreName, 'readwrite')
      const store = transaction.objectStore(objectStoreName)
      store.delete(id)

      transaction.oncomplete = () => {
        database.close()
        resolve()
      }

      transaction.onerror = () => {
        database.close()
        reject(transaction.error ?? new Error('删除本地媒体草稿失败'))
      }
    })
  },
}
