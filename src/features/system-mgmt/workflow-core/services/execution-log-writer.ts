import { createLogger } from '@/lib/logger'
import { RoutingService } from './routing-service'

const logger = createLogger('RuleExecutionLogWriter')

export function recordExecutionLog(
  payload: Parameters<typeof RoutingService.recordExecutionLog>[0]
) {
  void RoutingService.recordExecutionLog(payload).catch((error) => {
    logger.warn('Failed to persist rule execution log', { payload, error })
  })
}
