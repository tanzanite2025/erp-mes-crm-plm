export const attendanceManagementOperationGuideChapters = [
  {
    key: 'overview',
    topics: ['prepareEmployees', 'chooseWorkflow', 'understandDataSources'],
    referenceKeys: ['employees', 'leave', 'devices', 'ranking'],
  },
  {
    key: 'leave',
    topics: [
      'chooseApplicant',
      'previewDuration',
      'submitRequest',
      'trackAndCancel',
    ],
    referenceKeys: ['leave', 'employees'],
  },
  {
    key: 'devices',
    topics: [
      'configureDevice',
      'matchEmployees',
      'checkConnection',
      'verifyEvents',
    ],
    referenceKeys: ['devices', 'employees'],
  },
  {
    key: 'ranking',
    topics: [
      'readRanking',
      'checkRankingInputs',
      'understandRankingCalculation',
    ],
    referenceKeys: ['ranking', 'employees', 'leave'],
  },
  {
    key: 'troubleshooting',
    topics: [
      'missingEmployee',
      'leaveFailure',
      'missingDeviceEvents',
      'accessOrServerError',
    ],
    referenceKeys: ['employees', 'leave', 'devices', 'ranking'],
  },
] as const

export type AttendanceManagementOperationGuideChapter =
  (typeof attendanceManagementOperationGuideChapters)[number]

export const attendanceManagementOperationGuideReferencePages = {
  employees: '/personnel/employees',
  leave: '/attendance-management/leave',
  devices: '/attendance-management/devices',
  ranking: '/attendance-management/hall-of-fame',
} as const
