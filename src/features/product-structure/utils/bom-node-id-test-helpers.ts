/**
 * BOM Node ID Test Helpers
 * 
 * Provides test utilities that use the canonical ID resolver functions
 * to ensure test data stays synchronized with production ID generation logic.
 * 
 * @module bom-node-id-test-helpers
 */

import {
  resolveSectionBranchNodeId,
  resolveCollectionBranchNodeId,
  resolveLeafNodeId,
} from './bom-node-id-resolver'
import type {
  BOMWorkspaceParentChildrenProtocolDraft,
  BOMWorkspaceParentChildrenProtocolBranchDraft,
  BOMWorkspaceParentChildrenProtocolItemDraft,
} from '../hooks/bom-workspace-branch-relation'

/**
 * Creates a section branch node with canonical ID format.
 * 
 * @param sectionCode - The section code (e.g., "PREPARE", "MAIN")
 * @param label - The display label for the section
 * @param children - Array of child node IDs
 * @returns A properly formatted section branch node
 * 
 * @example
 * createSectionBranchNode("PREPARE", "备料", [resolveCollectionBranchNodeId("PREPARE")])
 */
export function createSectionBranchNode(
  sectionCode: string,
  label: string,
  children: string[] = []
): BOMWorkspaceParentChildrenProtocolBranchDraft {
  return {
    id: resolveSectionBranchNodeId(sectionCode),
    parentId: 'root',
    children,
    nodeKind: 'branch',
    branchRole: 'section',
    label,
    sectionCode,
  }
}

/**
 * Creates a collection branch node with canonical ID format.
 * 
 * @param sectionCode - The section code
 * @param label - The display label for the collection
 * @param children - Array of child node IDs (typically item nodes)
 * @returns A properly formatted collection branch node
 * 
 * @example
 * createCollectionBranchNode("PREPARE", "备料 明细", [resolveLeafNodeId("item-1", "field-1")])
 */
export function createCollectionBranchNode(
  sectionCode: string,
  label: string,
  children: string[] = []
): BOMWorkspaceParentChildrenProtocolBranchDraft {
  return {
    id: resolveCollectionBranchNodeId(sectionCode),
    parentId: resolveSectionBranchNodeId(sectionCode),
    children,
    nodeKind: 'branch',
    branchRole: 'collection',
    label,
    sectionCode,
  }
}

/**
 * Creates an item node with canonical ID format.
 * 
 * @param sectionCode - The section code
 * @param itemId - The item ID (optional, will use field-based ID if not provided)
 * @param fieldId - The field ID (used as fallback when itemId is not provided)
 * @returns A properly formatted item node
 * 
 * @example
 * createItemNode("PREPARE", "item-1", "field-1")
 * createItemNode("PREPARE", undefined, "field-1") // Uses field-based ID
 */
export function createItemNode(
  sectionCode: string,
  itemId: string | undefined,
  fieldId: string
): BOMWorkspaceParentChildrenProtocolItemDraft {
  return {
    id: resolveLeafNodeId(itemId, fieldId),
    parentId: resolveCollectionBranchNodeId(sectionCode),
    children: [],
    nodeKind: 'item',
    sectionCode,
    itemId,
  }
}

/**
 * Creates a minimal protocol draft for testing with canonical ID format.
 * 
 * @param sectionCode - The section code
 * @param sectionLabel - The section display label
 * @param collectionLabel - The collection display label
 * @param items - Array of item configurations
 * @returns A properly formatted protocol draft
 * 
 * @example
 * createTestProtocolDraft("PREPARE", "备料", "备料 明细", [
 *   { itemId: "item-1", fieldId: "field-1" }
 * ])
 */
export function createTestProtocolDraft(
  sectionCode: string,
  sectionLabel: string,
  collectionLabel: string,
  items: Array<{ itemId?: string; fieldId: string }> = []
): BOMWorkspaceParentChildrenProtocolDraft {
  const collectionNodeId = resolveCollectionBranchNodeId(sectionCode)
  const itemNodeIds = items.map(({ itemId, fieldId }) => resolveLeafNodeId(itemId, fieldId))

  return {
    rootChildren: [resolveSectionBranchNodeId(sectionCode)],
    branchNodes: [
      createSectionBranchNode(sectionCode, sectionLabel, [collectionNodeId]),
      createCollectionBranchNode(sectionCode, collectionLabel, itemNodeIds),
    ],
    itemNodes: items.map(({ itemId, fieldId }) => createItemNode(sectionCode, itemId, fieldId)),
  }
}
