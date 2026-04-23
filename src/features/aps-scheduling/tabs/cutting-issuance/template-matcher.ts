import type { CuttingIssuanceOrderLine, CuttingIssuanceTemplate } from './types'

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
    .sort(
      (left, right) => parseTemplateTimestamp(right.updatedAt) - parseTemplateTimestamp(left.updatedAt),
    )
}

export function findTemplateForOrder(
  line: CuttingIssuanceOrderLine | undefined,
  templates: CuttingIssuanceTemplate[],
): CuttingIssuanceTemplate | undefined {
  const compatibleTemplates = getCompatibleTemplates(line, templates)
  return compatibleTemplates[0]
}
