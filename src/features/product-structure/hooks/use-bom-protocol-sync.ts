/**
 * BOM Protocol Lifecycle Synchronization
 * 
 * Solves the "Protocol Lifecycle Drift" problem by ensuring RelationSidecar
 * stays synchronized with the actual form data (SourceModel).
 * 
 * Addresses two critical risks:
 * 1. Projection Drift: When user modifies sectionCode in table but RelationSidecar is not updated
 * 2. ID Volatility: When backend Upsert changes physical IDs during BOM derive/refactor
 * 
 * @module use-bom-protocol-sync
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { type BOM } from '../data/schema'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOMWorkspaceParentChildrenProtocolDraft } from './bom-workspace-branch-relation-builder'
import { buildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource } from './bom-workspace-protocol-source-adapter'
import { parseLeafNodeId } from '../utils/bom-node-id-resolver'

/**
 * Debounce delay for protocol sync (in milliseconds).
 * Prevents excessive recalculation on rapid form changes.
 */
const PROTOCOL_SYNC_DEBOUNCE_MS = 300

export interface ProtocolSyncValidationResult {
  isValid: boolean
  errors: ProtocolSyncError[]
  warnings: ProtocolSyncWarning[]
}

export interface ProtocolSyncError {
  type: 'missing-node' | 'section-mismatch' | 'orphaned-node' | 'invalid-parent'
  nodeId: string
  message: string
  context?: Record<string, unknown>
}

export interface ProtocolSyncWarning {
  type: 'stale-id' | 'section-drift' | 'empty-branch'
  nodeId: string
  message: string
  context?: Record<string, unknown>
}

export interface ProtocolSyncResult {
  needsSync: boolean
  validation: ProtocolSyncValidationResult
  syncedProtocol?: BOMWorkspaceParentChildrenProtocolDraft
}

interface UseBOMProtocolSyncParams {
  form: UseFormReturn<BOM>
  fields: Array<{ id: string }>
  sections: BOMSectionOption[]
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
  authoritativeProtocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
  sourceBOM?: BOM
  /**
   * Debounce delay in milliseconds. Defaults to 300ms.
   * Set to 0 to disable debouncing (sync immediately on every change).
   */
  debounceMs?: number
  /**
   * If true, sync only when explicitly triggered (e.g., on save).
   * Disables automatic sync on form changes.
   */
  manualSyncOnly?: boolean
}

/**
 * Validates that the protocol draft is consistent with the current form state.
 * 
 * Checks for:
 * - Missing nodes (protocol references non-existent items)
 * - Section mismatches (protocol sectionCode differs from item.section)
 * - Orphaned nodes (nodes with invalid parent references)
 * - Stale IDs (item IDs changed but protocol still references old IDs)
 */
