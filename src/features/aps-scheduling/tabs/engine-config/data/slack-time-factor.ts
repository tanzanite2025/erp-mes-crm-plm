import type { TranslationKey } from '@/locales'
import type {
  GreedyEngineFactorBadgeItem,
  GreedyEngineFactorStatusTone,
  GreedyEngineFactorSummaryItem,
} from '../types'

type EngineConfigTranslator = (key: TranslationKey, params?: Record<string, string | number>) => string

export type GreedyEngineSlackTimeSnapshot = {
  enableSlackTimePenalty: boolean
  slackThresholdDays: number
  overduePenalty: number
  sourceType: 'system_default'
  sourceStatus: 'active'
}

export type SlackTimeFactorViewModel = {
  id: string
  sourceBadges: GreedyEngineFactorBadgeItem[]
  summaryItems: GreedyEngineFactorSummaryItem[]
}

export function buildSystemDefaultGreedySlackTimeSnapshot(): GreedyEngineSlackTimeSnapshot {
  return {
    enableSlackTimePenalty: true,
    slackThresholdDays: 3,
    overduePenalty: 1000,
    sourceType: 'system_default',
    sourceStatus: 'active',
  }
}

export function buildSlackTimeSummaryItems(
  snapshot: GreedyEngineSlackTimeSnapshot,
  t: EngineConfigTranslator,
): GreedyEngineFactorSummaryItem[] {
  return [
    {
      id: 'enable-slack',
      label: t('apsScheduling.engineConfig.slackTimeCard.summary.enableSlackLabel'),
      value: snapshot.enableSlackTimePenalty
        ? t('apsScheduling.engineConfig.slackTimeCard.summary.enableSlackValue')
        : t('apsScheduling.engineConfig.slackTimeCard.summary.enableSlackDisabledValue'),
    },
    {
      id: 'slack-threshold',
      label: t('apsScheduling.engineConfig.slackTimeCard.summary.slackThresholdLabel'),
      value: t('apsScheduling.engineConfig.slackTimeCard.summary.slackThresholdValue', {
        days: snapshot.slackThresholdDays,
      }),
    },
    {
      id: 'overdue-penalty',
      label: t('apsScheduling.engineConfig.slackTimeCard.summary.overduePenaltyLabel'),
      value: t('apsScheduling.engineConfig.slackTimeCard.summary.overduePenaltyValue', {
        penalty: snapshot.overduePenalty,
      }),
    },
  ]
}

export function buildSlackTimeFactorViewModel(
  snapshot: GreedyEngineSlackTimeSnapshot,
  t: EngineConfigTranslator,
): SlackTimeFactorViewModel {
  const sourceTone: GreedyEngineFactorStatusTone = 'healthy'
  const sourceStatusTone: GreedyEngineFactorStatusTone = 'healthy'

  return {
    id: 'slack-time-rules',
    sourceBadges: [
      {
        id: 'slack-time-status',
        value: t('apsScheduling.engineConfig.slackTimeCard.sourceStatus.active'),
        tone: sourceStatusTone,
      },
      {
        id: 'slack-time-source',
        value: t('apsScheduling.engineConfig.slackTimeCard.sourceType.systemDefault'),
        tone: sourceTone,
      },
    ],
    summaryItems: buildSlackTimeSummaryItems(snapshot, t),
  }
}
