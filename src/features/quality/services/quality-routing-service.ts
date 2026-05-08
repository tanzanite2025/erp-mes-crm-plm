import { createLogger } from '@/lib/logger'
import { NotificationService } from '@/features/system-mgmt/notifications/notification-service'
import type { Standard } from '../data/schema'
import {
  buildQualityStandardRoutingEvent,
  type QualityStandardRoutingSemanticAction,
} from './quality-standard-routing-event-factory'

const logger = createLogger('QualityRoutingService')

interface DispatchQualityStandardRoutingEventInput {
  standard: Standard
  semanticAction: QualityStandardRoutingSemanticAction
  previousStatus?: Standard['status']
}

export async function dispatchQualityStandardRoutingEvent({
  standard,
  semanticAction,
  previousStatus,
}: DispatchQualityStandardRoutingEventInput) {
  const event = buildQualityStandardRoutingEvent({
    standard,
    semanticAction,
    previousStatus,
  })

  try {
    return await NotificationService.dispatch(event.type, event)
  } catch (error) {
    logger.warn('Failed to dispatch quality standard routing event', {
      semanticAction,
      standardId: standard.id,
      previousStatus,
      nextStatus: standard.status,
      error,
    })
    return null
  }
}
