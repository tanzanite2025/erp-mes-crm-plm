import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  useProductionLinesQuery,
  useProductionProcessesQuery,
} from '@/features/production-shared/hooks/use-production-resources'
import { type PersonnelSelectOption } from '../config/personnel-archive-columns'
import { type OrgNode } from '../data/org-schema'
import { personnelQueryKeys } from '../query-keys'
import { OrgService } from '../services/org-service'
import { PositionService } from '../services/position-service'

type UseOrgPersonnelLookupsOptions = {
  enabled?: boolean
  includePositions?: boolean
  includeProductionResources?: boolean
}

function flattenDepartmentOptions(nodes: OrgNode[]): PersonnelSelectOption[] {
  return nodes.flatMap((node) => {
    const current =
      node.type === 'department' && node.id
        ? [{ label: node.name, value: node.id }]
        : []

    return current.concat(flattenDepartmentOptions(node.children ?? []))
  })
}

function buildNameMap(
  orgData: OrgNode[],
  lineData: Array<{
    id: string
    name: string
    segments?: Array<{
      id: string
      name: string
      jobCategories?: Array<{ processes?: Array<{ id: string; name: string }> }>
    }>
  }>,
  processData: Array<{ id: string; name: string }>
) {
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

  lineData.forEach((line) => {
    nextMap[line.id] = line.name
    line.segments?.forEach((segment) => {
      nextMap[segment.id] = segment.name
      segment.jobCategories?.forEach((category) => {
        category.processes?.forEach((process) => {
          nextMap[process.id] = process.name
        })
      })
    })
  })

  processData.forEach((process) => {
    nextMap[process.id] = process.name
  })

  return nextMap
}

export function useOrgPersonnelLookups(
  options: UseOrgPersonnelLookupsOptions = {}
) {
  const {
    enabled = true,
    includePositions = false,
    includeProductionResources = false,
  } = options

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

  const linesQuery = useProductionLinesQuery({
    enabled: enabled && includeProductionResources,
  })

  const processesQuery = useProductionProcessesQuery({
    enabled: enabled && includeProductionResources,
  })

  const orgTree = useMemo(() => orgTreeQuery.data ?? [], [orgTreeQuery.data])
  const positions = useMemo(
    () => positionsQuery.data ?? [],
    [positionsQuery.data]
  )
  const departmentOptions = useMemo(
    () => flattenDepartmentOptions(orgTree),
    [orgTree]
  )
  const nameMap = useMemo(
    () =>
      buildNameMap(orgTree, linesQuery.data ?? [], processesQuery.data ?? []),
    [orgTree, linesQuery.data, processesQuery.data]
  )

  return {
    orgTree,
    positions,
    departmentOptions,
    nameMap,
    isLoading:
      orgTreeQuery.isLoading ||
      positionsQuery.isLoading ||
      linesQuery.isLoading ||
      processesQuery.isLoading,
    error:
      orgTreeQuery.error ??
      positionsQuery.error ??
      linesQuery.error ??
      processesQuery.error,
  }
}
