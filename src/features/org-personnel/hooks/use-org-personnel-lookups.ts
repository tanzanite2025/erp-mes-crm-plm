import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type PersonnelSelectOption } from '../config/personnel-archive-columns'
import { type OrgNode } from '../data/org-schema'
import { personnelQueryKeys } from '../query-keys'
import { OrgService } from '../services/org-service'
import { PositionService } from '../services/position-service'

type UseOrgPersonnelLookupsOptions = {
  enabled?: boolean
  includePositions?: boolean
}

function flattenOrgUnitOptions(
  nodes: OrgNode[],
  parentPath = ''
): PersonnelSelectOption[] {
  return nodes.flatMap((node) => {
    const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name
    const current = node.id ? [{ label: currentPath, value: node.id }] : []

    return current.concat(
      flattenOrgUnitOptions(node.children ?? [], currentPath)
    )
  })
}

function buildOrgUnitNameMap(orgData: OrgNode[]) {
  const nextMap: Record<string, string> = {}

  const flattenOrg = (nodes: OrgNode[]) => {
    nodes.forEach((node) => {
      if (node.id) {
        nextMap[node.id] = node.name
      }
      flattenOrg(node.children ?? [])
    })
  }

  flattenOrg(orgData)

  return nextMap
}

export function useOrgPersonnelLookups(
  options: UseOrgPersonnelLookupsOptions = {}
) {
  const { enabled = true, includePositions = false } = options

  const orgTreeQuery = useQuery({
    queryKey: personnelQueryKeys.orgTree(),
    queryFn: () => OrgService.getOrgTree(),
    enabled,
  })

  const positionsQuery = useQuery({
    queryKey: personnelQueryKeys.positions(),
    queryFn: () => PositionService.getPositions(),
    enabled: enabled && includePositions,
  })

  const orgTree = useMemo(() => orgTreeQuery.data ?? [], [orgTreeQuery.data])
  const positions = useMemo(
    () => positionsQuery.data ?? [],
    [positionsQuery.data]
  )
  const orgUnitOptions = useMemo(
    () => flattenOrgUnitOptions(orgTree),
    [orgTree]
  )
  const nameMap = useMemo(() => buildOrgUnitNameMap(orgTree), [orgTree])

  return {
    orgTree,
    positions,
    orgUnitOptions,
    nameMap,
    isLoading: orgTreeQuery.isLoading || positionsQuery.isLoading,
    error: orgTreeQuery.error ?? positionsQuery.error,
  }
}
