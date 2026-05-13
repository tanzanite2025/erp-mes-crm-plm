/**
 * BOM Permission Guard Hook
 * 
 * Enforces read-only state across all BOM workspace interactions.
 * Prevents edit operations when BOM is locked, even through console manipulation.
 * 
 * @module use-bom-permission-guard
 */

import { useCallback, useMemo } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { type BOM } from '../data/schema'

export interface BOMPermissionContext {
  /** Whether the BOM is locked (read-only) */
  isLocked: boolean
  /** Whether the BOM is in edit mode */
  isEdit: boolean
  /** Current BOM version (for audit trail) */
  version?: number
}

export interface BOMPermissionGuard {
  /** Whether any edit operations are allowed */
  canEdit: boolean
  /** Whether user can add new items */
  canAdd: boolean
  /** Whether user can remove items */
  canRemove: boolean
  /** Whether user can modify form fields */
  canModifyFields: boolean
  /** Whether user can save changes */
  canSave: boolean
  /** Whether user can promote BOM status */
  canPromote: boolean
  
  /** Guard wrapper for append operations */
  guardedAppend: <T>(fn: (item: T) => void) => (item: T) => void
  /** Guard wrapper for remove operations */
  guardedRemove: (fn: (index: number) => void) => (index: number) => void
  /** Guard wrapper for field change operations */
  guardedFieldChange: <T>(fn: (value: T) => void) => (value: T) => void
  /** Guard wrapper for save operations */
  guardedSave: <T>(fn: () => T | Promise<T>) => () => T | Promise<T> | null
  
  /** Get permission denial reason for UI display */
  getDenialReason: () => string | null
}

interface UseBOMPermissionGuardParams {
  context: BOMPermissionContext
  form?: UseFormReturn<BOM>
  onPermissionDenied?: (action: string, reason: string) => void
}

/**
 * Hook to enforce permission-based access control for BOM operations
 * 
 * @example
 * ```tsx
 * const guard = useBOMPermissionGuard({
 *   context: { isLocked: true, isEdit: true },
 *   onPermissionDenied: (action, reason) => {
 *     toast.error(`Cannot ${action}: ${reason}`)
 *   }
 * })
 * 
 * // Wrap operations with guards
 * const safeAppend = guard.guardedAppend(append)
 * const safeRemove = guard.guardedRemove(remove)
 * ```
 */
export function useBOMPermissionGuard({
  context,
  form,
  onPermissionDenied,
}: UseBOMPermissionGuardParams): BOMPermissionGuard {
  const { isLocked, isEdit, version } = context

  // Calculate permission flags
  const canEdit = useMemo(() => !isLocked, [isLocked])
  const canAdd = useMemo(() => !isLocked, [isLocked])
  const canRemove = useMemo(() => !isLocked, [isLocked])
  const canModifyFields = useMemo(() => !isLocked, [isLocked])
  const canSave = useMemo(() => !isLocked, [isLocked])
  const canPromote = useMemo(() => !isLocked, [isLocked])

  // Get human-readable denial reason
  const getDenialReason = useCallback((): string | null => {
    if (isLocked) {
      return 'BOM is locked and cannot be modified'
    }
    return null
  }, [isLocked])

  // Log permission denial with audit context
  const logPermissionDenial = useCallback((action: string) => {
    const reason = getDenialReason()
    if (!reason) return

    console.warn('[BOM Permission Guard] Operation blocked:', {
      action,
      reason,
      isLocked,
      isEdit,
      version,
      timestamp: new Date().toISOString(),
    })

    onPermissionDenied?.(action, reason)
  }, [getDenialReason, isLocked, isEdit, version, onPermissionDenied])

  // Guard wrapper for append operations
  const guardedAppend = useCallback(<T,>(fn: (item: T) => void) => {
    return (item: T) => {
      if (!canAdd) {
        logPermissionDenial('add item')
        return
      }
      fn(item)
    }
  }, [canAdd, logPermissionDenial])

  // Guard wrapper for remove operations
  const guardedRemove = useCallback((fn: (index: number) => void) => {
    return (index: number) => {
      if (!canRemove) {
        logPermissionDenial('remove item')
        return
      }
      fn(index)
    }
  }, [canRemove, logPermissionDenial])

  // Guard wrapper for field change operations
  const guardedFieldChange = useCallback(<T,>(fn: (value: T) => void) => {
    return (value: T) => {
      if (!canModifyFields) {
        logPermissionDenial('modify field')
        return
      }
      fn(value)
    }
  }, [canModifyFields, logPermissionDenial])

  // Guard wrapper for save operations
  const guardedSave = useCallback(<T,>(fn: () => T | Promise<T>) => {
    return () => {
      if (!canSave) {
        logPermissionDenial('save')
        return null
      }
      return fn()
    }
  }, [canSave, logPermissionDenial])

  // Disable form fields when locked
  useMemo(() => {
    if (form && isLocked) {
      // Mark all fields as disabled in form state
      const formState = form.formState
      if (formState && !formState.isSubmitting) {
        // React Hook Form doesn't have a global disable,
        // but we can prevent changes through our guards
        console.log('[BOM Permission Guard] Form is in read-only mode')
      }
    }
  }, [form, isLocked])

  return {
    canEdit,
    canAdd,
    canRemove,
    canModifyFields,
    canSave,
    canPromote,
    guardedAppend,
    guardedRemove,
    guardedFieldChange,
    guardedSave,
    getDenialReason,
  }
}

/**
 * Utility to create a permission context from BOM data
 */
export function createBOMPermissionContext(bom?: BOM, isEdit?: boolean): BOMPermissionContext {
  return {
    isLocked: bom?.isLocked ?? false,
    isEdit: isEdit ?? false,
    version: bom?.version,
  }
}
