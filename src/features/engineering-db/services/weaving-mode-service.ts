import { failLoudly } from '@/lib/safe-catch'
import {
  engineeringSpecService,
  type EngineeringSpec,
  type EngineeringSpecInput,
} from '@/features/engineering/services/engineering-spec-service'
import {
  DEFAULT_WEAVING_MODE_PRESETS,
  WEAVING_MODE_SPEC_TYPE,
  type WeavingMode,
  type WeavingModeDraft,
  weavingModeSchema,
} from '../data/weaving-mode-schema'
import {
  normalizeWeavingRatio,
  sortWeavingModes,
} from '../data/weaving-mode-utils'

function toWeavingMode(item: EngineeringSpec): WeavingMode {
  const specData = item.specData ?? {}
  const ratioNumerator = Number(specData.ratioNumerator ?? 1)
  const ratioDenominator = Number(specData.ratioDenominator ?? 1)
  const normalized = normalizeWeavingRatio(ratioNumerator, ratioDenominator)

  return weavingModeSchema.parse({
    id: item.id,
    code: String(specData.code ?? normalized.code),
    label: String(specData.label ?? normalized.label),
    ratioNumerator: normalized.normalizedNumerator,
    ratioDenominator: normalized.normalizedDenominator,
    normalizedRatioKey: String(
      specData.normalizedRatioKey ?? normalized.normalizedRatioKey
    ),
    description: String(specData.description ?? item.description ?? ''),
    active: Boolean(specData.active ?? item.active),
    isSystemPreset: Boolean(specData.isSystemPreset ?? false),
    sortOrder: Number(specData.sortOrder ?? 0),
    version: item.version,
    createdAt: item.createdAt || new Date().toISOString(),
  })
}

function getNextSortOrder(items: WeavingMode[]) {
  if (items.length === 0) {
    return 1
  }

  return Math.max(...items.map((item) => item.sortOrder || 0)) + 1
}

async function listRawWeavingModeSpecs() {
  return engineeringSpecService.getSpecs(WEAVING_MODE_SPEC_TYPE)
}

function parseWeavingModes(items: EngineeringSpec[]) {
  return sortWeavingModes(
    items.reduce<WeavingMode[]>((acc, item) => {
      try {
        acc.push(toWeavingMode(item))
      } catch (error) {
        failLoudly(error, 'weavingModeService.parseWeavingModes', {
          silentUI: true,
        })
      }
      return acc
    }, [])
  )
}

async function loadWeavingModes() {
  const raw = await listRawWeavingModeSpecs()
  return parseWeavingModes(raw)
}

async function saveWeavingModeDraft(
  draft: WeavingModeDraft,
  existingItems?: WeavingMode[]
): Promise<WeavingMode> {
  const items = existingItems ?? (await loadWeavingModes())
  const current = draft.id
    ? items.find((item) => item.id === draft.id)
    : undefined
  const normalized = normalizeWeavingRatio(
    draft.ratioNumerator,
    draft.ratioDenominator
  )
  const duplicated = items.find(
    (item) =>
      item.id !== draft.id &&
      item.normalizedRatioKey === normalized.normalizedRatioKey
  )

  if (duplicated) {
    throw new Error('Duplicated weaving mode')
  }

  const sortOrder =
    current?.sortOrder ?? draft.sortOrder ?? getNextSortOrder(items)
  const description = draft.description?.trim() || ''
  const active = draft.active
  const isSystemPreset =
    current?.isSystemPreset ?? draft.isSystemPreset ?? false

  const payload: EngineeringSpecInput = {
    id: draft.id,
    name: normalized.label,
    code: normalized.code,
    type: WEAVING_MODE_SPEC_TYPE,
    description,
    active,
    specData: {
      code: normalized.code,
      label: normalized.label,
      ratioNumerator: normalized.normalizedNumerator,
      ratioDenominator: normalized.normalizedDenominator,
      normalizedRatioKey: normalized.normalizedRatioKey,
      description,
      active,
      isSystemPreset,
      sortOrder,
    },
    version: current?.version ?? draft.version ?? 1,
  }

  const saved = await engineeringSpecService.saveSpec(payload)
  return toWeavingMode(saved)
}

export const weavingModeService = {
  async ensureWeavingModePresets(): Promise<WeavingMode[]> {
    const existing = await loadWeavingModes()
    if (existing.length > 0) {
      return existing
    }

    const created = await Promise.all(
      DEFAULT_WEAVING_MODE_PRESETS.map(async (preset) => {
        return saveWeavingModeDraft(preset, [])
      })
    )

    return sortWeavingModes(created)
  },

  async getWeavingModes(): Promise<WeavingMode[]> {
    return loadWeavingModes()
  },

  async saveWeavingMode(draft: WeavingModeDraft): Promise<WeavingMode> {
    const items = await loadWeavingModes()
    return saveWeavingModeDraft(draft, items)
  },

  async deleteWeavingMode(item: WeavingMode): Promise<void> {
    if (item.isSystemPreset) {
      throw new Error('System preset weaving mode cannot be deleted')
    }

    await engineeringSpecService.deleteSpec(item.id)
  },
}
