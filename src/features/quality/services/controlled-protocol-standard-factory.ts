import type { Standard, StandardItem, LevelConfig } from '../data/schema'
import type {
  ControlledProtocolCriterion,
  ControlledProtocolDraft,
} from '../types/controlled-protocol'

const CONTROLLED_PROTOCOL_STANDARD_TYPE: Standard['type'] = 'FQC'
const CONTROLLED_PROTOCOL_STANDARD_STATUS: Standard['status'] = 'DRAFT'
const CONTROLLED_PROTOCOL_ERROR_CODE_LOWER = 'CONTROLLED_PROTOCOL_SCRAP_BELOW'
const CONTROLLED_PROTOCOL_ERROR_CODE_UPPER = 'CONTROLLED_PROTOCOL_SCRAP_ABOVE'

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

function hasNumber(value?: number) {
  return typeof value === 'number' && Number.isFinite(value)
}

function buildQualifiedLevel(
  criterion: ControlledProtocolCriterion
): LevelConfig {
  return {
    level: 'A',
    min: hasNumber(criterion.qualifiedMin) ? criterion.qualifiedMin : undefined,
    max: hasNumber(criterion.qualifiedMax) ? criterion.qualifiedMax : undefined,
  }
}

function buildScrapLevel(
  criterion: ControlledProtocolCriterion
): LevelConfig | null {
  const hasScrapBelow = hasNumber(criterion.scrapBelow)
  const hasScrapAbove = hasNumber(criterion.scrapAbove)

  if (!hasScrapBelow && !hasScrapAbove) {
    return null
  }

  return {
    level: 'S',
    min: hasScrapBelow ? criterion.scrapBelow : undefined,
    max: hasScrapAbove ? criterion.scrapAbove : undefined,
    errorCodeLower: hasScrapBelow
      ? CONTROLLED_PROTOCOL_ERROR_CODE_LOWER
      : undefined,
    errorCodeUpper: hasScrapAbove
      ? CONTROLLED_PROTOCOL_ERROR_CODE_UPPER
      : undefined,
  }
}

function buildCriterionRemarks(criterion: ControlledProtocolCriterion) {
  const fragments: string[] = []

  if (hasNumber(criterion.qualifiedMin) || hasNumber(criterion.qualifiedMax)) {
    fragments.push(
      `合格范围：${criterion.qualifiedMin ?? '-'} ~ ${
        criterion.qualifiedMax ?? '-'
      }${criterion.unit}`
    )
  }

  if (hasNumber(criterion.scrapBelow)) {
    fragments.push(`低于 ${criterion.scrapBelow}${criterion.unit} 判定报废`)
  }

  if (hasNumber(criterion.scrapAbove)) {
    fragments.push(`高于 ${criterion.scrapAbove}${criterion.unit} 判定报废`)
  }

  return fragments.join('；')
}

function buildStandardItem(
  criterion: ControlledProtocolCriterion,
  index: number
): StandardItem {
  const scrapLevel = buildScrapLevel(criterion)

  return {
    id: criterion.id,
    name: criterion.itemName,
    order: index + 1,
    centerValue: criterion.targetWeight,
    levels: [
      buildQualifiedLevel(criterion),
      ...(scrapLevel ? [scrapLevel] : []),
    ],
    unit: criterion.unit,
    isRequired: true,
    remarks: buildCriterionRemarks(criterion),
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
    items: draft.criteria.map(buildStandardItem),
  }
}
