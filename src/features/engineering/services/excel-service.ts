import { type MaterialOption } from '../../material-archive/data/schema'
import { type BOMItem, type Product } from '../data/schema'
import { generateBOMTemplate } from './bom-excel-exporter'
import { parseBOMExcel as parseBOMExcelFile } from './bom-excel-parser'

export const ExcelService = {
  async generateBOMTemplate(materials: MaterialOption[], products: Product[]) {
    return generateBOMTemplate(materials, products)
  },

  async parseBOMExcel(file: File): Promise<{
    items: Partial<BOMItem>[]
    productId?: string
    materials?: Partial<MaterialOption>[]
  }> {
    return parseBOMExcelFile(file)
  },
}
