import { apiFetch } from '@/lib/api'
import { type VehicleContactRemoteFilters } from '../contact-filters.shared'
import { type VehicleContactBinding } from '../contacts-page.types'
import { vehicleContactBindingDTOArraySchema, vehicleContactBindingDTOSchema } from './vehicle-contact.schema'

const CONTACTS_ENDPOINT = '/shipping-management/vehicle-contacts'

function parseVehicleContactBinding(value: unknown, context: string): VehicleContactBinding {
  const result = vehicleContactBindingDTOSchema.safeParse(value)
  if (!result.success) {
    throw new Error(`[INVALID_RESPONSE] ${context} ${result.error.message}`)
  }

  return result.data as VehicleContactBinding
}

export const vehicleContactService = {
  async listBindings(filters: VehicleContactRemoteFilters): Promise<VehicleContactBinding[]> {
    const response = await apiFetch<unknown>(CONTACTS_ENDPOINT, { params: filters })
    const result = vehicleContactBindingDTOArraySchema.safeParse(response)
    if (!result.success) {
      throw new Error(`[INVALID_RESPONSE] vehicleContactService.listBindings ${result.error.message}`)
    }

    return result.data as VehicleContactBinding[]
  },

  async saveBinding(binding: VehicleContactBinding): Promise<VehicleContactBinding> {
    const response = await apiFetch<unknown>(`${CONTACTS_ENDPOINT}/${binding.id}`, {
      method: 'POST',
      body: JSON.stringify(binding),
    })
    return parseVehicleContactBinding(response, 'vehicleContactService.saveBinding')
  },

  async deleteBinding(id: string): Promise<void> {
    await apiFetch<void>(`${CONTACTS_ENDPOINT}/${id}`, { method: 'DELETE' })
  },
}
