import { type CuttingPlanInput } from '../data/cutting-plan-schema'
import type { CutSizeUnit } from '@/features/raw-materials/cut-size-library/data/cut-size-library-schema'
import { exportCuttingPlanPrintWorkbook, generateCuttingPlanImportTemplate } from './cutting-plan-excel-exporter'
import { parseCuttingPlanImportExcel } from './cutting-plan-excel-parser'

export const CuttingPlanExcelService = {
  async generateImportTemplate() {
    return generateCuttingPlanImportTemplate()
  },

  async parseImportFile(file: File, cutSizeUnits: CutSizeUnit[]): Promise<CuttingPlanInput> {
    return parseCuttingPlanImportExcel(file, cutSizeUnits)
  },

  async exportPrint(plan: CuttingPlanInput) {
    return exportCuttingPlanPrintWorkbook(plan)
  },
}
