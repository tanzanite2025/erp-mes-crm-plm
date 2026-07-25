export type ShippingContainerCategory =
  | 'dry'
  | 'reefer'
  | 'open-top'
  | 'flat-rack'

export type ShippingContainerDimensionsMm = {
  length: number
  width: number
  height: number
}

export type ShippingContainerDoorOpeningMm = {
  width: number | null
  height: number | null
}

export type ShippingContainerSpec = {
  id: string
  code: string
  isoGroupCode: string
  nameZh: string
  nameEn: string
  category: ShippingContainerCategory
  categoryNameZh: string
  categoryNameEn: string
  externalDimensionsMm: ShippingContainerDimensionsMm
  internalDimensionsMm: ShippingContainerDimensionsMm
  doorOpeningMm: ShippingContainerDoorOpeningMm
  nominalVolumeM3: number | null
  suggestedUsableVolumeM3: number | null
  maxGrossWeightKg: number
  tareWeightKg: number
  maxPayloadKg: number
  typicalUseCasesZh: string[]
  typicalUseCasesEn: string[]
  loadPlanningNotesZh: string
  loadPlanningNotesEn: string
}

/**
 * 物流中心 / 货柜管理域的内置货柜参考规格。
 *
 * 边界：这里用于内部装载初筛，不是承运商最终设备确认源；同名柜型会因船公司、
 * 箱龄、制造批次和航线限制出现尺寸或限重差异，正式订舱仍以承运渠道确认为准。
 */
