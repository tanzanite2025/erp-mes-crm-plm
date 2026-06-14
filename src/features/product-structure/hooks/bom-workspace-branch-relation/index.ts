/**
 * BOM Workspace Branch Relation Builders
 *
 * 提供两种构建模式：
 * - **Synthetic**: 合成模式，自动为每个 section 创建层级结构
 * - **Protocol**: 协议模式，基于父子关系协议构建
 *
 * ## 使用示例
 *
 * ### 合成模式
 * ```typescript
 * import { buildSyntheticBOMWorkspaceBranchRelations } from './bom-workspace-branch-relation'
 *
 * const result = buildSyntheticBOMWorkspaceBranchRelations({
 *   activeSections: sections,
 *   fields: fields,
 *   watchedItems: items,
 *   resolveNumericField: (i, f, v) => Number(v) || 0,
 *   rootNodeId: 'root',
 * })
 * ```
 *
 * ### 协议模式
 * ```typescript
 * import { buildParentChildrenProtocolBranchRelations } from './bom-workspace-branch-relation'
 *
 * const builder = buildParentChildrenProtocolBranchRelations(protocolDraft)
 * const result = builder({
 *   activeSections: sections,
 *   fields: fields,
 *   watchedItems: items,
 *   resolveNumericField: (i, f, v) => Number(v) || 0,
 *   rootNodeId: 'root',
 * })
 * ```
 *
 * ### 自动选择
 * ```typescript
 * import { resolveBOMWorkspaceBranchRelationBuilder } from './bom-workspace-branch-relation'
 *
 * const builder = resolveBOMWorkspaceBranchRelationBuilder({
 *   protocolDraft: myProtocol, // 如果提供，使用协议模式
 * })
 * ```
 *
 * @module bom-workspace-branch-relation
 */

// ============================================================================
// 类型导出
// ============================================================================

export type {
  BOMWorkspaceSourceBranchRole,
  BOMWorkspaceSourceBranchNode,
  BOMWorkspaceSourceLeafNode,
  BOMWorkspaceBranchRelationBuildParams,
  BOMWorkspaceBranchRelationBuildResult,
  BOMWorkspaceBranchRelationBuilder,
  BOMWorkspaceParentChildrenProtocolBranchDraft,
  BOMWorkspaceParentChildrenProtocolDraft,
  BOMWorkspaceParentChildrenProtocolItemDraft,
} from './types'

// ============================================================================
// 构建器导出
// ============================================================================

export { buildSyntheticBOMWorkspaceBranchRelations } from './synthetic-builder'

export { buildParentChildrenProtocolBranchRelations } from './protocol-adapter'
export type { BuildBOMWorkspaceParentChildrenProtocolBranchRelationsParams } from './protocol-adapter'

// ============================================================================
// 解析器导出
// ============================================================================

export { resolveBOMWorkspaceBranchRelationBuilder } from './builder-resolver'
export type { ResolveBOMWorkspaceBranchRelationBuilderParams } from './builder-resolver'

// ============================================================================
// Node ID resolvers (re-export for convenience)
// ============================================================================

export {
  resolveSectionBranchNodeId as resolveBOMWorkspaceSourceBranchNodeId,
  resolveCollectionBranchNodeId as resolveBOMWorkspaceSourceCollectionBranchNodeId,
  resolveLeafNodeId as resolveBOMWorkspaceSourceLeafNodeId,
} from '../../utils/bom-node-id-resolver'
