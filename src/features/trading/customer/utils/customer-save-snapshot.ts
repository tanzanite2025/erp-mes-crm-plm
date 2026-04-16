import type { Customer } from '../../data/schema'

export function buildCustomerSaveSnapshot(baseCustomer: Customer | null | undefined, draft: Customer): Customer {
  if (!baseCustomer) {
    return draft
  }

  return {
    ...baseCustomer,
    ...JSON.parse(JSON.stringify(draft)),
  }
}
