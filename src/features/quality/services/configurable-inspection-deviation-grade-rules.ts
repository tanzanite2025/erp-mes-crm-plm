import type { LevelConfig, StandardItem } from '../data/schema'

export interface ConfigurableInspectionGradeFormValue {
  level: string
  lowerTolerance: string
  upperTolerance: string
  result: 'PASS' | 'FAIL'
}

export function createDefaultConfigurableInspectionGradeFormValues(): ConfigurableInspectionGradeFormValue[] {
  return [
    { level: 'S', lowerTolerance: '0', upperTolerance: '0', result: 'PASS' },
    { level: 'A', lowerTolerance: '', upperTolerance: '', result: 'PASS' },
    { level: 'B', lowerTolerance: '', upperTolerance: '', result: 'PASS' },
  ]
}

export function createConfigurableInspectionGradeFormValues(
  levels: LevelConfig[]
): ConfigurableInspectionGradeFormValue[] {
  return levels.map((grade) => ({
    level: grade.level,
    lowerTolerance: String(grade.lowerTolerance),
    upperTolerance: String(grade.upperTolerance),
    result: grade.result,
  }))
}

export function hasValidConfigurableInspectionGradeFormValues(
  grades: ConfigurableInspectionGradeFormValue[],
  center: number
) {
  if (!Number.isFinite(center) || !grades.length || grades.length > 20)
    return false
  const names = new Set<string>()
  let previousLower = -1
  let previousUpper = -1
  let hasFailGrade = false
  return grades.every((grade) => {
    const name = grade.level.trim()
    const lower = Number(grade.lowerTolerance)
    const upper = Number(grade.upperTolerance)
    const valid =
      name.length > 0 &&
      [...name].length <= 40 &&
      !names.has(name.toUpperCase()) &&
      grade.lowerTolerance.trim() !== '' &&
      grade.upperTolerance.trim() !== '' &&
      [lower, upper, center - lower, center + upper].every(Number.isFinite) &&
      lower >= 0 &&
      upper >= 0 &&
      lower > previousLower &&
      upper > previousUpper &&
      (lower === 0 || center - lower < center) &&
      (upper === 0 || center + upper > center) &&
      (!hasFailGrade || grade.result === 'FAIL') &&
      ['PASS', 'FAIL'].includes(grade.result)
    if (grade.result === 'FAIL') hasFailGrade = true
    names.add(name.toUpperCase())
    previousLower = lower
    previousUpper = upper
    return valid
  })
}

export function buildConfigurableInspectionGradeRules(
  grades: ConfigurableInspectionGradeFormValue[]
): LevelConfig[] {
  return grades.map((grade) => ({
    level: grade.level.trim(),
    lowerTolerance: Number(grade.lowerTolerance),
    upperTolerance: Number(grade.upperTolerance),
    result: grade.result,
  }))
}

export function canEditInspectionItemDeviationGrades(item: StandardItem) {
  return (
    item.gradingMode === 'DEVIATION_BANDS' &&
    Number.isFinite(item.centerValue) &&
    item.levels.length > 0 &&
    item.levels.every(
      (grade) =>
        Number.isFinite(grade.lowerTolerance) &&
        Number.isFinite(grade.upperTolerance) &&
        ['PASS', 'FAIL'].includes(grade.result)
    )
  )
}
