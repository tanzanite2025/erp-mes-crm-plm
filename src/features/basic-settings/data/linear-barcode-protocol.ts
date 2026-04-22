import {
  DEFAULT_LINEAR_BARCODE_SAMPLE,
  LINEAR_BARCODE_RULES_CONFIG,
  LINEAR_BARCODE_SEQUENCE_RULE_KEY,
  type DMRuleSegment,
} from './linear-barcode-rules-config'

export interface LinearBarcodeMockInputs {
  year: string
  month: string
  day: string
  model: string
  appearance: string
  holePrefix: string
  holes: string
  serial: string
  isDrainHole: boolean
  wheelType: string
  scopeCode: string
}

export interface LinearBarcodeIngestDefaults {
  symbology: string
  scene: string
  deviceId: string
  scannedQty: number
  autoSubmit: boolean
}

export interface LinearBarcodeProtocolConfig {
  version: string
  sequenceRuleKey: string
  rules: DMRuleSegment[]
  mockInput: LinearBarcodeMockInputs
  ingestDefaults: LinearBarcodeIngestDefaults
}

function cloneRule(rule: DMRuleSegment): DMRuleSegment {
  return {
    ...rule,
    examples: [...rule.examples],
  }
}

function isLegacyCombinedHoleRule(rule: DMRuleSegment) {
  return rule.id === 'holes' && (rule.range === '09-11' || rule.length === 3)
}

export function shouldNormalizeLinearBarcodeRules(rules: DMRuleSegment[] | null | undefined) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return false
  }

  if (rules.some(isLegacyCombinedHoleRule)) {
    return true
  }

  const holePrefixRule = rules.find((rule) => rule.id === 'holePrefix')
  const holeCountRule = rules.find((rule) => rule.id === 'holes')

  if (!holePrefixRule || !holeCountRule) {
    return true
  }

  return holePrefixRule.range !== '09'
    || holePrefixRule.length !== 1
    || holeCountRule.range !== '10-11'
    || holeCountRule.length !== 2
}

export function createDefaultLinearBarcodeRules(): DMRuleSegment[] {
  return LINEAR_BARCODE_RULES_CONFIG.map((rule) => cloneRule(rule))
}

export function normalizeLinearBarcodeRules(rules: DMRuleSegment[] | null | undefined): DMRuleSegment[] {
  const defaultRules = createDefaultLinearBarcodeRules()

  if (!Array.isArray(rules) || rules.length === 0) {
    return defaultRules
  }

  const incomingById = new Map(rules.map((rule) => [rule.id, rule]))
  const legacyCombinedHoleRule = rules.find(isLegacyCombinedHoleRule)

  return defaultRules.map((defaultRule) => {
    const incomingRule = incomingById.get(defaultRule.id)

    if (defaultRule.id === 'holePrefix' && !incomingRule) {
      return cloneRule(defaultRule)
    }

    if (defaultRule.id === 'holes' && legacyCombinedHoleRule) {
      return cloneRule(defaultRule)
    }

    if (!incomingRule) {
      return cloneRule(defaultRule)
    }

    return {
      ...defaultRule,
      ...incomingRule,
      examples: Array.isArray(incomingRule.examples) ? [...incomingRule.examples] : [...defaultRule.examples],
    }
  })
}

export function normalizeLinearBarcodeProtocolConfig(config: LinearBarcodeProtocolConfig): LinearBarcodeProtocolConfig {
  return {
    ...config,
    rules: normalizeLinearBarcodeRules(config.rules),
  }
}

export const MONTH_OPTIONS = [
  { label: '1月', value: '1' },
  { label: '2月', value: '2' },
  { label: '3月', value: '3' },
  { label: '4月', value: '4' },
  { label: '5月', value: '5' },
  { label: '6月', value: '6' },
  { label: '7月', value: '7' },
  { label: '8月', value: '8' },
  { label: '9月', value: '9' },
  { label: '10月(0)', value: '0' },
  { label: '11月(N)', value: 'N' },
  { label: '12月(D)', value: 'D' },
]

export const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => {
  const value = String(index + 1).padStart(2, '0')
  return { label: value, value }
})

export function formatLinearBarcodeMonthValue(date: Date) {
  const month = date.getMonth() + 1
  if (month <= 9) return String(month)
  if (month === 10) return '0'
  if (month === 11) return 'N'
  return 'D'
}

export function createDefaultLinearBarcodeMockInputs(date: Date = new Date()): LinearBarcodeMockInputs {
  return {
    year: date.getFullYear().toString().slice(-2),
    month: formatLinearBarcodeMonthValue(date),
    day: String(date.getDate()).padStart(2, '0'),
    model: '01',
    appearance: '1',
    holePrefix: 'R',
    holes: '14',
    serial: DEFAULT_LINEAR_BARCODE_SAMPLE.slice(-4),
    isDrainHole: false,
    wheelType: 'H',
    scopeCode: '',
  }
}

export function createDefaultLinearBarcodeProtocolConfig(): LinearBarcodeProtocolConfig {
  return {
    version: '1',
    sequenceRuleKey: LINEAR_BARCODE_SEQUENCE_RULE_KEY,
    rules: createDefaultLinearBarcodeRules() as DMRuleSegment[],
    mockInput: createDefaultLinearBarcodeMockInputs(),
    ingestDefaults: {
      symbology: 'code128',
      scene: 'general',
      deviceId: 'PDA-01',
      scannedQty: 1,
      autoSubmit: false,
    },
  }
}
