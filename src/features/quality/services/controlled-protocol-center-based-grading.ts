import type { LevelConfig } from '../data/schema'

const CONTROLLED_PROTOCOL_SCRAP_BELOW = 'CONTROLLED_PROTOCOL_SCRAP_BELOW'
const CONTROLLED_PROTOCOL_SCRAP_ABOVE = 'CONTROLLED_PROTOCOL_SCRAP_ABOVE'

export function hasValidControlledProtocolDeviationLimits(
  centerValue: number,
  aLevelTolerance: number,
  bLevelTolerance: number
) {
  return (
    [centerValue, aLevelTolerance, bLevelTolerance].every(Number.isFinite) &&
    aLevelTolerance > 0 &&
    bLevelTolerance > aLevelTolerance &&
    Number.isFinite(centerValue - bLevelTolerance) &&
    Number.isFinite(centerValue + bLevelTolerance) &&
    centerValue - aLevelTolerance < centerValue &&
    centerValue + aLevelTolerance > centerValue &&
    centerValue - bLevelTolerance < centerValue - aLevelTolerance &&
    centerValue + bLevelTolerance > centerValue + aLevelTolerance
  )
}

export function buildCenterBasedControlledProtocolLevels(
  centerValue: number,
  aLevelTolerance: number,
  bLevelTolerance: number
): LevelConfig[] {
  if (
    !hasValidControlledProtocolDeviationLimits(
      centerValue,
      aLevelTolerance,
      bLevelTolerance
    )
  ) {
    throw new RangeError(
      'Controlled protocol requires finite limits: 0 < A < B'
    )
  }

  return [
    { level: 'S', tolerance: 0, min: centerValue, max: centerValue },
    {
      level: 'A',
      deviationMinExclusive: 0,
      tolerance: aLevelTolerance,
      min: centerValue - aLevelTolerance,
      max: centerValue + aLevelTolerance,
    },
    {
      level: 'B',
      deviationMinExclusive: aLevelTolerance,
      tolerance: bLevelTolerance,
      min: centerValue - bLevelTolerance,
      max: centerValue + bLevelTolerance,
      errorCodeLower: CONTROLLED_PROTOCOL_SCRAP_BELOW,
      errorCodeUpper: CONTROLLED_PROTOCOL_SCRAP_ABOVE,
    },
  ]
}
