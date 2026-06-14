import { productionLinesService } from './production-lines-service'
import { productionProcessesService } from './production-processes-service'
import {
  PRODUCTION_LINES_UPDATED_EVENT,
  PRODUCTION_PROCESSES_UPDATED_EVENT,
} from './production-resource-sync'

export { PRODUCTION_LINES_UPDATED_EVENT, PRODUCTION_PROCESSES_UPDATED_EVENT }

export const productionResourceService = {
  getLines: productionLinesService.getLines,
  saveLine: productionLinesService.saveLine,
  patchLine: productionLinesService.patchLine,
  deleteLine: productionLinesService.deleteLine,
  getSteps: productionProcessesService.getSteps,
  saveStep: productionProcessesService.saveStep,
  deleteStep: productionProcessesService.deleteStep,
}