function validateProtocolConsistency(
  protocolDraft: BOMWorkspaceParentChildrenProtocolDraft,
  watchedItems: BOM['items'],
  fields: Array<{ id: string }>,
  sections: BOMSectionOption[]
): ProtocolSyncValidationResult {
  const errors: ProtocolSyncError[] = []
  const warnings: ProtocolSyncWarning[] = []

  const activeSectionCodes = new Set(sections.map((s) => s.code))
  const itemIdSet = new Set(watchedItems.map((item) => item.id?.trim()).filter(Boolean))
  const fieldIdSet = new Set(fields.map((f) => f.id))
  const branchNodeIdSet = new Set(protocolDraft.branchNodes.map((b) => b.id))

  // Validate branch nodes
  protocolDraft.branchNodes.forEach((branchNode) => {
    // Check section exists
    if (!activeSectionCodes.has(branchNode.sectionCode)) {
      errors.push({
        type: 'section-mismatch',
        nodeId: branchNode.id,
        message: `Branch node references inactive section: ${branchNode.sectionCode}`,
        context: { sectionCode: branchNode.sectionCode },
      })
    }

    // Check parent exists (if not root)
    if (branchNode.parentId && branchNode.parentId !== 'root' && !branchNodeIdSet.has(branchNode.parentId)) {
      errors.push({
        type: 'invalid-parent',
        nodeId: branchNode.id,
        message: `Branch node has invalid parent: ${branchNode.parentId}`,
        context: { parentId: branchNode.parentId },
      })
    }

    // Warn about empty branches
    if (branchNode.children.length === 0) {
      warnings.push({
        type: 'empty-branch',
        nodeId: branchNode.id,
        message: `Branch node has no children`,
        context: { branchRole: branchNode.branchRole },
      })
    }
  })

  // Validate item nodes
  protocolDraft.itemNodes.forEach((itemNode) => {
    // Check section exists
    if (!activeSectionCodes.has(itemNode.sectionCode)) {
      errors.push({
        type: 'section-mismatch',
        nodeId: itemNode.id,
        message: `Item node references inactive section: ${itemNode.sectionCode}`,
        context: { sectionCode: itemNode.sectionCode },
      })
    }

    // Check parent exists
    if (!itemNode.parentId || (!branchNodeIdSet.has(itemNode.parentId) && itemNode.parentId !== 'root')) {
      errors.push({
        type: 'invalid-parent',
        nodeId: itemNode.id,
        message: `Item node has invalid parent: ${itemNode.parentId}`,
        context: { parentId: itemNode.parentId },
      })
    }

    // Check if item/field exists in current form
    const itemId = itemNode.itemId?.trim()
    const parsed = parseLeafNodeId(itemNode.id)
    const isItemIdBased = parsed && 'itemId' in parsed
    const isFieldIdBased = parsed && 'fieldId' in parsed

    if (isItemIdBased && itemId && !itemIdSet.has(itemId)) {
      warnings.push({
        type: 'stale-id',
        nodeId: itemNode.id,
        message: `Item node references non-existent item ID: ${itemId}`,
        context: { itemId },
      })
    }

    if (isFieldIdBased && parsed && 'fieldId' in parsed) {
      if (!fieldIdSet.has(parsed.fieldId)) {
        errors.push({
          type: 'missing-node',
          nodeId: itemNode.id,
          message: `Item node references non-existent field ID: ${parsed.fieldId}`,
          context: { fieldId: parsed.fieldId },
        })
      }
    }

    // Check section consistency with actual item data
    const matchingItem = watchedItems.find((item, index) => {
      const normalizedItemId = item.id?.trim()
      if (itemId && normalizedItemId === itemId) {
        return true
      }
      if (isFieldIdBased && parsed && 'fieldId' in parsed) {
        return fields[index]?.id === parsed.fieldId
      }
      return false
    })

    if (matchingItem && matchingItem.section !== itemNode.sectionCode) {
      warnings.push({
        type: 'section-drift',
        nodeId: itemNode.id,
        message: `Item section changed from ${itemNode.sectionCode} to ${matchingItem.section}`,
        context: {
          protocolSection: itemNode.sectionCode,
          actualSection: matchingItem.section,
        },
      })
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Hook for synchronizing BOM RelationSidecar protocol with form state.
 * 
 * Automatically detects and fixes:
 * - Section code changes in table rows
 * - Item ID changes from backend Upsert operations
 * - Orphaned nodes after item deletion
 * - Invalid parent references
 * 
 * Performance optimizations:
 * - Debounced sync (default 300ms) to prevent excessive recalculation
 * - Manual sync mode for on-demand triggering (e.g., only on save)
 * - Incremental validation to minimize computation
 * 
 * @param params - Sync parameters
 * @returns Sync result with validation and synced protocol
 * 
 * @example
 * ```tsx
 * // Default: Auto-sync with 300ms debounce
 * const { needsSync, validation, syncedProtocol } = useBOMProtocolSync({
 *   form,
 *   fields,
 *   sections,
 *   protocolDraft,
 *   authoritativeProtocolDraft,
 *   sourceBOM,
 * })
 * 
 * // Custom debounce delay (500ms)
 * const result = useBOMProtocolSync({
 *   ...params,
 *   debounceMs: 500,
 * })
 * 
 * // Manual sync only (no auto-sync)
 * const result = useBOMProtocolSync({
 *   ...params,
 *   manualSyncOnly: true,
 * })
 * 
 * // Use syncedProtocol instead of protocolDraft for rendering
 * const projection = useBOMWorkspaceProjection({
 *   ...otherParams,
 *   protocolDraft: syncedProtocol || protocolDraft,
 * })
 * 
 * // Show validation warnings to user
 * if (validation.warnings.length > 0) {
 *   console.warn('Protocol sync warnings:', validation.warnings)
 * }
 * ```
 */
export function useBOMProtocolSync({
  form,
  fields,
  sections,
  protocolDraft,
  authoritativeProtocolDraft,
  sourceBOM,
  debounceMs = PROTOCOL_SYNC_DEBOUNCE_MS,
  manualSyncOnly = false,
}: UseBOMProtocolSyncParams): ProtocolSyncResult {
  const watchedItems = form.watch('items')
  const lastSyncedItemsRef = useRef<BOM['items']>([])
  const lastValidationRef = useRef<ProtocolSyncValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
  })
  const [debouncedSyncedProtocol, setDebouncedSyncedProtocol] = useState<
    BOMWorkspaceParentChildrenProtocolDraft | undefined
  >(protocolDraft)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Validate protocol consistency
  const validation = useCallback((): ProtocolSyncValidationResult => {
    if (!protocolDraft) {
      return { isValid: true, errors: [], warnings: [] }
    }

    return validateProtocolConsistency(protocolDraft, watchedItems, fields, sections)
  }, [protocolDraft, watchedItems, fields, sections])

  // Check if sync is needed
  const needsSync = useCallback((): boolean => {
    if (!protocolDraft) {
      return false
    }

    const currentValidation = validation()
    
    // Sync needed if there are errors or warnings
    if (currentValidation.errors.length > 0 || currentValidation.warnings.length > 0) {
      return true
    }

    // Sync needed if items changed
    const itemsChanged = JSON.stringify(watchedItems) !== JSON.stringify(lastSyncedItemsRef.current)
    if (itemsChanged) {
      return true
    }

    return false
  }, [protocolDraft, watchedItems, validation])

  // Perform sync
  const performSync = useCallback((): BOMWorkspaceParentChildrenProtocolDraft | undefined => {
    if (!sourceBOM) {
      return protocolDraft
    }

    // Rebuild protocol from current form state
    const syncedProtocol = buildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource({
      sourceBOM,
      activeSections: sections,
      fields,
      watchedItems,
      authoritativeProtocolDraft,
    })

    lastSyncedItemsRef.current = [...watchedItems]
    return syncedProtocol
  }, [sourceBOM, sections, fields, watchedItems, authoritativeProtocolDraft, protocolDraft])

  // Auto-sync with debouncing
  useEffect(() => {
    // Skip auto-sync if manual mode is enabled
    if (manualSyncOnly) {
      return
    }

    const currentValidation = validation()
    lastValidationRef.current = currentValidation

    // Log validation issues for debugging
    if (currentValidation.errors.length > 0) {
      console.error('[BOM Protocol Sync] Validation errors:', currentValidation.errors)
    }
    if (currentValidation.warnings.length > 0) {
      console.warn('[BOM Protocol Sync] Validation warnings:', currentValidation.warnings)
    }

    const shouldSync = needsSync()
    
    if (!shouldSync) {
      return
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // If debounce is disabled (0ms), sync immediately
    if (debounceMs === 0) {
      const synced = performSync()
      setDebouncedSyncedProtocol(synced)
      return
    }

    // Schedule debounced sync
    debounceTimerRef.current = setTimeout(() => {
      const synced = performSync()
      setDebouncedSyncedProtocol(synced)
      debounceTimerRef.current = null
    }, debounceMs)

    // Cleanup timer on unmount or dependency change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [validation, needsSync, performSync, debounceMs, manualSyncOnly])

  // In manual mode, return the original protocol without auto-sync
  if (manualSyncOnly) {
    return {
      needsSync: needsSync(),
      validation: lastValidationRef.current,
      syncedProtocol: protocolDraft,
    }
  }

  const shouldSync = needsSync()

  return {
    needsSync: shouldSync,
    validation: lastValidationRef.current,
    syncedProtocol: shouldSync ? debouncedSyncedProtocol : protocolDraft,
  }
}
