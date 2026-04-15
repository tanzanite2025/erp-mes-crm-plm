import { useCallback } from 'react'
import { type VehicleContactBinding } from '../contacts-page.types'
import { vehicleContactService } from '../services/vehicle-contact-service'

export function useVehicleContactActions() {
  const saveBinding = useCallback(
    async (item: VehicleContactBinding) => {
      return vehicleContactService.saveBinding(item)
    },
    []
  )

  const deleteBinding = useCallback(
    async (id: string) => {
      await vehicleContactService.deleteBinding(id)
    },
    []
  )

  return {
    saveBinding,
    deleteBinding,
  }
}
