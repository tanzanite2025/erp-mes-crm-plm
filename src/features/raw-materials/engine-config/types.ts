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

export function normalizeCuttingEngineAngleMixMode(
  value: unknown
): CuttingEngineAngleMixMode {
  return value === 'prefer-same-angle' || value === 'strict-same-angle'
    ? value
    : 'allow'
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
  return {
    splitPenaltyWeight:
      value.splitPenaltyWeight ??
      DEFAULT_CUTTING_ENGINE_CONFIG.splitPenaltyWeight,
    mustFulfillPenaltyWeight:
      value.mustFulfillPenaltyWeight ??
      DEFAULT_CUTTING_ENGINE_CONFIG.mustFulfillPenaltyWeight,
    directionSwitchPenaltyWeight:
      value.directionSwitchPenaltyWeight ??
      DEFAULT_CUTTING_ENGINE_CONFIG.directionSwitchPenaltyWeight,
    sameDirectionPreferred:
      typeof value.sameDirectionPreferred === 'boolean'
        ? value.sameDirectionPreferred
        : DEFAULT_CUTTING_ENGINE_CONFIG.sameDirectionPreferred,
    angleMixMode: normalizeCuttingEngineAngleMixMode(
      value.angleMixMode ?? DEFAULT_CUTTING_ENGINE_CONFIG.angleMixMode
    ),
    ruleStrategy: normalizeCuttingEngineRuleStrategy(value.ruleStrategy),
    knifeGapMm: value.knifeGapMm ?? DEFAULT_CUTTING_ENGINE_CONFIG.knifeGapMm,
    edgeTrimMm: value.edgeTrimMm ?? DEFAULT_CUTTING_ENGINE_CONFIG.edgeTrimMm,
    maxSolveDurationSeconds:
      value.maxSolveDurationSeconds ??
      DEFAULT_CUTTING_ENGINE_CONFIG.maxSolveDurationSeconds,
    minSupportedLengthMm:
      value.minSupportedLengthMm ??
      DEFAULT_CUTTING_ENGINE_CONFIG.minSupportedLengthMm,
    maxSupportedLengthMm:
      value.maxSupportedLengthMm ??
      DEFAULT_CUTTING_ENGINE_CONFIG.maxSupportedLengthMm,
    fixedDecisionLengthMm:
      value.fixedDecisionLengthMm ??
      DEFAULT_CUTTING_ENGINE_CONFIG.fixedDecisionLengthMm,
  }
}
