import type { Standard, StandardItem } from '../data/schema'
import type {
  ControlledProtocolCriterion,
  ControlledProtocolDraft,
} from '../types/controlled-protocol'

const CONTROLLED_PROTOCOL_STANDARD_TYPE: Standard['type'] = 'FQC'
const CONTROLLED_PROTOCOL_STANDARD_STATUS: Standard['status'] = 'DRAFT'

interface BuildControlledProtocolStandardOptions {
  now?: Date
  codeSuffix?: string
}

function formatDateSegment(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function createRandomCodeSuffix() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8).toUpperCase()
  }

  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

export function buildControlledProtocolInspectionStandardItem(
  criterion: ControlledProtocolCriterion,
  index: number
): StandardItem {
  return {
    id: criterion.id,
    name: criterion.itemName,
    inspectionStageId: criterion.inspectionStageId,
    inspectionStageName: criterion.inspectionStageName,
    order: index + 1,
    centerValue: criterion.targetWeight,
    gradingMode: 'DEVIATION_BANDS',
    levels: criterion.levels,
    unit: criterion.unit,
    isRequired: true,
    remarks: '超出全部等级范围为不合格，处置另行记录。',
  }
}

export function buildControlledProtocolStandard(
  draft: ControlledProtocolDraft,
  options: BuildControlledProtocolStandardOptions = {}
): Partial<Standard> {
  const now = options.now ?? new Date()
  const productId = draft.productId.trim()
  const productName = draft.productName.trim() || productId
  const codeSuffix = options.codeSuffix ?? createRandomCodeSuffix()

  return {
    code: `QCP-${formatDateSegment(now)}-${codeSuffix}`,
    version: 1,
    name: `${productName} 受控品质协议`,
    type: CONTROLLED_PROTOCOL_STANDARD_TYPE,
    status: CONTROLLED_PROTOCOL_STANDARD_STATUS,
    productId,
    productName,
    remarks: `由受控协议创建；关联产品：${productName}（${productId}）。`,
    items: draft.criteria.map(buildControlledProtocolInspectionStandardItem),
  }
}
