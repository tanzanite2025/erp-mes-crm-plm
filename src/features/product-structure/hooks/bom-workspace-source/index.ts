/**
 * BOM Workspace Source Model
 * 
 * 此模块提供 BOM workspace 的源数据模型定义和构建功能。
 * 
 * ## 主要功能
 * - 定义节点类型（root, branch, leaf）
 * - 构建完整的 workspace 源数据模型
 * - 提供节点关系映射
 * 
 * ## 使用示例
 * ```typescript
 * import { buildBOMWorkspaceSourceModel } from './bom-workspace-source'
 * 
 * const model = buildBOMWorkspaceSourceModel({
 *   activeSections: sections,
 *   fields: fields,
 *   watchedItems: items,
 *   resolveNumericField: (i, f, v) => Number(v) || 0,
 * })
 * ```
 * 
 * @module bom-workspace-source
 */

// ============================================================================
// 类型导出
// ============================================================================

export type {
  BOMWorkspaceSourceNodeKind,
  BOMWorkspaceSourceBaseNode,
  BOMWorkspaceSourceRootNode,
  BOMWorkspaceSourceNode,
  BOMWorkspaceSourceModel,
  BOMWorkspaceSourceBranchNode,
  BOMWorkspaceSourceLeafNode,
} from './types'

// ============================================================================
// 函数导出
// ============================================================================

export {
  buildBOMWorkspaceSourceModel,
  resolveBOMWorkspaceSourceRootNodeId,
} from './model-builder'

export type { BuildBOMWorkspaceSourceModelParams } from './model-builder'
