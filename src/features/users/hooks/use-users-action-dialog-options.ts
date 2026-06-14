import { useEffect, useState } from 'react'
import { type OrgNode } from '@/features/org-personnel/data/org-schema'
import { type Employee } from '@/features/org-personnel/data/schema'
import { EmployeeCoreService } from '@/features/org-personnel/services/employee-core-service'
import { OrgService } from '@/features/org-personnel/services/org-service'
import type { ProductionLine } from '@/features/production-shared/data/production-line'
import type { ProductionProcessStep } from '@/features/production-shared/data/production-process'
import { productionLinesService } from '@/features/production-shared/services/production-lines-service'
import { productionProcessesService } from '@/features/production-shared/services/production-processes-service'
import {
  type EmployeeOption,
  type TranslateFn,
} from '../components/users-action-dialog.shared'
import { type UserOption } from '../data/schema'

type UseUsersActionDialogOptionsParams = {
  open: boolean
  currentRow?: UserOption
  usersData?: UserOption[]
  t: TranslateFn
}

export function useUsersActionDialogOptions({
  open,
  currentRow,
  usersData,
  t,
}: UseUsersActionDialogOptionsParams) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [rawOrgNodes, setRawOrgNodes] = useState<OrgNode[]>([])

  useEffect(() => {
    if (!open) return

    let isCancelled = false

    Promise.all([
      EmployeeCoreService.getEmployees(),
      OrgService.getOrgTree(),
      productionLinesService.getLines(),
      productionProcessesService.getSteps(),
    ]).then(([data, orgData, lineData, prcData]) => {
      if (isCancelled || !data) return

      const nameMap: Record<string, string> = {}
      const flattenOrg = (nodes: OrgNode[]) => {
        nodes.forEach((node) => {
          if (node.id) nameMap[node.id] = node.name
          if (node.children) flattenOrg(node.children)
        })
      }

      flattenOrg(orgData)

      lineData.forEach((line: ProductionLine) => {
        nameMap[line.id] = line.name
        line.segments.forEach((seg) => {
          seg.jobCategories.forEach((category) => {
            category.processes.forEach((process) => {
              nameMap[process.id] = process.name
            })
          })
        })
      })

      prcData.forEach((p: ProductionProcessStep) => {
        nameMap[p.id] = p.name
      })

      const currentEmployeeRef = (currentRow?.employeeId || '').trim()
      const existingEmployeeIds = new Set(
        (usersData?.map((u) => u.employeeId).filter(Boolean) || []).filter(
          (employeeId) => String(employeeId).trim() !== currentEmployeeRef
        )
      )

      const nextEmployees = data
        .filter((emp: Employee) => {
          if (!existingEmployeeIds.has(emp.id)) return true
          const staffID = (emp.staffId || '').trim()
          return staffID !== '' && !existingEmployeeIds.has(staffID)
        })
        .map((emp: Employee) => ({
          label: buildEmployeeDisplayLabel(emp, nameMap, t),
          value: emp.id,
          raw: emp,
        }))

      if (currentEmployeeRef) {
        const currentEmployee = data.find((emp: Employee) => {
          return (
            emp.id === currentEmployeeRef ||
            (emp.staffId || '').trim() === currentEmployeeRef
          )
        })
        if (currentEmployee) {
          const alreadyIncluded = nextEmployees.some(
            (option) => option.value === currentEmployeeRef
          )
          if (!alreadyIncluded) {
            nextEmployees.unshift({
              label: buildEmployeeDisplayLabel(currentEmployee, nameMap, t),
              value: currentEmployeeRef,
              raw: currentEmployee,
            })
          }
        }
      }

      setRawOrgNodes(orgData)
      setEmployees(nextEmployees)
    })

    return () => {
      isCancelled = true
    }
  }, [open, currentRow?.employeeId, usersData, t])

  return {
    employees,
    rawOrgNodes,
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
