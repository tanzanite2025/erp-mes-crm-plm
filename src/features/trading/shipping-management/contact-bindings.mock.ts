export type ShippingContactCard = {
  id: string
  supplierName: string
  contactName: string
  phone: string
  channels: string[]
  region: string
  note: string
}

export type ShippingVehicleContactBinding = {
  vehicleId: string
  dispatchAdvice: string
  contacts: ShippingContactCard[]
}

export const SHIPPING_VEHICLE_CONTACT_BINDINGS: ShippingVehicleContactBinding[] = [
  {
    vehicleId: 'van-standard',
    dispatchAdvice: '适合市内短驳与轻小批量送货，优先联系灵活调度的同城司机。',
    contacts: [
      {
        id: 'contact-van-1',
        supplierName: '城配同城车队',
        contactName: '王师傅',
        phone: '138-0000-1201',
        channels: ['电话', '微信'],
        region: '苏州园区 / 昆山',
        note: '可当天响应，适合轻货和急单补发。',
      },
      {
        id: 'contact-van-2',
        supplierName: '迅捷短途物流',
        contactName: '周调度',
        phone: '139-0000-8742',
        channels: ['电话'],
        region: '苏州新区',
        note: '常用于小批量面包车派送，需提前半天预约。',
      },
    ],
  },
  {
    vehicleId: 'box-truck-4m2',
    dispatchAdvice: '适合厢式配送与常规整车发货，可优先联系有固定箱车资源的承运商。',
    contacts: [
      {
        id: 'contact-box-1',
        supplierName: '达远物流',
        contactName: '陈经理',
        phone: '136-0000-4431',
        channels: ['电话', '企业微信'],
        region: '苏州 / 无锡 / 常州',
        note: '4.2 米箱车稳定，可承接常规批量出货。',
      },
    ],
  },
  {
    vehicleId: 'light-truck-6m8',
    dispatchAdvice: '适合跨市中批量发货，优先联系有轻卡与回程车资源的供应商。',
    contacts: [
      {
        id: 'contact-light-1',
        supplierName: '华东专线运输',
        contactName: '刘调度',
        phone: '137-0000-6628',
        channels: ['电话', '微信'],
        region: '江苏 / 浙江',
        note: '6.8 米轻卡较多，适合跨市整票与拼车安排。',
      },
    ],
  },
  {
    vehicleId: 'medium-truck-9m6',
    dispatchAdvice: '适合大批量与中长途干线发货，应优先联系主力干线承运商。',
    contacts: [
      {
        id: 'contact-medium-1',
        supplierName: '乾坤干线物流',
        contactName: '赵总',
        phone: '135-0000-9916',
        channels: ['电话'],
        region: '华东干线 / 全国调车',
        note: '9.6 米中卡调配经验丰富，适合整车排车。',
      },
    ],
  },
]
