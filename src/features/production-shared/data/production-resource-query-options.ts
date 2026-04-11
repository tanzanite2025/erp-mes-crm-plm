import type { UseQueryOptions } from '@tanstack/react-query'
import type { ProductionLine } from './production-line'
import type { ProductionProcessStep } from './production-process'
import { productionResourceQueryKeys } from './production-resource-query-keys'
import { productionLinesService } from '../services/production-lines-service'
import { productionProcessesService } from '../services/production-processes-service'
import { productionMappingsService } from '../services/production-mappings-service'

export const productionResourceQueryOptions = {
  lines: (): UseQueryOptions<ProductionLine[], Error> => ({
    queryKey: productionResourceQueryKeys.lines(),
    queryFn: () => productionLinesService.getLines(),
  }),

  processes: (): UseQueryOptions<ProductionProcessStep[], Error> => ({
    queryKey: productionResourceQueryKeys.processes(),
    queryFn: () => productionProcessesService.getSteps(),
  }),

  mappings: (): UseQueryOptions<Record<string, string[]>, Error> => ({
    queryKey: productionResourceQueryKeys.mappings(),
    queryFn: () => productionMappingsService.getProcessCapabilityMappings(),
  }),
} as const
