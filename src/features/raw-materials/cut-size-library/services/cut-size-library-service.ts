import {
  engineeringSpecService,
  type EngineeringSpec,
  type EngineeringSpecInput,
} from '@/features/engineering/services/engineering-spec-service'
import {
  normalizeCutSizeUnit,
  type CutSizeUnit,
  type CutSizeUnitFormState,
} from '../data/cut-size-library-schema'

const CUT_SIZE_LIBRARY_SPEC_TYPE = 'CUT_SIZE_LIBRARY'

function toCutSizeUnit(spec: EngineeringSpec): CutSizeUnit {
  const payload = (spec.cuttingData ?? {}) as Partial<CutSizeUnit>
  return normalizeCutSizeUnit({
    ...payload,
    id: spec.id,
    code: payload.code || spec.code,
    name: payload.name || spec.name,
    version: spec._v,
    createdAt: spec.createdAt,
    updatedAt: spec.updatedAt,
  })
}

function toEngineeringSpecInput(
  item: Partial<CutSizeUnit>,
  editing?: CutSizeUnit
): EngineeringSpecInput {
  const code = item.code?.trim() || editing?.code || `CUT-SIZE-${Date.now()}`
  const name = item.name?.trim() || editing?.name || code

  const payload: CutSizeUnit = normalizeCutSizeUnit({
    ...item,
    id: editing?.id || '',
    code,
    name,
    version: editing?.version || 1,
  })

  return {
    id: editing?.id || undefined,
    name,
    code,
    type: CUT_SIZE_LIBRARY_SPEC_TYPE,
    active: payload.status !== 'Archived',
    cuttingData: payload as unknown as Record<string, unknown>,
    _v: editing?.version || payload.version || 1,
  }
}

function includesKeyword(unit: CutSizeUnit, keyword: string): boolean {
  if (!keyword) return true
  const source = [
    unit.code,
    unit.name,
    unit.usageType,
    unit.layupMode,
    unit.widthMm,
    unit.lengthMm,
    unit.cutAngle,
  ]
    .join(' ')
    .toLowerCase()
  return source.includes(keyword)
}

function sortUnits(items: CutSizeUnit[]): CutSizeUnit[] {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt || a.createdAt || '') || 0
    const bTime = Date.parse(b.updatedAt || b.createdAt || '') || 0
    if (aTime !== bTime) return bTime - aTime
    return a.code.localeCompare(b.code)
  })
}

export const CutSizeLibraryService = {
  async list(search = ''): Promise<CutSizeUnit[]> {
    const keyword = search.trim().toLowerCase()
    const specs = await engineeringSpecService.getSpecs(CUT_SIZE_LIBRARY_SPEC_TYPE)
    const items = specs.map(toCutSizeUnit).filter((item) => includesKeyword(item, keyword))
    return sortUnits(items)
  },

  async listActive(): Promise<CutSizeUnit[]> {
    const items = await this.list('')
    return items.filter((item) => item.status === 'Active')
  },

  async save(form: CutSizeUnitFormState, editing?: CutSizeUnit | null): Promise<CutSizeUnit> {
    const specInput = toEngineeringSpecInput(form, editing || undefined)
    const saved = await engineeringSpecService.saveSpec(specInput)
    return toCutSizeUnit(saved)
  },

  async remove(id: string): Promise<void> {
    await engineeringSpecService.deleteSpec(id)
  },
}
