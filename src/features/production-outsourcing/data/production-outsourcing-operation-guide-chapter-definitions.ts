export const productionOutsourcingOperationGuideDefinitions = {
  tasksAndPartners: {
    path: '/production-outsourcing/task-and-partner-operation-guide',
    chapters: [
      { key: 'preparation', references: ['partners', 'orders'] },
      { key: 'partners', references: ['partners'] },
      { key: 'tasks', references: ['orders'] },
      { key: 'release', references: ['orders', 'transfers'] },
    ],
  },
  sendReturnInspection: {
    path: '/production-outsourcing/send-return-inspection-scanning-guide',
    chapters: [
      { key: 'preparation', references: ['transfers'] },
      { key: 'registration', references: ['transfers'] },
      { key: 'send', references: ['transfers'] },
      { key: 'return', references: ['transfers'] },
      { key: 'inspection', references: ['transfers'] },
    ],
  },
} as const

export type ProductionOutsourcingOperationGuideKind =
  keyof typeof productionOutsourcingOperationGuideDefinitions

export const productionOutsourcingOperationGuideStepKeys = [
  'first',
  'second',
  'third',
  'fourth',
] as const

export const productionOutsourcingOperationGuideReferencePaths = {
  partners: '/production-outsourcing/partners',
  orders: '/production-outsourcing/orders',
  transfers: '/production-outsourcing/transfers',
} as const