export const SHIPPING_CONTAINER_SPECS: ShippingContainerSpec[] = [
  {
    id: '20gp-standard-dry',
    code: '20GP',
    isoGroupCode: '22G1',
    nameZh: '20尺标准干货柜',
    nameEn: '20 ft Standard Dry Container',
    category: 'dry',
    categoryNameZh: '标准干货柜',
    categoryNameEn: 'Standard dry',
    externalDimensionsMm: { length: 6058, width: 2438, height: 2591 },
    internalDimensionsMm: { length: 5898, width: 2352, height: 2393 },
    doorOpeningMm: { width: 2340, height: 2280 },
    nominalVolumeM3: 33.2,
    suggestedUsableVolumeM3: 29.8,
    maxGrossWeightKg: 30480,
    tareWeightKg: 2250,
    maxPayloadKg: 28230,
    typicalUseCasesZh: ['小批量整柜', '重货优先', '常规出口拼装'],
    typicalUseCasesEn: ['Small FCL shipments', 'Dense cargo', 'General export'],
    loadPlanningNotesZh:
      '适合重量敏感的常规货物；体积装载建议先按约九成可用容积试算。',
    loadPlanningNotesEn:
      'Good for dense general cargo; plan volume with roughly 90% usable capacity first.',
  },
  {
    id: '40gp-standard-dry',
    code: '40GP',
    isoGroupCode: '42G1',
    nameZh: '40尺标准干货柜',
    nameEn: '40 ft Standard Dry Container',
    category: 'dry',
    categoryNameZh: '标准干货柜',
    categoryNameEn: 'Standard dry',
    externalDimensionsMm: { length: 12192, width: 2438, height: 2591 },
    internalDimensionsMm: { length: 12032, width: 2352, height: 2395 },
    doorOpeningMm: { width: 2340, height: 2292 },
    nominalVolumeM3: 67.7,
    suggestedUsableVolumeM3: 60.9,
    maxGrossWeightKg: 30480,
    tareWeightKg: 3640,
    maxPayloadKg: 26840,
    typicalUseCasesZh: ['大批量常规货', '轻泡货', '较长包装件'],
    typicalUseCasesEn: [
      'Large general shipments',
      'Light cargo',
      'Long packages',
    ],
    loadPlanningNotesZh:
      '长度优势明显，但载重不等于20GP翻倍；重货需先校验单柜限重。',
    loadPlanningNotesEn:
      'Provides length advantage, but payload is not double 20GP; check gross weight first for dense cargo.',
  },
  {
    id: '40hq-high-cube-dry',
    code: '40HQ',
    isoGroupCode: '45G1',
    nameZh: '40尺高柜',
    nameEn: '40 ft High Cube Container',
    category: 'dry',
    categoryNameZh: '高柜',
    categoryNameEn: 'High cube',
    externalDimensionsMm: { length: 12192, width: 2438, height: 2896 },
    internalDimensionsMm: { length: 12032, width: 2350, height: 2700 },
    doorOpeningMm: { width: 2340, height: 2597 },
    nominalVolumeM3: 76.3,
    suggestedUsableVolumeM3: 68.7,
    maxGrossWeightKg: 30480,
    tareWeightKg: 3860,
    maxPayloadKg: 26620,
    typicalUseCasesZh: ['高体积货物', '泡货优先', '较高包装件'],
    typicalUseCasesEn: ['High-volume cargo', 'Bulky cargo', 'Taller packages'],
    loadPlanningNotesZh:
      '高柜优先解决高度与体积，不解决超重；装载前仍需核对货物重心。',
    loadPlanningNotesEn:
      'High cube solves height and volume, not overweight cargo; keep center of gravity in the load plan.',
  },
  {
    id: '45hq-high-cube-dry',
    code: '45HQ',
    isoGroupCode: 'L5G1',
    nameZh: '45尺高柜',
    nameEn: '45 ft High Cube Container',
    category: 'dry',
    categoryNameZh: '高柜',
    categoryNameEn: 'High cube',
    externalDimensionsMm: { length: 13716, width: 2438, height: 2896 },
    internalDimensionsMm: { length: 13556, width: 2352, height: 2700 },
    doorOpeningMm: { width: 2340, height: 2585 },
    nominalVolumeM3: 86,
    suggestedUsableVolumeM3: 77.4,
    maxGrossWeightKg: 32500,
    tareWeightKg: 4800,
    maxPayloadKg: 27700,
    typicalUseCasesZh: ['超长泡货', '高体积轻货', '海外仓大批量补货'],
    typicalUseCasesEn: [
      'Long bulky cargo',
      'High-volume light cargo',
      'Warehouse replenishment',
    ],
    loadPlanningNotesZh:
      '不是所有航线都稳定提供45HQ；下单前需和承运渠道确认可用性。',
    loadPlanningNotesEn:
      '45HQ availability is route-dependent; confirm equipment availability with the carrier before booking.',
  },
  {
    id: '20rf-reefer',
    code: '20RF',
    isoGroupCode: '22R1',
    nameZh: '20尺冷藏柜',
    nameEn: '20 ft Reefer Container',
    category: 'reefer',
    categoryNameZh: '冷藏柜',
    categoryNameEn: 'Reefer',
    externalDimensionsMm: { length: 6058, width: 2438, height: 2591 },
    internalDimensionsMm: { length: 5456, width: 2290, height: 2262 },
    doorOpeningMm: { width: 2290, height: 2260 },
    nominalVolumeM3: 28.3,
    suggestedUsableVolumeM3: 24,
    maxGrossWeightKg: 30480,
    tareWeightKg: 3050,
    maxPayloadKg: 27430,
    typicalUseCasesZh: ['温控货物', '样品冷链', '小批量冷藏出口'],
    typicalUseCasesEn: [
      'Temperature-controlled cargo',
      'Cold-chain samples',
      'Small reefer export',
    ],
    loadPlanningNotesZh:
      '冷机占用内部空间；需要预留风道，不能只按几何体积装满。',
    loadPlanningNotesEn:
      'The refrigeration unit reduces space; keep airflow channels instead of filling the full geometric volume.',
  },
  {
    id: '40rh-high-cube-reefer',
    code: '40RH',
    isoGroupCode: '45R1',
    nameZh: '40尺高冷柜',
    nameEn: '40 ft High Cube Reefer Container',
    category: 'reefer',
    categoryNameZh: '冷藏高柜',
    categoryNameEn: 'High cube reefer',
    externalDimensionsMm: { length: 12192, width: 2438, height: 2896 },
    internalDimensionsMm: { length: 11590, width: 2294, height: 2554 },
    doorOpeningMm: { width: 2290, height: 2569 },
    nominalVolumeM3: 67.9,
    suggestedUsableVolumeM3: 57.7,
    maxGrossWeightKg: 34000,
    tareWeightKg: 4550,
    maxPayloadKg: 29450,
    typicalUseCasesZh: ['大批量温控货', '冷冻品', '高体积冷链'],
    typicalUseCasesEn: [
      'Large reefer shipments',
      'Frozen cargo',
      'High-volume cold chain',
    ],
    loadPlanningNotesZh:
      '冷藏高柜需要同时校验温区、通风、托盘高度和承运渠道限重。',
    loadPlanningNotesEn:
      'Validate temperature range, airflow, pallet height, and carrier weight limits together.',
  },
  {
    id: '20ot-open-top',
    code: '20OT',
    isoGroupCode: '22U1',
    nameZh: '20尺开顶柜',
    nameEn: '20 ft Open Top Container',
    category: 'open-top',
    categoryNameZh: '开顶柜',
    categoryNameEn: 'Open top',
    externalDimensionsMm: { length: 6058, width: 2438, height: 2591 },
    internalDimensionsMm: { length: 5898, width: 2352, height: 2352 },
    doorOpeningMm: { width: 2340, height: 2280 },
    nominalVolumeM3: 32.6,
    suggestedUsableVolumeM3: 29.3,
    maxGrossWeightKg: 30480,
    tareWeightKg: 2350,
    maxPayloadKg: 28130,
    typicalUseCasesZh: ['顶部吊装', '超高但可绑扎货物', '设备件'],
    typicalUseCasesEn: [
      'Top loading',
      'Over-height lashable cargo',
      'Equipment parts',
    ],
    loadPlanningNotesZh:
      '适合吊装进入；超高货物需要提前确认绑扎、篷布和港口操作限制。',
    loadPlanningNotesEn:
      'Useful for top loading; confirm lashing, tarpaulin, and terminal handling limits for over-height cargo.',
  },
  {
    id: '40ot-open-top',
    code: '40OT',
    isoGroupCode: '42U1',
    nameZh: '40尺开顶柜',
    nameEn: '40 ft Open Top Container',
    category: 'open-top',
    categoryNameZh: '开顶柜',
    categoryNameEn: 'Open top',
    externalDimensionsMm: { length: 12192, width: 2438, height: 2591 },
    internalDimensionsMm: { length: 12032, width: 2352, height: 2348 },
    doorOpeningMm: { width: 2340, height: 2280 },
    nominalVolumeM3: 66.4,
    suggestedUsableVolumeM3: 59.8,
    maxGrossWeightKg: 30480,
    tareWeightKg: 3850,
    maxPayloadKg: 26630,
    typicalUseCasesZh: ['长件吊装', '设备出口', '顶部装卸货物'],
    typicalUseCasesEn: [
      'Long top-loaded cargo',
      'Equipment export',
      'Top-handled cargo',
    ],
    loadPlanningNotesZh:
      '长件装载前要核对内长、吊点位置、绑扎方式和最终港操作能力。',
    loadPlanningNotesEn:
      'Check internal length, lifting points, lashing plan, and destination handling capability before loading.',
  },
  {
    id: '20fr-flat-rack',
    code: '20FR',
    isoGroupCode: '22P3',
    nameZh: '20尺框架柜',
    nameEn: '20 ft Flat Rack Container',
    category: 'flat-rack',
    categoryNameZh: '框架柜',
    categoryNameEn: 'Flat rack',
    externalDimensionsMm: { length: 6058, width: 2438, height: 2591 },
    internalDimensionsMm: { length: 5660, width: 2200, height: 2210 },
    doorOpeningMm: { width: null, height: null },
    nominalVolumeM3: null,
    suggestedUsableVolumeM3: null,
    maxGrossWeightKg: 34000,
    tareWeightKg: 2740,
    maxPayloadKg: 31260,
    typicalUseCasesZh: ['超宽货物', '重型设备', '无法入箱的异形件'],
    typicalUseCasesEn: [
      'Over-width cargo',
      'Heavy equipment',
      'Out-of-gauge cargo',
    ],
    loadPlanningNotesZh:
      '框架柜不是封闭容积概念；应按底板、绑扎点、超限尺寸和吊装方案计算。',
    loadPlanningNotesEn:
      'Flat racks are not enclosed-volume equipment; plan by floor, lashing points, out-of-gauge dimensions, and lifting method.',
  },
  {
    id: '40fr-flat-rack',
    code: '40FR',
    isoGroupCode: '45P3',
    nameZh: '40尺框架柜',
    nameEn: '40 ft Flat Rack Container',
    category: 'flat-rack',
    categoryNameZh: '框架柜',
    categoryNameEn: 'Flat rack',
    externalDimensionsMm: { length: 12192, width: 2438, height: 2591 },
    internalDimensionsMm: { length: 11652, width: 2245, height: 2265 },
    doorOpeningMm: { width: null, height: null },
    nominalVolumeM3: null,
    suggestedUsableVolumeM3: null,
    maxGrossWeightKg: 55000,
    tareWeightKg: 5900,
    maxPayloadKg: 49100,
    typicalUseCasesZh: ['大型设备', '超长超宽货', '工程项目货'],
    typicalUseCasesEn: [
      'Large machinery',
      'Long and wide cargo',
      'Project cargo',
    ],
    loadPlanningNotesZh:
      '承载能力与船公司设备、航线和港口限制强相关；只能作为内部初筛规格。',
    loadPlanningNotesEn:
      'Capacity depends heavily on carrier equipment, route, and port limits; use this only for internal pre-screening.',
  },
]

