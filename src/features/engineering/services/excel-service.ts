import { type Material } from '../../material-archive/data/schema'
import { type BOMItem, type Product } from '../data/schema'
import { generateBOMTemplate, type BOMTemplateDictEntries } from './bom-excel-exporter'
import { parseBOMExcel as parseBOMExcelFile } from './bom-excel-parser'

export const ExcelService = {
  async generateBOMTemplate(materials: Material[], products: Product[], dictEntries: BOMTemplateDictEntries = []) {
    return generateBOMTemplate(materials, products, dictEntries)
  },

  async parseBOMExcel(file: File): Promise<{
    items: Partial<BOMItem>[]
    productId?: string
    materials?: Partial<Material>[]
  }> {
    return parseBOMExcelFile(file)
  },
}
