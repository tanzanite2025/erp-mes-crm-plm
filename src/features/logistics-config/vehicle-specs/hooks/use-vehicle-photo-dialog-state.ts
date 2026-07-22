import { useMemo, useState } from 'react'
import type { VehicleSpec } from '../data/vehicle-specs.types'

export function useVehiclePhotoDialogState() {
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSpec | null>(
    null
  )

  const selectedPhotoEntry = useMemo(
    () => selectedVehicle?.photoEntry ?? null,
    [selectedVehicle]
  )

  const openVehiclePhotos = (vehicle: VehicleSpec) => {
    setSelectedVehicle(vehicle)
    setPhotoDialogOpen(true)
  }

  return {
    photoDialogOpen,
    setPhotoDialogOpen,
    selectedVehicle,
    selectedPhotoEntry,
    openVehiclePhotos,
  }
}
