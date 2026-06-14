import type { TranslationKey } from '@/locales'
import type {
  GreedyEngineFactorBadgeItem,
  GreedyEngineFactorStatusTone,
  GreedyEngineFactorSummaryItem,
} from '../types'

type EngineConfigTranslator = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export type GreedyEngineAttendanceSnapshot = {
  enableAttendanceLock: boolean
  minCrewAttendanceRate: number // 百分比，例如 50
  absenceCapacityDerate: number // 百分比，例如 80
  sourceType: 'system_default'
  sourceStatus: 'active'
}

export type AttendanceFactorViewModel = {
  id: string
  sourceBadges: GreedyEngineFactorBadgeItem[]
  summaryItems: GreedyEngineFactorSummaryItem[]
}

export function buildSystemDefaultGreedyAttendanceSnapshot(): GreedyEngineAttendanceSnapshot {
  return {
    enableAttendanceLock: true,
    minCrewAttendanceRate: 50,
    absenceCapacityDerate: 80,
    sourceType: 'system_default',
    sourceStatus: 'active',
  }
}

export function buildAttendanceSummaryItems(
  snapshot: GreedyEngineAttendanceSnapshot,
  t: EngineConfigTranslator
): GreedyEngineFactorSummaryItem[] {
  return [
    {
      id: 'enable-attendance',
      label: t(
        'apsScheduling.engineConfig.attendanceCard.summary.enableAttendanceLabel'
      ),
      value: snapshot.enableAttendanceLock
        ? t(
            'apsScheduling.engineConfig.attendanceCard.summary.enableAttendanceValue'
          )
        : t(
            'apsScheduling.engineConfig.attendanceCard.summary.enableAttendanceDisabledValue'
          ),
    },
    {
      id: 'min-crew-rate',
      label: t(
        'apsScheduling.engineConfig.attendanceCard.summary.minCrewRateLabel'
      ),
      value: t(
        'apsScheduling.engineConfig.attendanceCard.summary.minCrewRateValue',
        {
          rate: snapshot.minCrewAttendanceRate,
        }
      ),
    },
    {
      id: 'capacity-derate',
      label: t(
        'apsScheduling.engineConfig.attendanceCard.summary.capacityDerateLabel'
      ),
      value: t(
        'apsScheduling.engineConfig.attendanceCard.summary.capacityDerateValue',
        {
          derate: snapshot.absenceCapacityDerate / 10,
        }
      ),
    },
  ]
}

export function buildAttendanceFactorViewModel(
  snapshot: GreedyEngineAttendanceSnapshot,
  t: EngineConfigTranslator
): AttendanceFactorViewModel {
  const sourceTone: GreedyEngineFactorStatusTone = 'healthy'
  const sourceStatusTone: GreedyEngineFactorStatusTone = 'healthy'

  return {
    id: 'attendance-rules',
    sourceBadges: [
      {
        id: 'attendance-status',
        value: t(
          'apsScheduling.engineConfig.attendanceCard.sourceStatus.active'
        ),
        tone: sourceStatusTone,
      },
      {
        id: 'attendance-source',
        value: t(
          'apsScheduling.engineConfig.attendanceCard.sourceType.systemDefault'
        ),
        tone: sourceTone,
      },
    ],
    summaryItems: buildAttendanceSummaryItems(snapshot, t),
  }
}
