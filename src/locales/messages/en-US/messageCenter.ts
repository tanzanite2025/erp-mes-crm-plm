export const messageCenter = {
  title: 'Message Center',
  subtitle:
    'Configure notifications and approvals triggered by business states, maintain listenable event sources and notification templates, and review execution logs when needed.',
  tabs: {
    rules: 'Notification Rules',
    sources: 'Business Event Sources',
    templates: 'Notification Content Templates',
    executions: 'Execution Logs',
  },
  pages: {
    rules: {
      title: 'Notification Rules',
      description:
        'Manage notifications and approval rules triggered by business states, filter by event source, and create new listening rules quickly.',
    },
    sources: {
      title: 'Business Event Sources',
      description:
        'Maintain business event sources that enter the message execution chain, with template import, expansion review, and state-driven configuration.',
    },
    templates: {
      title: 'Notification Content Templates',
      description:
        'Maintain reusable notification titles, content, and target links for consistent use across message rules.',
    },
    executions: {
      title: 'Execution Logs',
      description:
        'Review rule matches, notification actions, and approval actions with source-based and outcome-based tracing filters.',
    },
  },
} as const
