/**
 * BOM Protocol Recovery Hook
 *
 * Implements graceful error recovery for protocol adapter failures.
 * Replaces "Fail Loudly" white screen crashes with user-friendly recovery options.
 *
 * Addresses the "Physical Deletion Risk" issue where deleted items referenced
 * in RelationSidecar cause [CRITICAL] errors and white screens.
 *
 * @module use-bom-protocol-recovery
 */
import { useState, useCallback, useEffect } from 'react'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'
import { parseLeafNodeId } from '../utils/bom-node-id-resolver'
import { type BOMWorkspaceParentChildrenProtocolDraft } from './bom-workspace-branch-relation-builder'
import { buildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource } from './bom-workspace-protocol-source-adapter'

export type ProtocolRecoveryStrategy =
  | 'rebuild'
  | 'filter'
  | 'ignore'
  | 'manual'

export interface ProtocolRecoveryError {
  type: 'adapter-error' | 'validation-error' | 'missing-reference'
  message: string
  nodeId?: string
  context?: Record<string, unknown>
  originalError?: Error
}

export interface ProtocolRecoveryResult {
  /**
   * Whether recovery is needed
   */
  needsRecovery: boolean

  /**
   * The recovery error details
   */
  error: ProtocolRecoveryError | null

  /**
   * The recovered protocol (if recovery succeeded)
   */
  recoveredProtocol?: BOMWorkspaceParentChildrenProtocolDraft

  /**
   * Attempts to recover from the error
   */
  attemptRecovery: (strategy: ProtocolRecoveryStrategy) => Promise<boolean>

  /**
   * Clears the recovery state
   */
  clearRecovery: () => void

  /**
   * Whether recovery is in progress
   */
  isRecovering: boolean
}

interface UseBOMProtocolRecoveryParams {
  sourceBOM?: BOM
  sections: BOMSectionOption[]
  fields: Array<{ id: string }>
  watchedItems?: BOM['items']
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
  onRecoverySuccess?: (
    recoveredProtocol: BOMWorkspaceParentChildrenProtocolDraft
  ) => void
  onRecoveryFailed?: (error: ProtocolRecoveryError) => void
}

/**
 * Attempts to recover a corrupted protocol by filtering out invalid references.
 *
 * @param protocolDraft - The corrupted protocol
 * @param validItemIds - Set of valid item IDs
 * @param validFieldIds - Set of valid field IDs
 * @param validSectionCodes - Set of valid section codes
 * @returns Filtered protocol with invalid references removed
 */
