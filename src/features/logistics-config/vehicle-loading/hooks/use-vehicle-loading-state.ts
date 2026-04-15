import { useState } from 'react'
import type { ShipmentSummary, VehicleCategory } from '../data/vehicle-loading.types'
import { type VehicleLoadingSourceType } from '../data/vehicle-loading-sources'
import { createDefaultVehicleLoadingApiPackageDraft } from '../services/vehicle-loading-package-input'

export function useVehicleLoadingState() {
  const initialSummary: ShipmentSummary = {
    boxes: 120,
    totalVolumeM3: 8.4,
    totalWeightKg: 900,
  }

  const [summary, setSummary] = useState<ShipmentSummary>(initialSummary)

  const [source, setSource] = useState<VehicleLoadingSourceType>('manual')
  const [category, setCategory] = useState<VehicleCategory | 'all'>('all')
  const [minVolumeM3, setMinVolumeM3] = useState<string>('')
  const [minPayloadKg, setMinPayloadKg] = useState<string>('')
  const [selectedPackagingProfileId, setSelectedPackagingProfileId] = useState<string>('')
  const [apiPackageDraft, setApiPackageDraft] = useState(() => createDefaultVehicleLoadingApiPackageDraft(initialSummary))

  return {
    summary,
    setSummary,
    source,
    setSource,
    category,
    setCategory,
    minVolumeM3,
    setMinVolumeM3,
    minPayloadKg,
    setMinPayloadKg,
    selectedPackagingProfileId,
    setSelectedPackagingProfileId,
    apiPackageDraft,
    setApiPackageDraft,
  }
}
