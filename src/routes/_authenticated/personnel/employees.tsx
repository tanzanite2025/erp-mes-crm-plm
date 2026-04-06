import { createFileRoute } from '@tanstack/react-router'
import { EmployeeMgmt } from '@/features/org-personnel/tabs/employee-mgmt'

export const Route = createFileRoute('/_authenticated/personnel/employees')({
  component: () => <EmployeeMgmt />,
})
