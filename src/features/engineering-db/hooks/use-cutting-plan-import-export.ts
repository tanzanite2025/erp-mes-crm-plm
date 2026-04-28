import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import type { CutSizeUnit } from '@/features/raw-materials/cut-size-library/data/cut-size-library-schema'
import { type CuttingPlanInput } from '../data/cutting-plan-schema'
import { CuttingPlanExcelService } from '../services/cutting-plan-excel-service'
import { openCuttingPlanPrintPreview } from '../services/cutting-plan-print-preview'

const logger = createLogger('useCuttingPlanImportExport')

export function useCuttingPlanImportExport() {
  const downloadTemplate = async () => {
    const loadingId = toast.loading('正在生成裁纱导入模板...')
    try {
      await CuttingPlanExcelService.generateImportTemplate()
      toast.success('裁纱导入模板已下载', { id: loadingId })
    } catch (error) {
      logger.error('downloadTemplate failed', error)
      toast.error('裁纱导入模板下载失败', { id: loadingId })
    }
  }

  const parseExcel = async (file: File, cutSizeUnits: CutSizeUnit[]): Promise<CuttingPlanInput | null> => {
    const loadingId = toast.loading('正在解析裁纱模板...')
    try {
      const parsed = await CuttingPlanExcelService.parseImportFile(file, cutSizeUnits)
      toast.success(`导入成功，共 ${parsed.lines.length} 条裁片`, { id: loadingId })
      return parsed
    } catch (error) {
      logger.error('parseExcel failed', error)
      const message = error instanceof Error ? error.message : '裁纱导入失败'
      toast.error(message, { id: loadingId })
      return null
    }
  }

  const exportPrint = async (plan: CuttingPlanInput) => {
    const loadingId = toast.loading('正在导出裁纱打印版...')
    try {
      await CuttingPlanExcelService.exportPrint(plan)
      toast.success('裁纱打印版已导出', { id: loadingId })
    } catch (error) {
      logger.error('exportPrint failed', error)
      toast.error('裁纱打印版导出失败', { id: loadingId })
    }
  }

  const previewPrint = async (plan: CuttingPlanInput) => {
    try {
      openCuttingPlanPrintPreview(plan)
      toast.success('已打开打印预览，可直接打印或另存 PDF')
    } catch (error) {
      logger.error('previewPrint failed', error)
      toast.error(error instanceof Error ? error.message : '打开打印预览失败')
    }
  }

  return {
    downloadTemplate,
    parseExcel,
    exportPrint,
    previewPrint,
  }
}
