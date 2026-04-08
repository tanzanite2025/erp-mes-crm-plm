/**
 * [DEPRECATED] DictionaryService (Legacy)
 * 
 * 🛑 警告: 此服务已废弃，并已物理拆分为域驱动的 Core 逻辑与 Maintenance 逻辑。
 * - 读取/缓存请使用: DictionaryCoreService
 * - 维护/写入请使用: DictionaryMaintenanceService
 * 
 * 此文件仅作为运行时安全桩 (Proxy Stub) 保留，任何尝试调用它的行为都会触发 [CRITICAL] 异常。
 */

import { DictionaryCoreService } from './dictionary-core-service'

const forbiddenAccess = (prop: string | symbol) => {
  const errorMsg = `[CRITICAL] 尝试调用已废弃的 dictionaryService.${String(prop)}。请立即迁移至 DictionaryCoreService 或 DictionaryMaintenanceService。`
  console.error(errorMsg)
  throw new Error(errorMsg)
}

export const dictionaryService = new Proxy({} as any, {
  get(_, prop) {
    // 允许某些元数据或类型检查通过，但阻止业务逻辑执行
    if (prop === '__isProxy') return true
    if (prop === 'prototype') return {}
    
    return forbiddenAccess(prop)
  },
  apply() {
    return forbiddenAccess('invoke')
  },
  construct() {
    return forbiddenAccess('new')
  }
})

// 导出类型以防止旧的代码解析崩溃（仅限编译期，运行期依然会报错）
export type DictionaryService = typeof DictionaryCoreService
