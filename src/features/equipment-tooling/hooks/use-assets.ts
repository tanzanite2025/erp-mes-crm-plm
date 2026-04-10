'use client'

import { useState, useEffect, useCallback } from 'react'
import { createLogger } from '@/lib/logger'
import { type Mold, type Furnace, type MoldLoan } from '../data/schema'
import { type DeltaSet } from '@/lib/delta/types'
import { AssetService } from '../services/asset-service'
import { MoldTransactionService } from '../services/mold-transaction-service'
import { MoldMaintenanceService } from '../services/mold-maintenance-service'
import { FurnaceService } from '../services/furnace-service'

const logger = createLogger('useAssets')

export function useAssets() {
  const [molds, setMolds] = useState<Mold[]>([])
  const [furnaces, setFurnaces] = useState<Furnace[]>([])
  const [loans, setLoans] = useState<MoldLoan[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadMolds = useCallback(async () => {
    try {
      const data = await AssetService.getMolds()
      setMolds(data)
    } catch (err) {
      logger.error('Molds fetch failed', err)
      throw err
    }
  }, [])

  const loadFurnaces = useCallback(async () => {
    try {
      const data = await AssetService.getFurnaces()
      setFurnaces(data)
    } catch (err) {
      logger.error('Furnaces fetch failed', err)
      throw err
    }
  }, [])

  const loadLoans = useCallback(async () => {
    try {
      const data = await AssetService.getLoans()
      setLoans(data)
    } catch (err) {
      logger.error('Loans fetch failed', err)
      throw err
    }
  }, [])

  const loadInitial = useCallback(async () => {
    setIsLoading(true)
    try {
      await Promise.all([loadMolds(), loadFurnaces(), loadLoans()])
    } finally {
      setIsLoading(false)
    }
  }, [loadMolds, loadFurnaces, loadLoans])

  useEffect(() => {
    void loadInitial()

    window.addEventListener('xdfc_molds_updated', loadMolds)
    window.addEventListener('xdfc_furnaces_updated', loadFurnaces)
    window.addEventListener('xdfc_mold_loans_updated', loadLoans)

    return () => {
      window.removeEventListener('xdfc_molds_updated', loadMolds)
      window.removeEventListener('xdfc_furnaces_updated', loadFurnaces)
      window.removeEventListener('xdfc_mold_loans_updated', loadLoans)
    }
  }, [loadInitial, loadMolds, loadFurnaces, loadLoans])

  const actions = {
    updateMolds: async (mold: Mold, isPatch?: boolean, delta?: DeltaSet) => {
      const previousMolds = [...molds]

      const exists = molds.some((m) => m.id === mold.id)
      const nextMolds = exists ? molds.map((m) => (m.id === mold.id ? mold : m)) : [...molds, mold]
      setMolds(nextMolds)

      try {
        if (isPatch && delta && mold.id) {
          await MoldMaintenanceService.patchMold(mold.id, delta, mold.version || 1)
        } else if (!exists) {
          await MoldTransactionService.createMold(mold)
        } else {
          throw new Error('[INVALID_MOLD_UPDATE] Existing mold updates must use patch flow.')
        }

        window.dispatchEvent(new CustomEvent('xdfc_molds_updated'))
      } catch (err) {
        setMolds(previousMolds)
        logger.error('Update mold failed, rolled back', err)
        throw err
      }
    },

    updateFurnaces: async (furnace: Furnace, isPatch?: boolean, delta?: DeltaSet) => {
      const previousFurnaces = [...furnaces]

      const exists = furnaces.some((f) => f.id === furnace.id)
      const nextFurnaces = exists
        ? furnaces.map((f) => (f.id === furnace.id ? furnace : f))
        : [...furnaces, furnace]
      setFurnaces(nextFurnaces)

      try {
        if (isPatch && delta && furnace.id) {
          await FurnaceService.patchFurnace(furnace.id, delta, furnace.version || 1)
        } else {
          await FurnaceService.saveFurnace(furnace)
        }
      } catch (err) {
        setFurnaces(previousFurnaces)
        logger.error('Update furnace failed, rolled back', err)
        throw err
      }
    },
  }

  return {
    molds,
    furnaces,
    loans,
    isLoading,
    ...actions,
    reloadMolds: loadMolds,
    reloadFurnaces: loadFurnaces,
    reloadLoans: loadLoans,
    reloadAll: loadInitial,
  }
}
