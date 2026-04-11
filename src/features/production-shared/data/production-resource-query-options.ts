import type { UseQueryOptions } from '@tanstack/react-query'
import type { ProductionLine } from './production-line'
import type { ProductionProcessStep } from './production-process'
import { productionResourceQueryKeys } from './production-resource-query-keys'
import { productionLinesService } from '../services/production-lines-service'
import { productionProcessesService } from '../services/production-processes-service'

export const productionResourceQueryOptions = {
  lines: (): UseQueryOptions<ProductionLine[], Error> => ({
    queryKey: productionResourceQueryKeys.lines(),
    queryFn: () => productionLinesService.getLines(),
  }),

  processes: (): UseQueryOptions<ProductionProcessStep[], Error> => ({
    queryKey: productionResourceQueryKeys.processes(),
    queryFn: () => productionProcessesService.getSteps(),
  }),
} as const
