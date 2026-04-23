import type {
  CuttingIssuanceOrder,
  CuttingIssuanceOrderLine,
  CuttingIssuancePreview,
  CuttingIssuanceTemplate,
} from './types'

const MAX_SAFE_BATCH_COUNT = 2000

function normalizeModelKey(value: string | undefined): string {
  return (value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
}

function buildCandidateModelKeys(values: Array<string | undefined>): Set<string> {
  const keys = new Set<string>()
  values.forEach((value) => {
    const normalized = normalizeModelKey(value)
    if (normalized) {
      keys.add(normalized)
    }
  })
  return keys
}

function intersectsModelKeys(left: Set<string>, right: Set<string>): boolean {
  for (const key of left) {
    if (right.has(key)) {
      return true
    }
  }
  return false
}

function parseTemplateTimestamp(raw: string): number {
  const timestamp = new Date(raw).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function isTemplateCompatible(
  line: CuttingIssuanceOrderLine | undefined,
  template: CuttingIssuanceTemplate,
): boolean {
  if (!line) {
    return false
  }
  const lineKeys = buildCandidateModelKeys([line.productModel, line.productCode])
  const templateKeys = buildCandidateModelKeys([template.productModel, template.productCode])
  if (!intersectsModelKeys(lineKeys, templateKeys)) {
    return false
  }
  if (line.holeCount > 0) {
    return template.holeCount === line.holeCount
  }
  return true
}

export function getCompatibleTemplates(
  line: CuttingIssuanceOrderLine | undefined,
  templates: CuttingIssuanceTemplate[],
): CuttingIssuanceTemplate[] {
  return templates
    .filter((template) => isTemplateCompatible(line, template))
    .sort((left, right) => parseTemplateTimestamp(right.updatedAt) - parseTemplateTimestamp(left.updatedAt))
}

export function findTemplateForOrder(
  line: CuttingIssuanceOrderLine | undefined,
  templates: CuttingIssuanceTemplate[],
): CuttingIssuanceTemplate | undefined {
  const compatibleTemplates = getCompatibleTemplates(line, templates)
  return compatibleTemplates[0]
}

export function buildGreedyBatchSplit(totalQuantity: number, preferredBatchSize: number): number[] {
  const normalizedTotal = Number.isFinite(totalQuantity) ? Math.max(0, Math.trunc(totalQuantity)) : 0
  let normalizedBatch = Number.isFinite(preferredBatchSize) ? Math.max(1, Math.trunc(preferredBatchSize)) : 1
  if (normalizedTotal === 0) {
    return []
  }

  // Prevent UI freeze when orders have very large quantities and batch size is too small.
  const estimatedBatchCount = Math.ceil(normalizedTotal / normalizedBatch)
  if (estimatedBatchCount > MAX_SAFE_BATCH_COUNT) {
    normalizedBatch = Math.ceil(normalizedTotal / MAX_SAFE_BATCH_COUNT)
  }

  const batches: number[] = []
  let rest = normalizedTotal
  while (rest > 0) {
    const next = Math.min(rest, normalizedBatch)
    batches.push(next)
    rest -= next
  }
  return batches
}

export function buildCuttingIssuancePreview(
  order: CuttingIssuanceOrder | undefined,
  line: CuttingIssuanceOrderLine | undefined,
  template: CuttingIssuanceTemplate | undefined,
  preferredBatchSize: number,
): CuttingIssuancePreview | undefined {
  if (!order || !line || !template) {
    return undefined
  }

  const batches = buildGreedyBatchSplit(line.quantity, preferredBatchSize).map((rimQuantity, index) => ({
    batchNo: index + 1,
    rimQuantity,
    lineQuantity: rimQuantity * template.lineCountPerRim,
  }))

  return {
    order,
    line,
    template,
    totalRimQuantity: line.quantity,
    totalLineQuantity: line.quantity * template.lineCountPerRim,
    batches,
  }
}
