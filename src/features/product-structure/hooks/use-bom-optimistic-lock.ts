/**
 * BOM Optimistic Locking Hook
 * 
 * Implements optimistic concurrency control to prevent silent overwrites
 * when multiple users edit the same BOM simultaneously.
 * 
 * Addresses the "Version Control Failure" issue where concurrent edits
 * cause the last save to silently overwrite previous changes.
 * 
 * @module use-bom-optimistic-lock
 */

import { useState, useCallback, useRef } from 'react'
import { type BOM } from '../data/schema'

export interface OptimisticLockError {
  type: 'version-conflict'
  message: string
  expectedVersion: number
  actualVersion: number
  conflictingFields?: string[]
}

export interface OptimisticLockResult {
  /**
   * The current version number being tracked
   */
  currentVersion: number
  
  /**
   * Updates the tracked version (call after successful save)
   */
  updateVersion: (newVersion: number) => void
  
  /**
   * Validates that the version hasn't changed before save
   */
  validateVersion: (serverVersion: number) => OptimisticLockError | null
  
  /**
   * Checks if a version conflict error occurred
   */
  hasConflict: boolean
  
  /**
   * The conflict error details (if any)
   */
  conflictError: OptimisticLockError | null
  
  /**
   * Clears the conflict error
   */
  clearConflict: () => void
  
  /**
   * Prepares save payload with version check
   */
  prepareSavePayload: <T extends { version?: number; _v?: number }>(
    data: T,
    expectedVersion: number
  ) => T
}

/**
 * Hook for implementing optimistic locking on BOM saves.
 * 
 * Prevents concurrent edit conflicts by:
 * 1. Tracking the version number when BOM is loaded
 * 2. Including expected version in save payload (_v field)
 * 3. Validating server response version matches expected
 * 4. Showing conflict error if versions don't match
 * 
 * @param initialBOM - The BOM loaded from backend
 * @returns Optimistic lock controls
 * 
 * @example
 * ```tsx
 * const {
 *   currentVersion,
 *   updateVersion,
 *   validateVersion,
 *   hasConflict,
 *   conflictError,
 *   prepareSavePayload,
 * } = useBOMOptimisticLock(currentRow)
 * 
 * // Prepare save with version check
 * const payload = prepareSavePayload(data, currentVersion)
 * 
 * // Save and validate response
 * const saved = await saveBOM(payload)
 * const conflict = validateVersion(saved.version)
 * 
 * if (conflict) {
 *   // Show conflict dialog
 *   showConflictDialog(conflict)
 * } else {
 *   // Update tracked version
 *   updateVersion(saved.version)
 * }
 * ```
 */
export function useBOMOptimisticLock(
  initialBOM?: BOM
): OptimisticLockResult {
  const [currentVersion, setCurrentVersion] = useState<number>(
    initialBOM?.version ?? 1
  )
  const [conflictError, setConflictError] = useState<OptimisticLockError | null>(null)
  const expectedVersionRef = useRef<number>(currentVersion)

  // Update tracked version after successful save
  const updateVersion = useCallback((newVersion: number) => {
    setCurrentVersion(newVersion)
    expectedVersionRef.current = newVersion
    setConflictError(null)
  }, [])

  // Validate that server version matches expected version
  const validateVersion = useCallback((serverVersion: number): OptimisticLockError | null => {
    const expected = expectedVersionRef.current

    if (serverVersion !== expected + 1) {
      const error: OptimisticLockError = {
        type: 'version-conflict',
        message: `Version conflict detected. Expected version ${expected + 1}, but server returned ${serverVersion}. Another user may have modified this BOM.`,
        expectedVersion: expected + 1,
        actualVersion: serverVersion,
      }
      
      setConflictError(error)
      return error
    }

    return null
  }, [])

  // Clear conflict error
  const clearConflict = useCallback(() => {
    setConflictError(null)
  }, [])

  // Prepare save payload with version check
  const prepareSavePayload = useCallback(<T extends { version?: number; _v?: number }>(
    data: T,
    expectedVersion: number
  ): T => {
    expectedVersionRef.current = expectedVersion
    
    return {
      ...data,
      version: expectedVersion,
      _v: expectedVersion, // Backend uses _v for optimistic lock check
    }
  }, [])

  return {
    currentVersion,
    updateVersion,
    validateVersion,
    hasConflict: conflictError !== null,
    conflictError,
    clearConflict,
    prepareSavePayload,
  }
}

/**
 * Formats a version conflict error for display to users.
 * 
 * @param error - The conflict error
 * @returns User-friendly error message
 */
export function formatVersionConflictError(error: OptimisticLockError): string {
  return `保存失败：检测到版本冲突

当前版本：V${error.expectedVersion}
服务器版本：V${error.actualVersion}

可能原因：其他用户在您编辑期间修改了此BOM。

建议操作：
1. 刷新页面获取最新数据
2. 重新应用您的修改
3. 再次保存

${error.conflictingFields ? `冲突字段：${error.conflictingFields.join(', ')}` : ''}`
}
