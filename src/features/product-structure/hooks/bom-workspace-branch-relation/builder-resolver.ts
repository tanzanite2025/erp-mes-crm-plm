/**
 * Branch Relation Builder Resolver
 * 
 * 根据参数选择合适的分支关系构建器
 */

import type {
  BOMWorkspaceBranchRelationBuilder,
  BOMWorkspaceParentChildrenProtocolDraft,
} from './types'
import { buildSyntheticBOMWorkspaceBranchRelations } from './synthetic-builder'
import { buildParentChildrenProtocolBranchRelations } from './protocol-adapter'

/**
 * 解析分支关系构建器的参数
 */
export interface ResolveBOMWorkspaceBranchRelationBuilderParams {
  /** 自定义构建器 */
  branchRelationBuilder?: BOMWorkspaceBranchRelationBuilder
  /** 父子关系协议草稿 */
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
}

/**
 * 解析并返回合适的分支关系构建器
 * 
 * 选择逻辑：
 * 1. 如果提供了自定义构建器，使用自定义构建器
 * 2. 如果提供了协议草稿，使用协议模式构建器
 * 3. 否则使用默认的合成模式构建器
 * 
 * @param params - 解析参数
 * @returns 分支关系构建器函数
 * 
 * @example
 * ```typescript
 * // 使用默认合成模式
 * const builder = resolveBOMWorkspaceBranchRelationBuilder({})
 * 
 * // 使用协议模式
 * const builder = resolveBOMWorkspaceBranchRelationBuilder({
 *   protocolDraft: myProtocol
 * })
 * 
 * // 使用自定义构建器
 * const builder = resolveBOMWorkspaceBranchRelationBuilder({
 *   branchRelationBuilder: myCustomBuilder
 * })
 * ```
 */
export function resolveBOMWorkspaceBranchRelationBuilder({
  branchRelationBuilder,
  protocolDraft,
}: ResolveBOMWorkspaceBranchRelationBuilderParams): BOMWorkspaceBranchRelationBuilder {
  // 优先使用自定义构建器
  if (branchRelationBuilder) {
    return branchRelationBuilder
  }

  // 如果有协议草稿，使用协议模式
  if (protocolDraft) {
    return buildParentChildrenProtocolBranchRelations(protocolDraft)
  }

  // 默认使用合成模式
  return buildSyntheticBOMWorkspaceBranchRelations
}
