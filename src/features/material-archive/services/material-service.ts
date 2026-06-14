import { createLogger } from '@/lib/logger'
import { type Material } from '../data/schema'

const logger = createLogger('MaterialService')

/**
 * @deprecated
 * [ARCHITECTURE HARDENING]
 * 本文件已废弃。物料档案逻辑已物理拆分为领域服务：
 * - 查询处理: MaterialCoreService
 * - 维护与 SDRTS: MaterialMaintenanceService
 *
 * 原始逻辑已物理备份至 ./material-service.ts.txt
 */

const DEPRECATED_ERROR =
  '[CRITICAL] 调用了已废弃的 materialService。请迁移至 MaterialCoreService 或 MaterialMaintenanceService。'

export const materialService = new Proxy({} as any, {
  get() {
    logger.error(DEPRECATED_ERROR)
    throw new Error(DEPRECATED_ERROR)
  },
})

// 仅保留导出函数名以防 IDE 索引未及时更新导致的类型报错，但运行时均会触发 Proxy 错误
export const getMaterialOptions = materialService.getMaterialOptions
export const getMaterials = materialService.getMaterials
export const getMaterialsWithVersion = materialService.getMaterialsWithVersion
export const saveMaterial = materialService.saveMaterial
export const saveMaterials = materialService.saveMaterials
export const deleteMaterial = materialService.deleteMaterial
export const patchMaterial = materialService.patchMaterial

export type { Material }
