import { apiFetch } from '@/lib/api'
import { type VehicleContactRemoteFilters } from '../contact-filters.shared'
import { type VehicleContactBinding, type VehicleContactBindingSaveInput } from '../contacts-page.types'
import { vehicleContactBindingDTOArraySchema, vehicleContactBindingDTOSchema } from './vehicle-contact.schema'

const CONTACTS_ENDPOINT = '/shipping-management/vehicle-contacts'

function createVehicleContactBindingId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `contact-${crypto.randomUUID()}`
  }

  return `contact-${Date.now()}`
}

function parseVehicleContactBinding(value: unknown, context: string): VehicleContactBinding {
  const result = vehicleContactBindingDTOSchema.safeParse(value)
  if (!result.success) {
    throw new Error(`[INVALID_RESPONSE] ${context} ${result.error.message}`)
  }

  return result.data as VehicleContactBinding
}

export function toVehicleContactSaveInput(
  form: {
    vehicleId: string
    supplierName: string
    contactName: string
    channels: VehicleContactBinding['channels']
    region: string
    dispatchAdvice: string
    note: string
    enabled: boolean
  },
  existingId?: string
): VehicleContactBindingSaveInput {
  return {
    id: existingId,
    vehicleId: form.vehicleId,
    supplierName: form.supplierName,
    contactName: form.contactName,
    channels: form.channels,
    region: form.region,
    dispatchAdvice: form.dispatchAdvice,
    note: form.note,
    enabled: form.enabled,
  }
}

export function toVehicleContactToggleInput(binding: VehicleContactBinding, enabled: boolean): VehicleContactBindingSaveInput {
  return {
    id: binding.id,
    vehicleId: binding.vehicleId,
    supplierName: binding.supplierName ?? '',
    contactName: binding.contactName,
    channels: binding.channels,
    region: binding.region ?? '',
    dispatchAdvice: binding.dispatchAdvice ?? '',
    note: binding.note ?? '',
    enabled,
  }
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

  async saveBinding(input: VehicleContactBindingSaveInput): Promise<VehicleContactBinding> {
    const bindingId = input.id?.trim() || createVehicleContactBindingId()
    const response = await apiFetch<unknown>(`${CONTACTS_ENDPOINT}/${bindingId}`, {
      method: 'POST',
      body: JSON.stringify({
        vehicleId: input.vehicleId,
        supplierName: input.supplierName.trim(),
        contactName: input.contactName.trim(),
        channels: input.channels
          .map((channel) => ({ ...channel, value: channel.value.trim() }))
          .filter((channel) => channel.value.length > 0),
        region: input.region.trim(),
        dispatchAdvice: input.dispatchAdvice.trim(),
        note: input.note.trim(),
        enabled: input.enabled,
      }),
    })
    return parseVehicleContactBinding(response, 'vehicleContactService.saveBinding')
  },

  async deleteBinding(id: string): Promise<void> {
    await apiFetch<void>(`${CONTACTS_ENDPOINT}/${id}`, { method: 'DELETE' })
  },
}
