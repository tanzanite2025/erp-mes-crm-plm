import { useCallback } from 'react'
import { vehicleContactService } from '../services/vehicle-contact-service'
import { type VehicleContactBindingSaveInput } from '../vehicle-contact.types'

export function useVehicleContactActions() {
  const saveBinding = useCallback(
    async (input: VehicleContactBindingSaveInput) => {
      return vehicleContactService.saveBinding(input)
    },
    []
  )

  const deleteBinding = useCallback(async (id: string) => {
    await vehicleContactService.deleteBinding(id)
  }, [])

  return {
    saveBinding,
    deleteBinding,
  }
}
