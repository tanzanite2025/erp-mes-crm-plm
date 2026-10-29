export const organizationAndAccountOperationGuideChapters = [
  {
    key: 'relationships',
    topics: [
      'recommendedSequence',
      'optionalAccountBinding',
      'productionBoundary',
    ],
    referenceKeys: ['organization', 'employees', 'accounts', 'permissions'],
  },
  {
    key: 'organization',
    topics: [
      'createCompany',
      'createDepartment',
      'createProductionUnit',
      'verifyOrganization',
    ],
    referenceKeys: ['organization', 'productionArchitecture'],
  },
  {
    key: 'employees',
    topics: [
      'checkExistingEmployee',
      'createEmployeeRecord',
      'maintainEmployeeDetails',
      'importEmployees',
    ],
    referenceKeys: ['employees', 'organization'],
  },
  {
    key: 'accounts',
    topics: [
      'prepareAccount',
      'bindEmployee',
      'setCredentials',
      'choosePermissionPreset',
    ],
    referenceKeys: ['accounts', 'employees', 'permissions'],
  },
  {
    key: 'permissions',
    topics: [
      'selectTargetAccount',
      'understandPermissionSources',
      'grantRequiredActions',
      'verifyEffectiveAccess',
    ],
    referenceKeys: ['permissions', 'accounts'],
  },
  {
    key: 'personnelChanges',
    topics: [
      'transferEmployee',
      'disableAccount',
      'handleResignation',
      'reviewAccountHistory',
    ],
    referenceKeys: ['employees', 'accounts', 'permissions'],
  },
  {
    key: 'troubleshooting',
    topics: [
      'cannotSignIn',
      'missingMenus',
      'cannotPerformAction',
      'bindingOrServerError',
    ],
    referenceKeys: ['accounts', 'permissions', 'employees'],
  },
] as const

export type OrganizationAndAccountOperationGuideChapter =
  (typeof organizationAndAccountOperationGuideChapters)[number]

export const organizationAndAccountOperationGuideReferencePages = {
  organization: '/personnel/org',
  employees: '/personnel/employees',
  accounts: '/personnel/accounts',
  permissions: '/personnel/rights',
  productionArchitecture: '/production-architecture/mindmap',
} as const

export const organizationAndAccountOperationGuideConceptKeys = [
  'organization',
  'employee',
  'account',
  'permission',
] as const
