export const personnelRecordCreationActions = {
  organization: {
    destination: '/personnel/org',
    labelKey: 'orgPersonnel.operationGuide.actions.createOrganization',
  },
  employee: {
    destination: '/personnel/employees',
    labelKey: 'orgPersonnel.operationGuide.actions.createEmployee',
  },
  account: {
    destination: '/personnel/accounts',
    labelKey: 'orgPersonnel.operationGuide.actions.createAccount',
  },
} as const

export type PersonnelRecordCreationType =
  keyof typeof personnelRecordCreationActions
