import { useMemo, useState } from 'react'
import { createDefaultVehicleContactUiFilters, type VehicleContactUiFilters } from '../contact-filters.shared'
import { type VehicleContactBinding, type VehicleCategory } from '../contacts-page.types'

const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  van: '面包车',
  boxTruck: '厢式货车',
  lightTruck: '轻卡',
  mediumTruck: '中卡',
}

function buildSearchText(item: VehicleContactBinding): string {
  return [
    item.vehicleName,
    item.contactName,
    item.supplierName,
    item.region,
    item.note,
    item.dispatchAdvice,
    item.channels.map((channel) => channel.value).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function filterVehicleContactBindings(
  bindings: VehicleContactBinding[],
  uiFilters: VehicleContactUiFilters
): VehicleContactBinding[] {
  const keyword = uiFilters.keyword.trim().toLowerCase()

  return bindings.filter((item) => {
    if (uiFilters.category !== 'all' && item.category !== uiFilters.category) return false
    if (uiFilters.vehicleId !== 'all' && item.vehicleId !== uiFilters.vehicleId) return false

    if (uiFilters.enabled !== 'all') {
      const expectedEnabled = uiFilters.enabled === 'enabled'
      if (item.enabled !== expectedEnabled) return false
    }

    if (keyword && !buildSearchText(item).includes(keyword)) return false

    return true
  })
}

export function useVehicleContactUiFilters(bindings: VehicleContactBinding[]) {
  const [uiFilters, setUiFilters] = useState<VehicleContactUiFilters>(createDefaultVehicleContactUiFilters())

  const filteredBindings = useMemo(() => filterVehicleContactBindings(bindings, uiFilters), [bindings, uiFilters])

  const categoryLabels = CATEGORY_LABELS

  return {
    uiFilters,
    setUiFilters,
    filteredBindings,
    categoryLabels,
  }
}
