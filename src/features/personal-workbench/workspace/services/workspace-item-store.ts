import type { PersonalWorkspaceItem } from '../data/schema'

const databaseName = 'xdfc-personal-workspace'
const objectStoreName = 'workspace-items'
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
      reject(request.error ?? new Error('无法打开个人工作收纳箱数据库'))
  })
}

function sortItems(items: PersonalWorkspaceItem[]) {
  return [...items].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  )
}

export const workspaceItemStore = {
  async getAll(): Promise<PersonalWorkspaceItem[]> {
    const database = await openDatabase()

    return await new Promise<PersonalWorkspaceItem[]>((resolve, reject) => {
      const transaction = database.transaction(objectStoreName, 'readonly')
      const store = transaction.objectStore(objectStoreName)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve((request.result as PersonalWorkspaceItem[] | undefined) ?? [])
      }

      request.onerror = () => {
        reject(request.error ?? new Error('读取个人工作收纳箱条目失败'))
      }

      transaction.oncomplete = () => {
        database.close()
      }

      transaction.onerror = () => {
        database.close()
        reject(transaction.error ?? new Error('读取个人工作收纳箱事务失败'))
      }
    })
  },

  async getAllByOwner(
    ownerUserId: string,
    ownerAccountNo: string
  ): Promise<PersonalWorkspaceItem[]> {
    const items = await this.getAll()
    return sortItems(
      items.filter(
        (item) =>
          item.ownerUserId === ownerUserId ||
          item.ownerAccountNo === ownerAccountNo
      )
    )
  },

  async save(item: PersonalWorkspaceItem): Promise<void> {
    const database = await openDatabase()

    return await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(objectStoreName, 'readwrite')
      const store = transaction.objectStore(objectStoreName)
      store.put(item)

      transaction.oncomplete = () => {
        database.close()
        resolve()
      }

      transaction.onerror = () => {
        database.close()
        reject(transaction.error ?? new Error('保存个人工作收纳箱条目失败'))
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
        reject(transaction.error ?? new Error('删除个人工作收纳箱条目失败'))
      }
    })
  },
}
