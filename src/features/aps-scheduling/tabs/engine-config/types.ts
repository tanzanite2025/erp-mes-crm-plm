export type GreedyEngineFactorSummaryItem = {
  id: string
  label: string
  value: string
  tone?: GreedyEngineFactorStatusTone
}

export type GreedyEngineFactorBadgeItem = {
  id: string
  value: string
  tone: GreedyEngineFactorStatusTone
}

export type GreedyEngineFactorStatusTone = 'healthy' | 'alert' | 'critical'

export type GreedyEngineWeekendPolicy = 'rest_day' | 'workday' | 'unknown'

export type GreedyEngineHolidayPolicy = 'stop_day' | 'reduced_capacity' | 'ignore' | 'unknown'

export type GreedyEngineDateRuleSourceType = 'system_default'

export type GreedyEngineDateRuleSourceStatus = 'active'

export type GreedyEngineDateRuleRange = {
  startDate: string
  endDate: string
  days: number
}

export type GreedyEngineCalendarDay = {
  date: string
  isWorkday: boolean
  isHoliday: boolean
  isOvertime: boolean
  isStopDay: boolean
  sourceType: GreedyEngineDateRuleSourceType
  label?: string
}

export type GreedyEngineDateRuleSnapshot = {
  considersWorkdays: boolean
  weekendPolicy: GreedyEngineWeekendPolicy
  holidayPolicy: GreedyEngineHolidayPolicy
  sourceType: GreedyEngineDateRuleSourceType
  sourceStatus: GreedyEngineDateRuleSourceStatus
  range: GreedyEngineDateRuleRange
  calendarDays: GreedyEngineCalendarDay[]
}
