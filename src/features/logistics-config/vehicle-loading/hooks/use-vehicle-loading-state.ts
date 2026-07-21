import { useState } from 'react'
import type {
  ShipmentSummary,
  VehicleCategory,
} from '../data/vehicle-loading.types'
import { createDefaultVehicleLoadingPackageDraft } from '../services/vehicle-loading-package-input'

export function useVehicleLoadingState() {
  const initialSummary: ShipmentSummary = {
    boxes: 120,
    totalVolumeM3: 8.4,
    totalWeightKg: 900,
  }

  const [summary, setSummary] = useState<ShipmentSummary>(initialSummary)

  const [category, setCategory] = useState<VehicleCategory | 'all'>('all')
  const [minVolumeM3, setMinVolumeM3] = useState<string>('')
  const [minPayloadKg, setMinPayloadKg] = useState<string>('')
  const [packageDraft, setPackageDraft] = useState(() =>
    createDefaultVehicleLoadingPackageDraft()
  )

  return {
    summary,
    setSummary,
    category,
    setCategory,
    minVolumeM3,
    setMinVolumeM3,
    minPayloadKg,
    setMinPayloadKg,
    packageDraft,
    setPackageDraft,
  }
}
