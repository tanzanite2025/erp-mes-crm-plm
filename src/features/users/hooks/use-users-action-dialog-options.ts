import { useEffect, useMemo, useState } from 'react'
import { type OrgNode } from '@/features/org-personnel/data/org-schema'
import { type Employee } from '@/features/org-personnel/data/schema'
import { OrgService } from '@/features/org-personnel/services/org-service'
import { productionResourceService } from '@/features/production-shared/services/production-resource-service'
import { type Role } from '@/features/system-mgmt/data/role-schema'
import { type UserOption } from '../data/schema'
import { type EmployeeOption, type TranslateFn } from '../components/users-action-dialog.shared'
import { EmployeeService } from '@/features/org-personnel/services/employee-service'

type UseUsersActionDialogOptionsParams = {
  open: boolean
  isEdit: boolean
  usersData?: UserOption[]
  dynamicRoles: Role[]
  t: TranslateFn
}

export function useUsersActionDialogOptions({
  open,
  isEdit,
  usersData,
  dynamicRoles,
  t,
}: UseUsersActionDialogOptionsParams) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [rawOrgNodes, setRawOrgNodes] = useState<OrgNode[]>([])

  useEffect(() => {
    if (!(open && !isEdit)) return

    let isCancelled = false

    Promise.all([
      EmployeeService.getEmployees(),
      OrgService.getOrgTree(),
      productionResourceService.getLines(),
      productionResourceService.getSteps(),
    ]).then(([data, orgData, lineData, prcData]) => {
      if (isCancelled || !data) return

      const nameMap: Record<string, string> = {}
      const flattenOrg = (nodes: OrgNode[]) => {
        nodes.forEach((node) => {
          nameMap[node.id] = node.name
          if (node.children) flattenOrg(node.children)
        })
      }

      flattenOrg(orgData)

      lineData.forEach((line) => {
        nameMap[line.id] = line.name
        line.segments.forEach((seg) => {
          seg.processes.forEach((process) => {
            nameMap[process.id] = process.name
          })
        })
      })

      prcData.forEach((p) => {
        nameMap[p.id] = p.name
      })

      const existingEmployeeIds = new Set(
        usersData?.map((u) => u.employeeId).filter(Boolean) || []
      )

      const nextEmployees = data
        .filter((emp: Employee) => !existingEmployeeIds.has(emp.id))
        .map((emp: Employee) => ({
          label: buildEmployeeDisplayLabel(emp, nameMap, t),
          value: emp.id,
          raw: emp,
        }))

      setRawOrgNodes(orgData)
      setEmployees(nextEmployees)
    })

    return () => {
      isCancelled = true
    }
  }, [open, isEdit, usersData, t])

  const combinedRoleOptions = useMemo(() => {
    const options = dynamicRoles.map(({ label, id }) => ({
      label,
      value: id,
    }))

    const allOrgNodes: { label: string; value: string }[] = []
    const collectNodes = (nodes: OrgNode[]) => {
      nodes.forEach((node) => {
        const orgId = `org_${node.id}`.toLowerCase()
        if (!options.some((opt) => opt.value.toLowerCase() === orgId)) {
          allOrgNodes.push({
            label: node.name,
            value: orgId,
          })
        }
        if (node.children) collectNodes(node.children)
      })
    }

    collectNodes(rawOrgNodes)

    return [...options, ...allOrgNodes]
  }, [dynamicRoles, rawOrgNodes])

  return {
    employees,
    rawOrgNodes,
    combinedRoleOptions,
  }
}

function buildEmployeeDisplayLabel(
  employee: Employee,
  nameMap: Record<string, string>,
  t: TranslateFn
) {
  const deptName = employee.deptId ? nameMap[employee.deptId] : ''

  let displayLabel = employee.name
  const detailParts: string[] = []
  if (deptName) detailParts.push(deptName)

  if (detailParts.length > 0) {
    displayLabel += ` (${detailParts.join(' - ')})`
  } else {
    displayLabel += ` (${t('common.empty.noRecords')})`
  }

  return displayLabel
}