function filterInvalidReferences(
  protocolDraft: BOMWorkspaceParentChildrenProtocolDraft,
  validItemIds: Set<string>,
  validFieldIds: Set<string>,
  validSectionCodes: Set<string>
): BOMWorkspaceParentChildrenProtocolDraft {
  const validBranchIds = new Set(protocolDraft.branchNodes.map((b) => b.id))

  // Filter branch nodes with invalid sections
  const filteredBranchNodes = protocolDraft.branchNodes.filter((branchNode) => {
    if (!validSectionCodes.has(branchNode.sectionCode)) {
      console.warn(
        `[Protocol Recovery] Filtering branch node with invalid section: ${branchNode.id}`
      )
      return false
    }
    return true
  })

  // Filter item nodes with invalid references
  const filteredItemNodes = protocolDraft.itemNodes.filter((itemNode) => {
    // Check section
    if (!validSectionCodes.has(itemNode.sectionCode)) {
      console.warn(
        `[Protocol Recovery] Filtering item node with invalid section: ${itemNode.id}`
      )
      return false
    }

    // Check parent exists
    if (
      itemNode.parentId &&
      !validBranchIds.has(itemNode.parentId) &&
      itemNode.parentId !== 'root'
    ) {
      console.warn(
        `[Protocol Recovery] Filtering item node with invalid parent: ${itemNode.id}`
      )
      return false
    }

    // Check item/field reference
    const itemId = itemNode.itemId?.trim()
    const parsed = parseLeafNodeId(itemNode.id)
    const isItemIdBased = parsed && 'itemId' in parsed
    const isFieldIdBased = parsed && 'fieldId' in parsed

    if (isItemIdBased && itemId && !validItemIds.has(itemId)) {
      console.warn(
        `[Protocol Recovery] Filtering item node with deleted item: ${itemNode.id}`
      )
      return false
    }

    if (isFieldIdBased && parsed && 'fieldId' in parsed) {
      if (!validFieldIds.has(parsed.fieldId)) {
        console.warn(
          `[Protocol Recovery] Filtering item node with invalid field: ${itemNode.id}`
        )
        return false
      }
    }

    return true
  })

  // Update branch children to remove filtered items
  const validItemNodeIds = new Set(filteredItemNodes.map((i) => i.id))
  const updatedBranchNodes = filteredBranchNodes.map((branchNode) => ({
    ...branchNode,
    children: branchNode.children.filter(
      (childId) => validBranchIds.has(childId) || validItemNodeIds.has(childId)
    ),
  }))

  // Update root children
  const filteredRootChildren = protocolDraft.rootChildren.filter((childId) =>
    validBranchIds.has(childId)
  )

  return {
    rootChildren: filteredRootChildren,
    branchNodes: updatedBranchNodes,
    itemNodes: filteredItemNodes,
  }
}

/**
 * Hook for graceful protocol error recovery.
 *
 * Catches protocol adapter errors and provides recovery strategies:
 * - `rebuild`: Completely rebuild protocol from current form state
 * - `filter`: Filter out invalid references but keep structure
 * - `ignore`: Use empty protocol (show all items in default section)
 * - `manual`: Let user manually fix the protocol
 *
 * @param params - Recovery parameters
 * @returns Recovery result and controls
 *
 * @example
 * ```tsx
 * const {
 *   needsRecovery,
 *   error,
 *   recoveredProtocol,
 *   attemptRecovery,
 *   isRecovering,
 * } = useBOMProtocolRecovery({
 *   sourceBOM,
 *   sections,
 *   fields,
 *   watchedItems,
 *   protocolDraft,
 *   onRecoverySuccess: (recovered) => {
 *     console.log('Protocol recovered:', recovered)
 *   },
 * })
 *
 * if (needsRecovery) {
 *   return (
 *     <ProtocolRecoveryDialog
 *       error={error}
 *       onRecover={(strategy) => attemptRecovery(strategy)}
 *       isRecovering={isRecovering}
 *     />
 *   )
 * }
 * ```
 */
