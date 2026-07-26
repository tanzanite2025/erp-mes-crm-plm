import { useState } from 'react'
import type { VehicleCategory } from '../../vehicle-specs/data/vehicle-specs.types'

export function useVehicleLoadingState() {
  const [boxes, setBoxes] = useState<number>(0)

  const [category, setCategory] = useState<VehicleCategory | 'all'>('all')
  const [minVolumeM3, setMinVolumeM3] = useState<string>('')
  const [minPayloadKg, setMinPayloadKg] = useState<string>('')
  const [selectedPackagingProfileId, setSelectedPackagingProfileId] =
    useState<string>('')

  return {
    boxes,
    setBoxes,
    category,
    setCategory,
    minVolumeM3,
    setMinVolumeM3,
    minPayloadKg,
    setMinPayloadKg,
    selectedPackagingProfileId,
    setSelectedPackagingProfileId,
  }
}