export function calculateShippingContainerInternalVolumeM3(
  dimensions: ShippingContainerDimensionsMm
): number {
  const cubicMeters =
    (dimensions.length / 1000) *
    (dimensions.width / 1000) *
    (dimensions.height / 1000)

  return Math.round(cubicMeters * 10) / 10
}

export function calculateShippingContainerUsableVolumeRate(
  spec: ShippingContainerSpec
): number | null {
  if (!spec.nominalVolumeM3 || !spec.suggestedUsableVolumeM3) {
    return null
  }

  return Math.round((spec.suggestedUsableVolumeM3 / spec.nominalVolumeM3) * 100)
}

export function findLargestUsableVolumeShippingContainerSpec(
  specs: ShippingContainerSpec[]
): ShippingContainerSpec | null {
  return specs.reduce<ShippingContainerSpec | null>((largestSpec, spec) => {
    if (!spec.suggestedUsableVolumeM3) {
      return largestSpec
    }

    if (
      !largestSpec ||
      !largestSpec.suggestedUsableVolumeM3 ||
      spec.suggestedUsableVolumeM3 > largestSpec.suggestedUsableVolumeM3
    ) {
      return spec
    }

    return largestSpec
  }, null)
}

export function findLargestPayloadShippingContainerSpec(
  specs: ShippingContainerSpec[]
): ShippingContainerSpec | null {
  return specs.reduce<ShippingContainerSpec | null>((largestSpec, spec) => {
    if (!largestSpec || spec.maxPayloadKg > largestSpec.maxPayloadKg) {
      return spec
    }

    return largestSpec
  }, null)
}
