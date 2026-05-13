/**
 * BOM Workspace Source Types
 * 
 * 定义 BOM workspace 源数据模型的类型
 */

import type {
  BOMWorkspaceSourceBranchNode,
  BOMWorkspaceSourceLeafNode,
} from '../bom-workspace-branch-relation/types'

/**
 * 节点类型
 */
export type BOMWorkspaceSourceNodeKind = 'root' | 'branch' | 'leaf'

/**
 * 节点基础接口
 */
export interface BOMWorkspaceSourceBaseNode {
  nodeId: string
  parentNodeId: string | null
  childNodeIds: string[]
  nodeKind: BOMWorkspaceSourceNodeKind
  sectionCode: string
  sectionName: string
}

/**
 * 根节点
 */
export interface BOMWorkspaceSourceRootNode extends BOMWorkspaceSourceBaseNode {
  nodeKind: 'root'
}

/**
 * Re-export branch and leaf node types
 */
export type { BOMWorkspaceSourceBranchNode, BOMWorkspaceSourceLeafNode }

/**
 * 所有节点类型的联合类型
 */
export type BOMWorkspaceSourceNode =
  | BOMWorkspaceSourceRootNode
  | BOMWorkspaceSourceBranchNode
  | BOMWorkspaceSourceLeafNode

/**
 * BOM Workspace 源数据模型
 */
export interface BOMWorkspaceSourceModel {
  /** 根节点 */
  rootNode: BOMWorkspaceSourceRootNode
  /** 所有节点列表 */
  sourceNodes: BOMWorkspaceSourceNode[]
  /** 节点 ID 到节点的映射 */
  nodeById: Map<string, BOMWorkspaceSourceNode>
  /** 所有分支节点 */
  branchNodes: BOMWorkspaceSourceBranchNode[]
  /** Section 分支节点 */
  sectionBranchNodes: BOMWorkspaceSourceBranchNode[]
  /** Collection 分支节点 */
  collectionBranchNodes: BOMWorkspaceSourceBranchNode[]
  /** 所有叶子节点 */
  leafNodes: BOMWorkspaceSourceLeafNode[]
}
