import { useNotificationStore } from './notification-store'
import { type NotificationState, type SystemMessage } from './types'

type NotificationMessageInput = Parameters<NotificationState['addMessage']>[0]
type NotificationPredicate = (message: SystemMessage) => boolean
type NotificationMetadata = Record<string, unknown>

function getStateSnapshot(): NotificationState {
  return useNotificationStore.getState()
}

function getMetadataRecord(metadata: SystemMessage['metadata'] | undefined): NotificationMetadata {
  return metadata && typeof metadata === 'object' ? (metadata as NotificationMetadata) : {}
}

function getMetadataString(metadata: NotificationMetadata, key: string): string | undefined {
  const value = metadata[key]
  return typeof value === 'string' ? value : undefined
}

function getMessageOrderId(message: SystemMessage): string | undefined {
  const metadata = getMetadataRecord(message.metadata)
  return getMetadataString(metadata, 'OrderId') || getMetadataString(metadata, 'orderId') || getMetadataString(metadata, 'id')
}

function getMessageSegmentId(message: SystemMessage): string | undefined {
  return getMetadataString(getMetadataRecord(message.metadata), 'SegmentId')
}

export const NotificationGateway = {
  getSnapshot: getStateSnapshot,

  getMessages: (): SystemMessage[] => getStateSnapshot().messages,

  addMessage: (message: NotificationMessageInput): void => {
    getStateSnapshot().addMessage(message)
  },

  archiveMessage: (id: string): void => {
    getStateSnapshot().archiveMessage(id)
  },

  archiveByOrderId: (orderId: string): void => {
    getStateSnapshot().archiveByOrderId(orderId)
  },

  archiveByOrderAndSegment: (orderId: string, segmentId: string): void => {
    const state = getStateSnapshot()
    state.messages.forEach((message) => {
      if (getMessageOrderId(message) === orderId && getMessageSegmentId(message) === segmentId && !message.isArchived) {
        state.archiveMessage(message.id)
      }
    })
  },

  hasMessage: (predicate: NotificationPredicate): boolean => {
    return getStateSnapshot().messages.some(predicate)
  },

  archiveWhere: (predicate: NotificationPredicate): void => {
    const state = getStateSnapshot()
    state.messages.forEach((message) => {
      if (predicate(message) && !message.isArchived) {
        state.archiveMessage(message.id)
      }
    })
  },

  getDismissedAt: (uniqueKey: string): number | undefined => {
    return getStateSnapshot().dismissedKeys[uniqueKey]
  },

  syncWithRules: (validRuleIds: string[]): void => {
    getStateSnapshot().syncWithRules(validRuleIds)
  },

  syncWithCommands: (validCommandIds: string[]): void => {
    getStateSnapshot().syncWithCommands(validCommandIds)
  },

  syncWithOrders: (validOrderIds: string[]): void => {
    getStateSnapshot().syncWithOrders(validOrderIds)
  },
}
