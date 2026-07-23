export type CuttingEngineAngleMixMode =
  | 'allow'
  | 'prefer-same-angle'
  | 'strict-same-angle'
export type CuttingEngineMustFulfillMode = 'strict' | 'soft-penalty' | 'ignore'
export type CuttingEngineMixingStrategy =
  | 'allow'
  | 'sameGroupOnly'
  | 'strictNoMix'
export type CuttingEngineOrderStrategy =
  | 'respectOrder'
  | 'softPenalty'
  | 'ignore'
export type CuttingEngineDirectionStrategy =
  | 'sameDirectionPreferred'
  | 'sameDirectionRequired'
  | 'allowSwitch'

export type CuttingEngineRuleStrategy = {
  mustFulfillMode: CuttingEngineMustFulfillMode
  mixingStrategy: CuttingEngineMixingStrategy
  orderStrategy: CuttingEngineOrderStrategy
  directionStrategy: CuttingEngineDirectionStrategy
}

export type CuttingEngineConfig = {
  splitPenaltyWeight: string
  mustFulfillPenaltyWeight: string
  directionSwitchPenaltyWeight: string
  sameDirectionPreferred: boolean
  angleMixMode: CuttingEngineAngleMixMode
  ruleStrategy: CuttingEngineRuleStrategy
  knifeGapMm: string
  edgeTrimMm: string
  maxSolveDurationSeconds: string
  minSupportedLengthMm: string
  maxSupportedLengthMm: string
  fixedDecisionLengthMm: string
}

export const DEFAULT_CUTTING_ENGINE_CONFIG: CuttingEngineConfig = {
  splitPenaltyWeight: '6',
  mustFulfillPenaltyWeight: '6000',
  directionSwitchPenaltyWeight: '4',
  sameDirectionPreferred: true,
  angleMixMode: 'prefer-same-angle',
  ruleStrategy: {
    mustFulfillMode: 'soft-penalty',
    mixingStrategy: 'sameGroupOnly',
    orderStrategy: 'softPenalty',
    directionStrategy: 'sameDirectionPreferred',
  },
  knifeGapMm: '2.0',
  edgeTrimMm: '10.0',
  maxSolveDurationSeconds: '30',
  minSupportedLengthMm: '80.0',
  maxSupportedLengthMm: '1200.0',
  fixedDecisionLengthMm: '91.0',
}

function normalizeNumberText(
  value: unknown,
  fallback: string,
  options: { allowZero?: boolean } = {}
): string {
  const text = typeof value === 'string' ? value.trim() : String(value ?? '')
  const parsed = text ? Number(text) : Number.NaN
  const minValue = options.allowZero ? 0 : Number.MIN_VALUE
  if (!Number.isFinite(parsed) || parsed < minValue) {
    return fallback
  }
  return text
}

