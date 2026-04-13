import type { Customer } from '../../data/schema'

export function buildCustomerSaveSnapshot(baseCustomer: Customer | null | undefined, draft: Partial<Customer>): Customer {
  if (!baseCustomer) {
    return draft as Customer
  }

  return {
    ...baseCustomer,
    ...JSON.parse(JSON.stringify(draft)) as Partial<Customer>,
  }
}
