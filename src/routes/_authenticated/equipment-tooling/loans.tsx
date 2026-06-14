import { createFileRoute } from '@tanstack/react-router'
import { MoldLoanMgmt } from '@/features/equipment-tooling/tabs/mold-loan-mgmt'

export const Route = createFileRoute('/_authenticated/equipment-tooling/loans')(
  {
    component: MoldLoanMgmt,
  }
)
