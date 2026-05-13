/**
 * BOM Relation Delta Tracker Hook
 * 
 * Integrates SDRTS protocol with BOM RelationSidecar to enable:
 * - Fine-grained change tracking for tree structure modifications
 * - Reduced payload size (only submit changed fields)
 * - Enhanced audit log granularity
 * 
 * @module use-bom-relation-delta-tracker
 */

import { useEffect, useRef, useState } from 'react'
import { type DeltaSet } from '@/lib/delta/types'
import { ProxyTracker } from '@/lib/delta/proxy-tracker'
import { type BOMRelationSidecar } from '../utils/bom-relation-sidecar'

export interface BOMRelationDeltaTrackerResult {
  /**
   * The tracked RelationSidecar proxy object.
   * Modifications to this object are automatically tracked.
   */
  trackedSidecar: BOMRelationSidecar | null
  
  /**
   * Resets the tracker with a new baseline RelationSidecar.
   * Call this when loading a BOM from the backend.
   */
  resetBaseline: (newSidecar: BOMRelationSidecar | null) => void
  
  /**
   * Updates the tracked sidecar with new data.
   * Call this when the protocol draft changes.
   */
  updateSidecar: (newSidecar: BOMRelationSidecar | null) => void
  
  /**
   * Commits the current changes and returns the delta set.
   * Returns null if no changes were made.
   */
  commitDelta: () => DeltaSet | null
  
  /**
   * Checks if there are any uncommitted changes.
   */
  isDirty: boolean
}

/**
 * Hook for tracking changes to BOM RelationSidecar using SDRTS protocol.
 * 
 * @param initialSidecar - The initial RelationSidecar to track (typically from backend)
 * @returns Tracker result with tracked sidecar and control functions
 * 
 * @example
 * ```tsx
 * const { trackedSidecar, resetBaseline, commitDelta, isDirty } = useBOMRelationDeltaTracker(
 *   currentRow?.relationSidecar
 * )
 * 
 * // When loading BOM from backend
 * useEffect(() => {
 *   if (detailSource?.relationSidecar) {
 *     resetBaseline(detailSource.relationSidecar)
 *   }
 * }, [detailSource])
 * 
 * // When saving
 * const handleSave = () => {
 *   const delta = commitDelta()
 *   if (delta) {
 *     // Submit delta instead of full sidecar
 *     await saveBOM({ delta, version: currentRow.version })
 *   }
 * }
 * ```
 */
export function useBOMRelationDeltaTracker(
  initialSidecar: BOMRelationSidecar | null | undefined
): BOMRelationDeltaTrackerResult {
  const [isDirty, setIsDirty] = useState(false)
  const trackerRef = useRef<ProxyTracker<BOMRelationSidecar> | null>(null)
  const [trackedSidecar, setTrackedSidecar] = useState<BOMRelationSidecar | null>(null)

  // Initialize tracker on mount or when initialSidecar changes
  useEffect(() => {
    if (!initialSidecar) {
      trackerRef.current = null
      setTrackedSidecar(null)
      setIsDirty(false)
      return
    }

    const tracker = new ProxyTracker<BOMRelationSidecar>(
      initialSidecar,
      () => setIsDirty(true)
    )
    
    trackerRef.current = tracker
    setTrackedSidecar(tracker.data)
    setIsDirty(false)
  }, [initialSidecar])

  const resetBaseline = (newSidecar: BOMRelationSidecar | null) => {
    if (!newSidecar) {
      trackerRef.current = null
      setTrackedSidecar(null)
      setIsDirty(false)
      return
    }

    if (!trackerRef.current) {
      const tracker = new ProxyTracker<BOMRelationSidecar>(
        newSidecar,
        () => setIsDirty(true)
      )
      trackerRef.current = tracker
      setTrackedSidecar(tracker.data)
    } else {
      trackerRef.current.reset(newSidecar)
      setTrackedSidecar(trackerRef.current.data)
    }
    
    setIsDirty(false)
  }

  const updateSidecar = (newSidecar: BOMRelationSidecar | null) => {
    if (!newSidecar || !trackerRef.current) {
      return
    }

    // Replace the tracked sidecar content with new data
    trackerRef.current.replace(newSidecar)
  }

  const commitDelta = (): DeltaSet | null => {
    if (!trackerRef.current) {
      return null
    }

    const delta = trackerRef.current.commit()
    
    if (Object.keys(delta).length === 0) {
      return null
    }

    setIsDirty(false)
    return delta
  }

  return {
    trackedSidecar,
    resetBaseline,
    updateSidecar,
    commitDelta,
    isDirty,
  }
}
