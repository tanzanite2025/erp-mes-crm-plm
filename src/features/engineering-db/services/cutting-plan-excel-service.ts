import { type CuttingPlanInput } from '../data/cutting-plan-schema'
import { exportCuttingPlanPrintWorkbook, generateCuttingPlanImportTemplate } from './cutting-plan-excel-exporter'
import { parseCuttingPlanImportExcel } from './cutting-plan-excel-parser'

export const CuttingPlanExcelService = {
  async generateImportTemplate() {
    return generateCuttingPlanImportTemplate()
  },

  async parseImportFile(file: File): Promise<CuttingPlanInput> {
    return parseCuttingPlanImportExcel(file)
  },

  async exportPrint(plan: CuttingPlanInput) {
    return exportCuttingPlanPrintWorkbook(plan)
  },
}
