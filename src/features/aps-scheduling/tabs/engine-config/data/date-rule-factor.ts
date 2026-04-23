import type { TranslationKey } from '@/locales'
import type {
  GreedyEngineCalendarDay,
  GreedyEngineDateRuleSnapshot,
  GreedyEngineFactorBadgeItem,
  GreedyEngineFactorStatusTone,
  GreedyEngineFactorSummaryItem,
} from '../types'

type EngineConfigTranslator = (key: TranslationKey, params?: Record<string, string | number>) => string

export type EngineFactorViewModel = {
  id: string
  sourceBadges: GreedyEngineFactorBadgeItem[]
  summaryItems: GreedyEngineFactorSummaryItem[]
}

const DEFAULT_APS_ENGINE_RANGE_DAYS = 14

function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildSystemDefaultCalendarDay(date: Date): GreedyEngineCalendarDay {
  const weekday = date.getDay()
  const isWeekend = weekday === 0 || weekday === 6

  return {
    date: formatDate(date),
    isWorkday: !isWeekend,
    isHoliday: false,
    isOvertime: false,
    isStopDay: isWeekend,
    sourceType: 'system_default',
  }
}

export function buildSystemDefaultGreedyDateRuleSnapshot(now: Date = new Date()): GreedyEngineDateRuleSnapshot {
  const startDate = normalizeDate(now)
  const calendarDays: GreedyEngineCalendarDay[] = Array.from({ length: DEFAULT_APS_ENGINE_RANGE_DAYS }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    return buildSystemDefaultCalendarDay(date)
  })
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + DEFAULT_APS_ENGINE_RANGE_DAYS - 1)

  return {
    considersWorkdays: true,
    weekendPolicy: 'rest_day',
    holidayPolicy: 'ignore',
    sourceType: 'system_default',
    sourceStatus: 'active',
    range: {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      days: DEFAULT_APS_ENGINE_RANGE_DAYS,
    },
    calendarDays,
  }
}

function resolveWeekendPolicyValueKey(snapshot: GreedyEngineDateRuleSnapshot): TranslationKey {
  switch (snapshot.weekendPolicy) {
    case 'rest_day':
      return 'apsScheduling.engineConfig.dateCard.summary.weekendRestValue'
    case 'workday':
      return 'apsScheduling.engineConfig.dateCard.summary.weekendWorkdayValue'
    default:
      return 'apsScheduling.engineConfig.dateCard.summary.unknownValue'
  }
}

function resolveHolidayPolicyValueKey(snapshot: GreedyEngineDateRuleSnapshot): TranslationKey {
  switch (snapshot.holidayPolicy) {
    case 'stop_day':
      return 'apsScheduling.engineConfig.dateCard.summary.holidayStopValue'
    case 'reduced_capacity':
      return 'apsScheduling.engineConfig.dateCard.summary.holidayReducedCapacityValue'
    case 'ignore':
      return 'apsScheduling.engineConfig.dateCard.summary.holidayIgnoreValue'
    default:
      return 'apsScheduling.engineConfig.dateCard.summary.unknownValue'
  }
}

export function buildGreedyDateRuleSummaryItems(
  snapshot: GreedyEngineDateRuleSnapshot,
  t: EngineConfigTranslator,
): GreedyEngineFactorSummaryItem[] {
  return [
    {
      id: 'default-workday',
      label: t('apsScheduling.engineConfig.dateCard.summary.defaultWorkdayLabel'),
      value: snapshot.considersWorkdays
        ? t('apsScheduling.engineConfig.dateCard.summary.defaultWorkdayValue')
        : t('apsScheduling.engineConfig.dateCard.summary.defaultWorkdayDisabledValue'),
    },
    {
      id: 'weekend-rest',
      label: t('apsScheduling.engineConfig.dateCard.summary.weekendRestLabel'),
      value: t(resolveWeekendPolicyValueKey(snapshot)),
      tone: snapshot.weekendPolicy === 'unknown' ? 'alert' : undefined,
    },
    {
      id: 'holiday-stop',
      label: t('apsScheduling.engineConfig.dateCard.summary.holidayStopLabel'),
      value: t(resolveHolidayPolicyValueKey(snapshot)),
      tone: snapshot.holidayPolicy === 'unknown' ? 'alert' : undefined,
    },
  ]
}

export function buildDateRuleFactorViewModel(
  snapshot: GreedyEngineDateRuleSnapshot,
  t: EngineConfigTranslator,
): EngineFactorViewModel {
  const sourceTone: GreedyEngineFactorStatusTone = 'healthy'
  const sourceStatusTone: GreedyEngineFactorStatusTone = 'healthy'

  return {
    id: 'date-rules',
    sourceBadges: [
      {
        id: 'date-rule-status',
        value: t('apsScheduling.engineConfig.dateCard.sourceStatus.active'),
        tone: sourceStatusTone,
      },
      {
        id: 'date-rule-source',
        value: t('apsScheduling.engineConfig.dateCard.sourceType.systemDefault'),
        tone: sourceTone,
      },
    ],
    summaryItems: buildGreedyDateRuleSummaryItems(snapshot, t),
  }
}
