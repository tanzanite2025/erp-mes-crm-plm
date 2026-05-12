import { type MaterialOption } from '../../material-archive/data/schema'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { bomItemSchema, type Product } from '../data/schema'
import { type BOMItemDraft, type MaterialOptionDraft } from '../mutation-types'
import {
  getDefaultBOMSectionCode,
  normalizeBOMSectionValue,
} from '../utils/bom-section-utils'
import { generateBOMTemplate } from './bom-excel-exporter'
import { parseBOMExcel as parseBOMExcelFile } from './bom-excel-parser'

interface NormalizeParsedBOMExcelItemsParams {
  parsedItems: BOMItemDraft[]
  materials: MaterialOption[]
  sections: BOMSectionOption[]
}

function formatSchemaIssuePath(path: PropertyKey[]) {
  return path.length > 0
    ? path.map((segment) => (typeof segment === 'symbol' ? segment.toString() : String(segment))).join('.')
    : 'row'
}

export const ExcelService = {
  async generateBOMTemplate(
    materials: MaterialOption[],
    products: Product[],
    sections: BOMSectionOption[],
    productDisplayLabelMap: Map<string, string>
  ) {
    return generateBOMTemplate(materials, products, sections, productDisplayLabelMap)
  },

  async parseBOMExcel(file: File, sections: BOMSectionOption[]): Promise<{
    items: BOMItemDraft[]
    productId?: string
    materials?: MaterialOptionDraft[]
  }> {
    return parseBOMExcelFile(file, sections)
  },

  normalizeParsedBOMItems({
    parsedItems,
    materials,
    sections,
  }: NormalizeParsedBOMExcelItemsParams): { items: BOMItemDraft[]; errors: string[] } {
    const defaultSectionCode = getDefaultBOMSectionCode(sections)
    const materialMap = new Map(materials.map((material) => [material.id, material]))
    const normalizedItems: BOMItemDraft[] = []
    const errors: string[] = []

    parsedItems.forEach((item, index) => {
      const hasExplicitUnitPrice = typeof item.unitPrice === 'number' && !Number.isNaN(item.unitPrice)
      const schemaInput: BOMItemDraft = {
        ...item,
        section: normalizeBOMSectionValue(sections, item.section || defaultSectionCode),
      }
      const result = bomItemSchema.safeParse(schemaInput)

      if (!result.success) {
        const fieldErrors = result.error.issues
          .map((issue) => `${formatSchemaIssuePath(issue.path)}: ${issue.message}`)
          .join('; ')

        errors.push(`Row ${index + 2}: ${fieldErrors}`)
        return
      }

      const parsedItem = result.data
      const material = materialMap.get(parsedItem.materialId)
      if (!material) {
        errors.push(`Row ${index + 2}: materialId: Material ${parsedItem.materialId} was not found in current material archive`)
        return
      }

      const normalizedSection = normalizeBOMSectionValue(sections, parsedItem.section || defaultSectionCode)
      const standardUsage = Math.max(0, parsedItem.unitUsage * (1 + parsedItem.wastagePercent / 100))

      normalizedItems.push({
        id: crypto.randomUUID(),
        section: normalizedSection,
        materialId: parsedItem.materialId,
        materialName: material.name,
        materialSpec: material.spec,
        unitPrice: hasExplicitUnitPrice ? parsedItem.unitPrice : material.costPrice ?? parsedItem.unitPrice,
        unit: material.uom || parsedItem.unit,
        unitUsage: parsedItem.unitUsage,
        wastagePercent: parsedItem.wastagePercent,
        standardUsage,
        materialType: parsedItem.materialType,
        supplyChannel: parsedItem.supplyChannel,
      })
    })

    return { items: normalizedItems, errors }
  },
}
