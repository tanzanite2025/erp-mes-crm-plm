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
  holePrefix: 'R' | 'D'
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
    rules: LINEAR_BARCODE_RULES_CONFIG.map((rule) => ({
      ...rule,
      examples: [...rule.examples],
    })) as DMRuleSegment[],
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
