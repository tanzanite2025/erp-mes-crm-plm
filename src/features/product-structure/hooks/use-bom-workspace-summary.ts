import { useMemo } from 'react'
import { type BOMWorkspaceGroupNode } from './use-bom-workspace-projection'

interface UseBOMWorkspaceSummaryParams {
  groups: BOMWorkspaceGroupNode[]
}

export function useBOMWorkspaceSummary({
  groups,
}: UseBOMWorkspaceSummaryParams) {
  const sectionSummaries = useMemo(
    () =>
      groups.map((group) => ({
        section: group.section,
        itemCount: group.childCount,
        isEmpty: group.isEmpty,
        sectionCost: group.sectionCost,
      })),
    [groups]
  )

  const totalItems = useMemo(
    () => groups.reduce((acc, group) => acc + group.childCount, 0),
    [groups]
  )

  const totalCost = useMemo(
    () => groups.reduce((acc, group) => acc + group.sectionCost, 0),
    [groups]
  )

  const stageCoverage = useMemo(
    () => groups.filter((group) => group.childCount > 0).length,
    [groups]
  )

  return {
    totalItems,
    totalCost,
    stageCoverage,
    sectionSummaries,
  }
}
