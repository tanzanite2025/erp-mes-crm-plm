export const productionOutsourcing = {
  layout: {
    tabs: {
      partners: 'Outsource Partners',
    },
  },
  partners: {
    title: 'Outsource Partner Management',
    description:
      'Maintain production-domain outsource partner master data. Suppliers are optional references only; process scope, tasks, send, return, and inspection will stay in this outsourcing domain as separate tabs.',
    searchPlaceholder: 'Search code, name, contact, or supplier',
    loadingFailed: 'Failed to load outsource partners',
    empty: 'No outsource partner records yet',
    noAddress: 'No address',
    noManagePermission: 'The current account cannot manage outsource partners',
    deleteConfirm: 'Delete outsource partner "{{name}}"?',
    leadTimeValue: '{{count}} days',
    actions: {
      add: 'New outsource partner',
    },
    filters: {
      all: 'All statuses',
    },
    stats: {
      total: 'Partners',
      active: 'Active',
      onReview: 'On review',
      inactive: 'Inactive',
    },
    statuses: {
      ACTIVE: 'Active',
      ON_REVIEW: 'On review',
      INACTIVE: 'Inactive',
    },
    qualityGrades: {
      NONE: 'Unrated',
      A: 'Grade A',
      B: 'Grade B',
      C: 'Grade C',
    },
    fields: {
      code: 'Partner code',
      name: 'Partner name',
      supplier: 'Linked supplier',
      status: 'Status',
      qualityGrade: 'Quality grade',
      leadTimeDays: 'Standard lead time',
      contactPerson: 'Contact',
      contactPhone: 'Phone',
      email: 'Email',
      address: 'Address',
      settlementPolicy: 'Settlement policy',
      notes: 'Notes',
    },
    placeholders: {
      name: 'e.g. anodizing subcontractor',
      supplier: 'No supplier link',
    },
    dialog: {
      createTitle: 'New outsource partner',
      editTitle: 'Edit outsource partner',
      description:
        'This dialog maintains partner master data only. Process scope and outsource execution stay in separate links.',
    },
    validation: {
      required: 'Partner code and name are required',
    },
    toasts: {
      saved: 'Outsource partner saved',
      deleted: 'Outsource partner deleted',
    },
  },
}
