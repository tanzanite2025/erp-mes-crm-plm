export const systemManagement = {
  layout: {
    tabs: {
      auditEngine: 'Audit Engine',
    },
  },
  statusPage: {
    title: 'System Infrastructure Dashboard',
    subtitle: 'Real-time server health and process integrity monitor',
    forceRefresh: 'Force Refresh',
    footer: {
      nodeTime: 'Node Time: {{time}}',
      runtimeSnapshot: 'Env: {{environment}} / Runtime: {{runtime}}',
    },
  },
  serverIdentity: {
    initializing: 'Initializing...',
    runtimeLabel: 'Runtime: {{runtime}}',
    systemUptime: 'System Uptime',
    environment: 'Environment',
    environmentValue: 'Production Cluster',
  },
  infrastructure: {
    runtimeMemory: 'Container Memory',
    containerUsage: 'Container Usage',
    heapAllocation: 'Go Heap Live',
    runtimeReserved: 'Runtime Reserved',
    goroutines: 'Goroutines',
    cpuCores: 'CPU Cores',
    databasePool: 'Database Pool',
    poolSaturation: 'Pool Saturation',
    metrics: {
      inUse: 'In Use',
      idle: 'Idle',
      wait: 'Wait',
    },
  },
  componentStatus: {
    title: 'Core Engine Connectivity',
    online: 'Online',
    terminated: 'Offline',
    warning: 'Warning',
    labels: {
      postgres: 'PostgreSQL DB',
      redis: 'Redis Key-Value',
      watchdog: 'Watchdog Engine',
      loki: 'Loki Logger',
    },
  },
  diagnostic: {
    title: 'System Self-Diagnostic Alerts',
    activeBadge: '{{count}} Active',
    healthy: 'The system is healthy and no infrastructure anomaly is detected.',
    activeAlerts: 'Active Alerts',
    durationPrefix: 'Duration',
    last24Hours: 'Diagnostic Logs in Last 24 Hours',
    emptyLog: 'No abnormal fluctuation was recorded in the last 24 hours.',
    statusDuration: 'Status: {{status}} | Duration: {{duration}}',
  },
  routingTab: {
    title: 'Notification Routing & Rules Center',
    subtitle:
      'Configure notifications and approvals triggered by business states, maintain listenable event sources and notification templates, and review execution logs when needed.',
    tabs: {
      rules: 'Notification Rules',
      sources: 'Business Event Sources',
      templates: 'Notification Content Templates',
      executions: 'Execution Logs',
    },
    rulesSectionTitle: 'Global Notification Rules',
  },
  permissionAudit: {
    loading: 'Loading permission audit data...',
    header: {
      title: 'Permission Audit Center',
      subtitle:
        'Permission audit / explicit user grants, permission distribution, and core module coverage',
    },
    cards: {
      totalUsers: {
        title: 'Active Accounts',
        caption: 'ACTIVE_ACCOUNTS',
      },
      totalGrantedUsers: {
        title: 'Granted Users',
        caption: 'USER_PERMISSION_GRANTS',
      },
      totalPermissions: {
        title: 'Permission Nodes',
        caption: 'PERMISSION_NODES',
      },
      coreCoverage: {
        title: 'Core Coverage',
        caption: 'CORE_PENETRATION',
      },
    },
    charts: {
      userDistribution: {
        title: 'User Permission Distribution',
        description: 'Distribution of users with and without explicit grants',
      },
      permissionLoad: {
        title: 'Permission Load Comparison',
        description: 'Comparison of explicit permission node load per user',
        barLabel: 'Permission Node Count',
      },
    },
    matrix: {
      title: 'Core Module Access Coverage Matrix',
      description: 'Metrics of functional redundancy per core business module',
      moduleSuffix: 'Module',
      rolesAccess: 'USERS_GRANTED',
    },
    note: '* Audit data reads explicit user grants only, keeping the view aligned with the effective runtime snapshot.',
    modules: {
      warehouse: 'Warehouse',
      trading: 'Trading',
      purchase: 'Purchase',
      mrp: 'MRP',
      apsScheduling: 'APS Scheduling',
      engineering: 'Engineering',
      quality: 'Quality',
      production: 'Production',
      organization: 'Organization',
    },
  },
  logisticsFallback: {
    moduleUnavailable: 'Logistics API module is temporarily unavailable',
    breakerTriggered: 'Circuit Breaker Triggered: {{message}}',
    retry: 'Retry',
  },
  auditEngine: {
    title: 'Audit Engine Monitor',
    subtitle:
      'Transactional audit integration and hot-window activity coverage',
    systemStatus: 'System Status',
    integrated: 'Integrated',
    // Kept for older consumers; the audit engine header uses `integrated`.
    connected: 'Connected',
    modulesCount: '{{connected}}/{{total}} Modules',
    integratedModulesCount: '{{integrated}}/{{total}} Modules',
    loading: 'Loading audit engine data',
    loadFailed: 'Failed to load audit engine data',
    loadFailedDescription:
      'The latest statistics could not be read. The page will not replace real data with zeros.',
    refreshFailed: 'Latest refresh failed',
    refreshFailedDescription:
      'Showing the last successfully loaded statistics. This data may be stale.',
    retry: 'Retry',
    noModules: 'The backend returned no audit module directory.',
    noHotActivity: 'No activity in the last {{days}} days',
    pendingEntities: 'Pending integration ({{count}})',
    unmappedEntities: 'Unmapped log entities found ({{count}})',
    status: {
      operational: 'OPERATIONAL',
      partial: 'PARTIALLY INTEGRATED',
      unavailable: 'DATA UNAVAILABLE',
      noData: 'WAITING FOR DATA',
      healthy: 'INTEGRATED',
      alert: 'PARTIALLY INTEGRATED',
      critical: 'NOT INTEGRATED',
    },
    metrics: {
      coverage: 'Audit Coverage',
      integrationCoverage: 'Integration Coverage',
      activityCoverage: 'Activity Coverage',
      integratedEntities: 'integrated entities',
      activeEntities: 'active entities',
      hotStorage: 'Hot Storage',
      latency: 'Latency',
      days: '30 Days',
      neverSynced: 'NEVER SYNCED',
    },
    footer: {
      policyTitle: 'Engine Archival Policy',
      policyDesc:
        'Integration coverage is the share of entities with transactional audit wiring. Activity coverage only counts entities with events in the last {{days}} hot-window days; archived history does not mean an entity is unintegrated.',
    },
    modules: {
      trading: 'Trading & Sales',
      finance: 'Finance Management',
      equipment: 'Equipment & Tooling',
      engineering: 'Engineering DB',
      cuttingEngine: 'Cutting Engine',
      businessAnalysis: 'Business Analysis',
      warehouse: 'Warehouse & Inventory',
      production: 'Production Execution',
      quality: 'Quality Management',
      organization: 'Organization & People',
      system: 'System Foundation',
      workflow: 'Workflow & Approvals',
    },
  },
} as const
