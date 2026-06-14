/**
 * Synthetic Branch Relation Builder
 *
 * 实现合成模式的分支关系构建器。
 *
 * 合成模式为每个 section 创建两层节点：
 * - Section Branch: 代表 section 本身
 * - Collection Branch: 代表该 section 下的所有 items
 */
import {
  resolveSectionBranchNodeId,
  resolveCollectionBranchNodeId,
  resolveLeafNodeId,
} from '../../utils/bom-node-id-resolver'
import type {
  BOMWorkspaceBranchRelationBuilder,
  BOMWorkspaceSourceBranchNode,
  BOMWorkspaceSourceLeafNode,
} from './types'

/**
 * 构建合成模式的分支关系
 *
 * 此构建器会为每个激活的 section 创建：
 * 1. 一个 section branch 节点（父节点）
 * 2. 一个 collection branch 节点（子节点，包含所有 items）
 * 3. 多个 leaf 节点（每个 item 对应一个）
 *
 * @param params - 构建参数
 * @returns 构建结果，包含所有节点和关系
 *
 * @example
 * ```typescript
 * const result = buildSyntheticBOMWorkspaceBranchRelations({
 *   activeSections: [{ code: 'MAIN', name: '主料', ... }],
 *   fields: [{ id: 'field1' }],
 *   watchedItems: [{ id: 'item1', section: 'MAIN', ... }],
 *   resolveNumericField: (i, f, v) => Number(v) || 0,
 *   rootNodeId: 'root',
 * })
 * ```
 */
export const buildSyntheticBOMWorkspaceBranchRelations: BOMWorkspaceBranchRelationBuilder =
  ({
    activeSections,
    fields,
    watchedItems,
    resolveNumericField,
    rootNodeId,
  }) => {
    const {
      branchNodes,
      sectionBranchNodes,
      collectionBranchNodes,
      leafNodes,
    } = activeSections.reduce<{
      branchNodes: BOMWorkspaceSourceBranchNode[]
      sectionBranchNodes: BOMWorkspaceSourceBranchNode[]
      collectionBranchNodes: BOMWorkspaceSourceBranchNode[]
      leafNodes: BOMWorkspaceSourceLeafNode[]
    }>(
      (acc, section) => {
        const branchNodeId = resolveSectionBranchNodeId(section.code)
        const collectionBranchNodeId = resolveCollectionBranchNodeId(
          section.code
        )

        // 为当前 section 创建所有 leaf 节点
        const sectionLeafNodes = fields.flatMap((field, index) => {
          const item = watchedItems?.[index]
          if (!item || item.section !== section.code) {
            return []
          }

          const unitPrice = resolveNumericField(
            index,
            'unitPrice',
            item.unitPrice
          )
          const standardUsage = resolveNumericField(
            index,
            'standardUsage',
            item.standardUsage
          )

          return [
            {
              nodeId: resolveLeafNodeId(item.id, field.id),
              parentNodeId: collectionBranchNodeId,
              childNodeIds: [],
              nodeKind: 'leaf' as const,
              sectionCode: section.code,
              sectionName: section.name,
              itemId: item.id?.trim() || '',
              fieldId: field.id,
              index,
              materialId: item.materialId ?? '',
              materialName: item.materialName ?? '',
              unitPrice,
              standardUsage,
            },
          ]
        })

        // 创建 section branch 节点
        const sectionBranchNode: BOMWorkspaceSourceBranchNode = {
          nodeId: branchNodeId,
          parentNodeId: rootNodeId,
          childNodeIds: [collectionBranchNodeId],
          nodeKind: 'branch',
          branchRole: 'section',
          sectionCode: section.code,
          sectionName: section.name,
          label: section.name,
          section,
        }

        // 创建 collection branch 节点
        const collectionBranchNode: BOMWorkspaceSourceBranchNode = {
          nodeId: collectionBranchNodeId,
          parentNodeId: branchNodeId,
          childNodeIds: sectionLeafNodes.map((node) => node.nodeId),
          nodeKind: 'branch',
          branchRole: 'collection',
          sectionCode: section.code,
          sectionName: section.name,
          label: `${section.name} 明细`,
          section,
        }

        acc.branchNodes.push(sectionBranchNode, collectionBranchNode)
        acc.sectionBranchNodes.push(sectionBranchNode)
        acc.collectionBranchNodes.push(collectionBranchNode)
        acc.leafNodes.push(...sectionLeafNodes)
        return acc
      },
      {
        branchNodes: [],
        sectionBranchNodes: [],
        collectionBranchNodes: [],
        leafNodes: [],
      }
    )

    return {
      rootChildNodeIds: sectionBranchNodes.map((node) => node.nodeId),
      branchNodes,
      sectionBranchNodes,
      collectionBranchNodes,
      leafNodes,
    }
  }
