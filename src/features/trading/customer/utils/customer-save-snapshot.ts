import type { Customer, CustomerFormValues } from '../../data/schema'

export function buildCustomerSaveSnapshot(
  baseCustomer: Customer | null | undefined,
  draft: CustomerFormValues
): Customer | CustomerFormValues {
  if (!baseCustomer) {
    return draft
  }

  return {
    ...baseCustomer,
    ...JSON.parse(JSON.stringify(draft)),
  }
}
