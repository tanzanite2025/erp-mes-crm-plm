import { type MaterialOption } from '../../material-archive/data/schema'
import { type Product } from '../data/schema'
import { type BOMItemDraft, type MaterialOptionDraft } from '../mutation-types'
import { generateBOMTemplate } from './bom-excel-exporter'
import { parseBOMExcel as parseBOMExcelFile } from './bom-excel-parser'

export const ExcelService = {
  async generateBOMTemplate(materials: MaterialOption[], products: Product[]) {
    return generateBOMTemplate(materials, products)
  },

  async parseBOMExcel(file: File): Promise<{
    items: BOMItemDraft[]
    productId?: string
    materials?: MaterialOptionDraft[]
  }> {
    return parseBOMExcelFile(file)
  },
}
