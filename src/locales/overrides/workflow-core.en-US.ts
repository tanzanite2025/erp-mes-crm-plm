export const workflowCoreEnUSOverrides = {
  workflowCore: {
    commands: {
      toasts: {
        added: 'Command template added',
        removed: 'Command template removed',
        loadFailed: 'Failed to load command templates',
      },
    },
    rules: {
      toasts: {
        saveSuccess: 'Plan saved',
        saveFailed: 'Failed to save plan',
      },
    },
  },
} as const
