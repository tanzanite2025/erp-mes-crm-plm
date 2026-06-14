import type { ProductionProcessStep } from '@/features/production-shared/data/production-process'
import { productionProcessesService } from '@/features/production-shared/services/production-processes-service'

export type ProcessStep = ProductionProcessStep

export async function getStoredProcesses(): Promise<ProcessStep[]> {
  return productionProcessesService.getSteps()
}