export function useBOMProtocolRecovery({
  sourceBOM,
  sections,
  fields,
  watchedItems,
  protocolDraft,
  onRecoverySuccess,
  onRecoveryFailed,
}: UseBOMProtocolRecoveryParams): ProtocolRecoveryResult {
  const [error, setError] = useState<ProtocolRecoveryError | null>(null)
  const [recoveredProtocol, setRecoveredProtocol] =
    useState<BOMWorkspaceParentChildrenProtocolDraft>()
  const [isRecovering, setIsRecovering] = useState(false)

  // Detect protocol errors
  useEffect(() => {
    if (!protocolDraft || !watchedItems) {
      return
    }

    try {
      // Validate protocol references
      const validItemIds = new Set(
        watchedItems.map((item) => item.id?.trim()).filter(Boolean) as string[]
      )
      const validFieldIds = new Set(fields.map((f) => f.id))
      const validSectionCodes = new Set(sections.map((s) => s.code))
      const validBranchIds = new Set(protocolDraft.branchNodes.map((b) => b.id))

      // Check for invalid references
      const invalidItemNodes = protocolDraft.itemNodes.filter((itemNode) => {
        const itemId = itemNode.itemId?.trim()
        const parsed = parseLeafNodeId(itemNode.id)
        const isItemIdBased = parsed && 'itemId' in parsed
        const isFieldIdBased = parsed && 'fieldId' in parsed

        if (isItemIdBased && itemId && !validItemIds.has(itemId)) {
          return true
        }

        if (isFieldIdBased && parsed && 'fieldId' in parsed) {
          if (!validFieldIds.has(parsed.fieldId)) {
            return true
          }
        }

        if (!validSectionCodes.has(itemNode.sectionCode)) {
          return true
        }

        if (
          itemNode.parentId &&
          !validBranchIds.has(itemNode.parentId) &&
          itemNode.parentId !== 'root'
        ) {
          return true
        }

        return false
      })

      if (invalidItemNodes.length > 0) {
        setError({
          type: 'missing-reference',
          message: `Protocol contains ${invalidItemNodes.length} invalid reference(s). This may be caused by deleted items.`,
          context: {
            invalidNodeIds: invalidItemNodes.map((n) => n.id),
          },
        })
      }
    } catch (err) {
      setError({
        type: 'adapter-error',
        message: err instanceof Error ? err.message : 'Unknown protocol error',
        originalError: err instanceof Error ? err : undefined,
      })
    }
  }, [protocolDraft, watchedItems, fields, sections])

  // Attempt recovery with specified strategy
  const attemptRecovery = useCallback(
    async (strategy: ProtocolRecoveryStrategy): Promise<boolean> => {
      if (!sourceBOM || !protocolDraft) {
        return false
      }

      setIsRecovering(true)

      try {
        let recovered: BOMWorkspaceParentChildrenProtocolDraft | undefined

        switch (strategy) {
          case 'rebuild':
            // Completely rebuild protocol from current form state
            recovered =
              buildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource({
                sourceBOM,
                activeSections: sections,
                fields,
                watchedItems,
              })
            console.log('[Protocol Recovery] Rebuilt protocol from form state')
            break

          case 'filter': {
            // Filter out invalid references
            const validItemIds = new Set(
              (watchedItems || [])
                .map((item) => item.id?.trim())
                .filter(Boolean) as string[]
            )
            const validFieldIds = new Set(fields.map((f) => f.id))
            const validSectionCodes = new Set(sections.map((s) => s.code))

            recovered = filterInvalidReferences(
              protocolDraft,
              validItemIds,
              validFieldIds,
              validSectionCodes
            )
            console.log('[Protocol Recovery] Filtered invalid references')
            break
          }

          case 'ignore':
            // Use empty protocol (all items in default section)
            recovered = undefined
            console.log('[Protocol Recovery] Using empty protocol')
            break

          case 'manual':
            // User will manually fix
            console.log('[Protocol Recovery] Manual recovery selected')
            return false

          default:
            throw new Error(`Unknown recovery strategy: ${strategy}`)
        }

        setRecoveredProtocol(recovered)
        setError(null)

        if (onRecoverySuccess && recovered) {
          onRecoverySuccess(recovered)
        }

        return true
      } catch (err) {
        const recoveryError: ProtocolRecoveryError = {
          type: 'adapter-error',
          message: `Recovery failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          originalError: err instanceof Error ? err : undefined,
        }

        setError(recoveryError)

        if (onRecoveryFailed) {
          onRecoveryFailed(recoveryError)
        }

        return false
      } finally {
        setIsRecovering(false)
      }
    },
    [
      sourceBOM,
      protocolDraft,
      sections,
      fields,
      watchedItems,
      onRecoverySuccess,
      onRecoveryFailed,
    ]
  )

  // Clear recovery state
  const clearRecovery = useCallback(() => {
    setError(null)
    setRecoveredProtocol(undefined)
  }, [])

  return {
    needsRecovery: error !== null,
    error,
    recoveredProtocol,
    attemptRecovery,
    clearRecovery,
    isRecovering,
  }
}
