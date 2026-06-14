export interface ParsedLinearBarcodeResult {
  isValid: boolean
  error?: string
  segments: {
    year: string
    month: string
    day: string
    model: string
    appearance: string
    holePrefix: string
    holes: string
    serial: string
  }
  display: {
    fullDescription: string
    scannableText: string
    shortTag: string
  }
}

const MONTH_MAP: Record<string, string> = {
  '1': '1月',
  '2': '2月',
  '3': '3月',
  '4': '4月',
  '5': '5月',
  '6': '6月',
  '7': '7月',
  '8': '8月',
  '9': '9月',
  '0': '10月',
  N: '11月',
  D: '12月',
}

export function parseLinearBarcodeCode(
  code: string,
  options?: {
    appearanceMapping?: Record<string, { label?: string }>
    products?: Array<{ modelCode?: string; name?: string }>
    holeCodeCombinationLabels?: Record<string, string>
  }
): ParsedLinearBarcodeResult {
  if (!code || code.length !== 15) {
    return {
      isValid: false,
      error: '一维码编码长度必须为 15 位。',
      segments: {
        year: '',
        month: '',
        day: '',
        model: '',
        appearance: '',
        holePrefix: '',
        holes: '',
        serial: '',
      },
      display: {
        fullDescription: '无效编码',
        scannableText: 'INVALID',
        shortTag: 'ERROR',
      },
    }
  }

  const raw = {
    year: code.slice(0, 2),
    month: code.slice(2, 3),
    day: code.slice(3, 5),
    model: code.slice(5, 7),
    appearance: code.slice(7, 8),
    holePrefix: code.slice(8, 9),
    holes: code.slice(9, 11),
    serial: code.slice(11, 15),
  }

  const monthDisplay = MONTH_MAP[raw.month] || '未知月份'
  const holeCode = `${raw.holePrefix}${raw.holes}`
  const holeLabel = options?.holeCodeCombinationLabels?.[holeCode] || holeCode
  const appearanceDisplay =
    options?.appearanceMapping?.[raw.appearance]?.label ||
    `外观${raw.appearance}`
  const modelDisplay =
    options?.products?.find((product) => product.modelCode === raw.model)
      ?.name || `型号${raw.model}`

  const fullDescription = `20${raw.year}年${monthDisplay}${raw.day}日 · ${modelDisplay} · ${appearanceDisplay} · ${holeLabel} · 流水号:${raw.serial}`
  const shortTag = `${raw.holePrefix}${raw.holes}-${appearanceDisplay}`

  return {
    isValid: true,
    segments: raw,
    display: {
      fullDescription,
      scannableText: code,
      shortTag,
    },
  }
}
