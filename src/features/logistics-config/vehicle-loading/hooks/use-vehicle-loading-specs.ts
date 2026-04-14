import { useEffect, useState } from 'react'
import type { VehicleSpec } from '../data/vehicle-loading.types'
import { getVehicleSpecs } from '../services/vehicle-loading-service'

export function useVehicleLoadingSpecs(reloadToken: number) {
  const [vehicleSpecs, setVehicleSpecs] = useState<VehicleSpec[]>([])
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(true)
  const [specsError, setSpecsError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true

    void getVehicleSpecs()
      .then((data) => {
        if (!active) return
        setVehicleSpecs(data)
        setSpecsError(null)
        setIsLoadingSpecs(false)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setSpecsError(cause instanceof Error ? cause : new Error('Failed to load vehicle specs'))
        setVehicleSpecs([])
        setIsLoadingSpecs(false)
      })

    return () => {
      active = false
    }
  }, [reloadToken])

  return {
    vehicleSpecs,
    isLoadingSpecs,
    specsError,
  }
}
