import { normalizeMachineCode } from '@/lib/codecs/code-normalization'
import type { ProductionLine } from '../data/production-line'
import type { ProductionProcessStep } from '../data/production-process'

export function normalizeProductionLineCode(value?: string | null): string {
  return normalizeMachineCode(value)
}

export function normalizeProductionProcessStepCode(
  value?: string | null
): string {
  return normalizeMachineCode(value)
}

export function normalizeProductionLineEntity(
  line: ProductionLine
): ProductionLine {
  return {
    ...line,
    code: normalizeProductionLineCode(line.code),
  }
}

export function normalizeProductionProcessStepEntity(
  step: ProductionProcessStep
): ProductionProcessStep {
  return {
    ...step,
    code: normalizeProductionProcessStepCode(step.code),
  }
}
