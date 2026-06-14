import { useEffect, useMemo, useState } from 'react'
import { type MaterialOption } from '../../material-archive/data/schema'
import {
  MaterialUsageService,
  type UsageStat,
} from '../services/material-usage-service'

export type EnrichedMaterialOption = MaterialOption & {
  usageStats: UsageStat[]
}

export function useEnrichedMaterialOptions(materials: MaterialOption[]) {
  const [usageStatsMap, setUsageStatsMap] = useState<
    Record<string, UsageStat[]>
  >({})

  useEffect(() => {
    let cancelled = false

    const enrich = async () => {
      const data = await Promise.all(
        materials.map(async (material) => ({
          ...material,
          usageStats: await MaterialUsageService.getStageUsageStats(
            material.id
          ),
        }))
      )

      if (!cancelled) {
        setUsageStatsMap(
          Object.fromEntries(
            data.map((material) => [material.id, material.usageStats])
          )
        )
      }
    }

    void enrich()

    return () => {
      cancelled = true
    }
  }, [materials])

  const enrichedMaterials = useMemo<EnrichedMaterialOption[]>(
    () =>
      materials.map((material) => ({
        ...material,
        usageStats: usageStatsMap[material.id] ?? [],
      })),
    [materials, usageStatsMap]
  )

  const materialMap = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials]
  )

  return {
    enrichedMaterials,
    materialMap,
  }
}
