import type { PrepregFormState } from '../data/prepreg-material-spec-schema'

export type PrepregLabelParsedFields = Partial<PrepregFormState>

function cleanText(rawText: string): string {
  return rawText
    .replace(/\r/g, '\n')
    .replace(/[：]/g, ':')
    .replace(/[㎡]/g, 'm2')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactText(rawText: string): string {
  return rawText
    .replace(/[：]/g, ':')
    .replace(/[㎡]/g, 'm2')
    .replace(/\s+/g, '')
    .trim()
}

function pick(patterns: RegExp[], text: string): string {
  for (const pattern of patterns) {
    const matched = text.match(pattern)
    const value = matched?.[1]?.trim()
    if (value) return value
  }
  return ''
}

function normalizeDate(value: string): string {
  const matched = value.match(/(\d{4})[年./-]?(\d{1,2})[月./-]?(\d{1,2})/)
  if (!matched) return value.trim()

  const [, year, month, day] = matched
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function parsePrepregLabelText(rawText: string): PrepregLabelParsedFields {
  const text = cleanText(rawText)
  const compact = compactText(rawText)
  if (!text && !compact) return {}

  const code = pick([
    /(?:产品编号|產品編號|编号|型號|型号|货号|料号)[:\s]*([A-Za-z0-9][A-Za-z0-9_-]{2,})/i,
    /\b([A-Z]{2,5}-\d{2,4}-\d{1,4})\b/i,
  ], text)

  const name = pick([
    /(?:产品名称|產品名稱|品名|名称)[:\s]*([\u4e00-\u9fa5A-Za-z0-9_-]{2,20})/,
    /(单向碳纱|單向碳紗|预浸料|預浸料|碳纤维预浸料|碳纖維預浸料)/,
  ], text)

  const resinContentPercent = pick([
    /(?:树脂含量|樹脂含量|含胶量|RC)[:\s]*(\d+(?:\.\d+)?)\s*%?/i,
    /(\d+(?:\.\d+)?)\s*%\s*[/／]\s*\d+/,
  ], text)

  const widthMm = pick([
    /(?:幅宽|幅寬|宽度|寬度|门幅)[:\s]*(\d+(?:\.\d+)?)\s*(?:MM|mm|毫米)?/i,
    /\b(\d{3,5})\s*(?:MM|mm)\b/,
  ], text)

  const nominalAreaM2 = pick([
    /(?:面积|面積|标称面积|標稱面積|合卷长度|合卷長度)[:\s]*(\d+(?:\.\d+)?)\s*(?:m2|M2|平方|㎡)?/,
  ], text)

  const supplierBatchNo = pick([
    /(?:生产批次|生產批次|批次|批号|批號)[:\s]*([A-Za-z0-9_-]{4,})/i,
    /\b(\d{8}[A-Za-z]{0,3})\b/,
  ], text)

  const rollNo = pick([
    /(?:卷号|卷號|箱号|箱號|卷\/箱号|卷\/箱號)[:\s]*(\d{1,6})/,
  ], text)

  const productionDate = normalizeDate(pick([
    /(?:生产日期|生產日期|日期)[:\s]*(\d{4}[年./-]?\d{1,2}[月./-]?\d{1,2})/,
  ], compact || text))

  const areaWeightGsm = pick([
    /(?:克重|面密度|FAW)[:\s]*(\d+(?:\.\d+)?(?:\s*[/／]\s*\d+(?:\.\d+)?)?)/i,
    /(?:\d+%)\s*[/／]\s*(\d+(?:\.\d+)?(?:\s*[/／]\s*\d+(?:\.\d+)?)?)/,
  ], text)

  const fields: PrepregLabelParsedFields = {
    code,
    name,
    supplierProductCode: code,
    resinContentPercent,
    widthMm,
    areaWeightGsm,
    nominalAreaM2,
    supplierBatchNo,
    rollNo,
    productionDate,
  }

  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => typeof value === 'string' && value.trim())
  ) as PrepregLabelParsedFields
}
