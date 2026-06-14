export type VehicleCategory = 'van' | 'boxTruck' | 'lightTruck' | 'mediumTruck'

export type ContactChannelType =
  | 'phone'
  | 'wechat'
  | 'email'
  | 'whatsapp'
  | 'other'

export type ContactChannel = {
  type: ContactChannelType
  value: string
  primary?: boolean
}

export type VehicleContactBinding = {
  id: string
  vehicleId: string
  vehicleName: string
  category: VehicleCategory
  supplierName?: string
  contactName: string
  channels: ContactChannel[]
  region?: string
  dispatchAdvice?: string
  note?: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type VehicleContactBindingForm = {
  vehicleId: string
  supplierName: string
  contactName: string
  primaryPhone: string
  channels: ContactChannel[]
  region: string
  dispatchAdvice: string
  note: string
  enabled: boolean
}

export type VehicleContactBindingSaveInput = {
  id?: string
  vehicleId: string
  supplierName: string
  contactName: string
  channels: ContactChannel[]
  region: string
  dispatchAdvice: string
  note: string
  enabled: boolean
}
