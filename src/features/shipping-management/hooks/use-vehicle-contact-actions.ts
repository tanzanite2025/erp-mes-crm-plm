import { useCallback } from 'react'
import { type VehicleContactBindingSaveInput } from '../contacts-page.types'
import { vehicleContactService } from '../services/vehicle-contact-service'

export function useVehicleContactActions() {
  const saveBinding = useCallback(
    async (input: VehicleContactBindingSaveInput) => {
      return vehicleContactService.saveBinding(input)
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
