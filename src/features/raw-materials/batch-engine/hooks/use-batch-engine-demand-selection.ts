import { useMemo, useState } from 'react'
import type { BatchOptimizerPlan, BatchOptimizerPlanDiffSummary, BatchOptimizerPlanLayoutDemandSummary } from '../types'

export type BatchEngineDemandFilterMode = 'all' | 'unfulfilled' | 'split' | 'must-fulfill' | 'diff'
export type BatchEngineRollFilterMode = 'all-rolls' | 'used-rolls' | 'related-rolls'
export type BatchEngineDemandGroupMode = 'status' | 'must-fulfill' | 'usage-type'

type UseBatchEngineDemandSelectionOptions = {
  selectedPlan?: BatchOptimizerPlan
  activeDiffSummary?: BatchOptimizerPlanDiffSummary
}

/**
 * 管理 batch-engine 正式方案下的需求行选择、搜索与筛选状态。
 */
export function useBatchEngineDemandSelection(options: UseBatchEngineDemandSelectionOptions) {
  const { selectedPlan, activeDiffSummary } = options
  const [selectedDemandLineId, setSelectedDemandLineId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<BatchEngineDemandFilterMode>('all')
  const [rollFilterMode, setRollFilterMode] = useState<BatchEngineRollFilterMode>('all-rolls')
  const [groupMode, setGroupMode] = useState<BatchEngineDemandGroupMode>('status')

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const changedDemandLineIdSet = useMemo(
    () => new Set(activeDiffSummary?.changedDemandLineIds ?? []),
    [activeDiffSummary]
  )

  const filteredDemandLines = useMemo(() => {
    const demandLines = selectedPlan?.layoutSummary.demandLines ?? []
    return demandLines.filter((line) => {
      const matchesQuery = !normalizedQuery || line.demandLineId.toLowerCase().includes(normalizedQuery)
      if (!matchesQuery) {
        return false
      }

      if (filterMode === 'unfulfilled') {
        return !line.fulfilled
      }
      if (filterMode === 'split') {
        return line.isSplitAcrossRolls
      }
      if (filterMode === 'must-fulfill') {
        return line.mustFulfill
      }
      if (filterMode === 'diff') {
        return changedDemandLineIdSet.has(line.demandLineId)
      }
      return true
    })
  }, [changedDemandLineIdSet, filterMode, normalizedQuery, selectedPlan])

  const selectedDemand = useMemo<BatchOptimizerPlanLayoutDemandSummary | undefined>(() => {
    if (!filteredDemandLines.length) {
      return undefined
    }
    return filteredDemandLines.find((line) => line.demandLineId === selectedDemandLineId) ?? filteredDemandLines[0]
  }, [filteredDemandLines, selectedDemandLineId])

  const relatedRollIds = useMemo(() => selectedDemand?.rollIds ?? [], [selectedDemand])
  const highlightedZoneIds = useMemo(() => selectedDemand?.zoneIds ?? [], [selectedDemand])
  const filteredRollIds = useMemo(() => {
    const rolls = selectedPlan?.layoutSummary.rolls ?? []
    if (rollFilterMode === 'used-rolls') {
      return rolls.filter((roll) => roll.isUsed).map((roll) => roll.rollId)
    }
    if (rollFilterMode === 'related-rolls') {
      return relatedRollIds.length ? relatedRollIds : rolls.map((roll) => roll.rollId)
    }
    return rolls.map((roll) => roll.rollId)
  }, [relatedRollIds, rollFilterMode, selectedPlan])
  const groupedDemandLines = useMemo(() => {
    const groups = new Map<string, BatchOptimizerPlanLayoutDemandSummary[]>()
    for (const line of filteredDemandLines) {
      let key = 'default'
      if (groupMode === 'status') {
        key = line.fulfilled ? '已满足' : '未满足'
      } else if (groupMode === 'must-fulfill') {
        key = line.mustFulfill ? 'Must Fulfill' : '普通需求'
      } else if (groupMode === 'usage-type') {
        key = line.usageType || '--'
      }
      const bucket = groups.get(key) ?? []
      bucket.push(line)
      groups.set(key, bucket)
    }
    return Array.from(groups.entries()).map(([groupKey, items]) => ({ groupKey, items }))
  }, [filteredDemandLines, groupMode])

  return {
    searchQuery,
    setSearchQuery,
    filterMode,
    setFilterMode,
    rollFilterMode,
    setRollFilterMode,
    demandGroupMode: groupMode,
    setDemandGroupMode: setGroupMode,
    filteredDemandLines,
    groupedDemandLines,
    selectedDemandLineId: selectedDemand?.demandLineId ?? '',
    selectedDemand,
    relatedRollIds,
    highlightedZoneIds,
    changedDemandLineIds: Array.from(changedDemandLineIdSet),
    filteredRollIds,
    selectDemandLine: (demandLineId: string) => setSelectedDemandLineId(demandLineId),
  }
}
