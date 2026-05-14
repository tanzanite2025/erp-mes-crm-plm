/**
 * BOM 版本展示选择器（derived selector）。
 *
 * 历史背景：早期 BOM schema 上挂了一个 `bomDisplayVersion` 字段当作"友好版本号"，
 * 但它本质上是从 `bomVersion` 派生出来的（仅做大小写/空白规范化与默认值兜底），
 * 不应作为持久化字段存在。本文件把派生逻辑封装为唯一入口。
 *
 * 后端：`bom.go` 上原本带 `DisplayVersion` 字段（标 `gorm:"-"` 不入库）已删除，
 * 出参由 `MapBOMToDetailResponse` 阶段不再附加，前端在使用处通过本选择器派生。
 */

import { deriveBomDisplayVersion } from '@/lib/codecs/code-normalization'
import { type BOM } from '../data/schema'

/**
 * 由 BOM 实体派生展示版本号。
 *
 * 规则：
 *   1. 若 `bomVersion` 非空 → 规范化后返回（trim+upper，缺省 `V1.0`）
 *   2. 若 `bomVersion` 为空 → 同样走 `deriveBomDisplayVersion(undefined)` 得到 `V1.0`
 *
 * 调用方约定：UI、打印、消息、Diff 标签都应通过本函数获取展示版本号，
 * 不要直接读 `bom.bomDisplayVersion`（该字段在 schema 中已被移除）。
 */
export function selectBOMDisplayVersion(bom: Pick<BOM, 'bomVersion'> | null | undefined): string {
  return deriveBomDisplayVersion(bom?.bomVersion)
}
