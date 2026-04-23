import type { GreedyEngineDateRuleSummaryItem } from '../types'

export const greedyDateRuleSummaryItems: GreedyEngineDateRuleSummaryItem[] = [
  {
    id: 'default-workday',
    labelKey: 'apsScheduling.engineConfig.dateCard.summary.defaultWorkdayLabel',
    valueKey: 'apsScheduling.engineConfig.dateCard.summary.defaultWorkdayValue',
  },
  {
    id: 'weekend-rest',
    labelKey: 'apsScheduling.engineConfig.dateCard.summary.weekendRestLabel',
    valueKey: 'apsScheduling.engineConfig.dateCard.summary.weekendRestValue',
  },
  {
    id: 'holiday-stop',
    labelKey: 'apsScheduling.engineConfig.dateCard.summary.holidayStopLabel',
    valueKey: 'apsScheduling.engineConfig.dateCard.summary.holidayStopValue',
  },
]