function toConfigNumber(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeCuttingEngineAngleMixMode(
  value: unknown
): CuttingEngineAngleMixMode {
  return value === 'allow' ||
    value === 'prefer-same-angle' ||
    value === 'strict-same-angle'
    ? value
    : DEFAULT_CUTTING_ENGINE_CONFIG.angleMixMode
}

export function normalizeCuttingEngineMustFulfillMode(
  value: unknown
): CuttingEngineMustFulfillMode {
  return value === 'strict' || value === 'ignore'
    ? value
    : DEFAULT_CUTTING_ENGINE_CONFIG.ruleStrategy.mustFulfillMode
}

export function normalizeCuttingEngineMixingStrategy(
  value: unknown
): CuttingEngineMixingStrategy {
  return value === 'allow' || value === 'strictNoMix'
    ? value
    : DEFAULT_CUTTING_ENGINE_CONFIG.ruleStrategy.mixingStrategy
}

export function normalizeCuttingEngineOrderStrategy(
  value: unknown
): CuttingEngineOrderStrategy {
  return value === 'respectOrder' || value === 'ignore'
    ? value
    : DEFAULT_CUTTING_ENGINE_CONFIG.ruleStrategy.orderStrategy
}

export function normalizeCuttingEngineDirectionStrategy(
  value: unknown
): CuttingEngineDirectionStrategy {
  return value === 'sameDirectionRequired' || value === 'allowSwitch'
    ? value
    : DEFAULT_CUTTING_ENGINE_CONFIG.ruleStrategy.directionStrategy
}

export function normalizeCuttingEngineRuleStrategy(
  value: unknown
): CuttingEngineRuleStrategy {
  const strategy =
    typeof value === 'object' && value !== null
      ? (value as Partial<CuttingEngineRuleStrategy>)
      : {}
  return {
    mustFulfillMode: normalizeCuttingEngineMustFulfillMode(
      strategy.mustFulfillMode
    ),
    mixingStrategy: normalizeCuttingEngineMixingStrategy(
      strategy.mixingStrategy
    ),
    orderStrategy: normalizeCuttingEngineOrderStrategy(strategy.orderStrategy),
    directionStrategy: normalizeCuttingEngineDirectionStrategy(
      strategy.directionStrategy
    ),
  }
}

export function normalizeCuttingEngineConfig(
  value: Partial<CuttingEngineConfig> = {}
): CuttingEngineConfig {
  const splitPenaltyWeight = normalizeNumberText(
    value.splitPenaltyWeight,
    DEFAULT_CUTTING_ENGINE_CONFIG.splitPenaltyWeight,
    { allowZero: true }
  )
  const mustFulfillPenaltyWeight = normalizeNumberText(
    value.mustFulfillPenaltyWeight,
    DEFAULT_CUTTING_ENGINE_CONFIG.mustFulfillPenaltyWeight,
    { allowZero: true }
  )
  const directionSwitchPenaltyWeight = normalizeNumberText(
    value.directionSwitchPenaltyWeight,
    DEFAULT_CUTTING_ENGINE_CONFIG.directionSwitchPenaltyWeight,
    { allowZero: true }
  )
  const knifeGapMm = normalizeNumberText(
    value.knifeGapMm,
    DEFAULT_CUTTING_ENGINE_CONFIG.knifeGapMm
  )
  const edgeTrimMm = normalizeNumberText(
    value.edgeTrimMm,
    DEFAULT_CUTTING_ENGINE_CONFIG.edgeTrimMm,
    { allowZero: true }
  )
  const maxSolveDurationSeconds = normalizeNumberText(
    value.maxSolveDurationSeconds,
    DEFAULT_CUTTING_ENGINE_CONFIG.maxSolveDurationSeconds
  )
  const minSupportedLengthMm = normalizeNumberText(
    value.minSupportedLengthMm,
    DEFAULT_CUTTING_ENGINE_CONFIG.minSupportedLengthMm
  )
  const rawMaxSupportedLengthMm = normalizeNumberText(
    value.maxSupportedLengthMm,
    DEFAULT_CUTTING_ENGINE_CONFIG.maxSupportedLengthMm
  )
  const maxSupportedLengthMm =
    toConfigNumber(rawMaxSupportedLengthMm) >=
    toConfigNumber(minSupportedLengthMm)
      ? rawMaxSupportedLengthMm
      : minSupportedLengthMm
  const rawFixedDecisionLengthMm = normalizeNumberText(
    value.fixedDecisionLengthMm,
    DEFAULT_CUTTING_ENGINE_CONFIG.fixedDecisionLengthMm
  )
  const defaultFixedDecisionLengthMm =
    toConfigNumber(DEFAULT_CUTTING_ENGINE_CONFIG.fixedDecisionLengthMm) >=
      toConfigNumber(minSupportedLengthMm) &&
    toConfigNumber(DEFAULT_CUTTING_ENGINE_CONFIG.fixedDecisionLengthMm) <=
      toConfigNumber(maxSupportedLengthMm)
      ? DEFAULT_CUTTING_ENGINE_CONFIG.fixedDecisionLengthMm
      : minSupportedLengthMm
  const fixedDecisionLengthMm =
    toConfigNumber(rawFixedDecisionLengthMm) >=
      toConfigNumber(minSupportedLengthMm) &&
    toConfigNumber(rawFixedDecisionLengthMm) <=
      toConfigNumber(maxSupportedLengthMm)
      ? rawFixedDecisionLengthMm
      : defaultFixedDecisionLengthMm

  return {
    splitPenaltyWeight,
    mustFulfillPenaltyWeight,
    directionSwitchPenaltyWeight,
    sameDirectionPreferred:
      typeof value.sameDirectionPreferred === 'boolean'
        ? value.sameDirectionPreferred
        : DEFAULT_CUTTING_ENGINE_CONFIG.sameDirectionPreferred,
    angleMixMode: normalizeCuttingEngineAngleMixMode(
      value.angleMixMode ?? DEFAULT_CUTTING_ENGINE_CONFIG.angleMixMode
    ),
    ruleStrategy: normalizeCuttingEngineRuleStrategy(value.ruleStrategy),
    knifeGapMm,
    edgeTrimMm,
    maxSolveDurationSeconds,
    minSupportedLengthMm,
    maxSupportedLengthMm,
    fixedDecisionLengthMm,
  }
}
