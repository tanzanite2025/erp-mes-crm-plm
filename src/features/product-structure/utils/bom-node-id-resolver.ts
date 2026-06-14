/**
 * BOM Node ID Resolution Utilities
 *
 * Centralized single source of truth for BOM tree node ID mapping rules.
 * This module eliminates redundancy between builder and adapter layers.
 *
 * @module bom-node-id-resolver
 */

/**
 * Resolves the canonical node ID for a section branch node.
 *
 * @param sectionCode - The section code (e.g., "MAIN", "AUXILIARY")
 * @returns The canonical node ID in format "section:{sectionCode}"
 *
 * @example
 * resolveSectionBranchNodeId("MAIN") // => "section:MAIN"
 */
export function resolveSectionBranchNodeId(sectionCode: string): string {
  return `section:${sectionCode}`
}

/**
 * Resolves the canonical node ID for a collection branch node.
 *
 * @param sectionCode - The section code
 * @returns The canonical node ID in format "section:{sectionCode}:collection"
 *
 * @example
 * resolveCollectionBranchNodeId("MAIN") // => "section:MAIN:collection"
 */
export function resolveCollectionBranchNodeId(sectionCode: string): string {
  return `section:${sectionCode}:collection`
}

/**
 * Resolves the canonical node ID for a leaf (item) node.
 *
 * @param itemId - The item ID (optional, may be undefined for new items)
 * @param fieldId - The field ID (fallback when itemId is not available)
 * @returns The canonical node ID in format "item:{itemId}" or "field:{fieldId}"
 *
 * @example
 * resolveLeafNodeId("ITM001", "field-1") // => "item:ITM001"
 * resolveLeafNodeId(undefined, "field-1") // => "field:field-1"
 * resolveLeafNodeId("  ", "field-1") // => "field:field-1"
 */
export function resolveLeafNodeId(
  itemId: string | undefined,
  fieldId: string
): string {
  const normalizedItemId = itemId?.trim()
  return normalizedItemId ? `item:${normalizedItemId}` : `field:${fieldId}`
}

/**
 * Parses a section branch node ID to extract the section code.
 *
 * @param nodeId - The node ID to parse
 * @returns The section code, or undefined if the node ID is not a valid section branch node ID
 *
 * @example
 * parseSectionBranchNodeId("section:MAIN") // => "MAIN"
 * parseSectionBranchNodeId("section:MAIN:collection") // => undefined
 * parseSectionBranchNodeId("item:ITM001") // => undefined
 */
export function parseSectionBranchNodeId(nodeId: string): string | undefined {
  if (!nodeId.startsWith('section:')) {
    return undefined
  }

  const parts = nodeId.slice('section:'.length).split(':')
  if (parts.length !== 1) {
    return undefined
  }

  return parts[0] || undefined
}

/**
 * Parses a collection branch node ID to extract the section code.
 *
 * @param nodeId - The node ID to parse
 * @returns The section code, or undefined if the node ID is not a valid collection branch node ID
 *
 * @example
 * parseCollectionBranchNodeId("section:MAIN:collection") // => "MAIN"
 * parseCollectionBranchNodeId("section:MAIN") // => undefined
 * parseCollectionBranchNodeId("item:ITM001") // => undefined
 */
export function parseCollectionBranchNodeId(
  nodeId: string
): string | undefined {
  if (!nodeId.startsWith('section:') || !nodeId.endsWith(':collection')) {
    return undefined
  }

  const sectionCode = nodeId.slice('section:'.length, -':collection'.length)
  return sectionCode || undefined
}

/**
 * Parses a leaf node ID to extract the item ID or field ID.
 *
 * @param nodeId - The node ID to parse
 * @returns An object with either itemId or fieldId, or undefined if the node ID is not a valid leaf node ID
 *
 * @example
 * parseLeafNodeId("item:ITM001") // => { itemId: "ITM001" }
 * parseLeafNodeId("field:field-1") // => { fieldId: "field-1" }
 * parseLeafNodeId("section:MAIN") // => undefined
 */
export function parseLeafNodeId(
  nodeId: string
): { itemId: string } | { fieldId: string } | undefined {
  if (nodeId.startsWith('item:')) {
    const itemId = nodeId.slice('item:'.length).trim()
    return itemId ? { itemId } : undefined
  }

  if (nodeId.startsWith('field:')) {
    const fieldId = nodeId.slice('field:'.length).trim()
    return fieldId ? { fieldId } : undefined
  }

  return undefined
}

/**
 * Validates that a node ID follows the canonical format.
 *
 * @param nodeId - The node ID to validate
 * @returns True if the node ID is valid, false otherwise
 *
 * @example
 * isValidNodeId("section:MAIN") // => true
 * isValidNodeId("section:MAIN:collection") // => true
 * isValidNodeId("item:ITM001") // => true
 * isValidNodeId("field:field-1") // => true
 * isValidNodeId("invalid") // => false
 */
export function isValidNodeId(nodeId: string): boolean {
  return !!(
    parseSectionBranchNodeId(nodeId) ||
    parseCollectionBranchNodeId(nodeId) ||
    parseLeafNodeId(nodeId)
  )
}
