/**
 * Product API adapter barrel — re-exports from split modules.
 *
 * 拆分为三个职责文件：
 * - product-read-adapter.ts — API → Domain 读取映射
 * - product-write-adapter.ts — Domain → API 写入映射
 * - product-delta-builder.ts — PATCH delta 构建
 */
export {
  toProductContract,
  toProductArrayContract,
  toProductOptionsArrayContract,
  toProductListContract,
} from './product-read-adapter'

export {
  toProductApiDTO,
  toProductWriteApiDTO,
  buildProductWriteCandidate,
} from './product-write-adapter'

export { buildProductDelta } from './product-delta-builder'
