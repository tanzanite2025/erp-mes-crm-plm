export const systemManagement = {
  layout: {
    tabs: {
      accounts: "User Accounts",
      auditEngine: "Audit Engine"
    }
  },
  statusPage: {
    title: "System Infrastructure Dashboard",
    subtitle: "Real-time server health and process integrity monitor",
    forceRefresh: "Force Refresh",
    footer: {
      nodeResponseTime: "Node Response Time: {{time}}",
      engineVersion: "XDFC CORE ENGINE V2.6.4 (RELIANCE STABLE)"
    }
  },
  serverIdentity: {
    initializing: "Initializing...",
    runtimeLabel: "Runtime: {{runtime}}",
    systemUptime: "System Uptime",
    environment: "Environment",
    environmentValue: "Production Cluster"
  },
  infrastructure: {
    runtimeMemory: "Runtime Memory",
    heapAllocation: "Heap Allocation",
    goroutines: "Goroutines",
    cpuCores: "CPU Cores",
    databasePool: "Database Pool",
    poolSaturation: "Pool Saturation",
    metrics: {
      inUse: "In Use",
      idle: "Idle",
      wait: "Wait"
    }
  },
  componentStatus: {
    title: "Core Engine Connectivity",
    online: "Online",
    terminated: "Terminated",
    labels: {
      postgres: "PostgreSQL DB",
      redis: "Redis Key-Value",
      watchdog: "Watchdog Engine",
      loki: "Loki Logger"
    }
  },
  diagnostic: {
    title: "System Self-Diagnostic Alerts",
    activeBadge: "{{count}} Active",
    healthy: "The system is healthy and no infrastructure anomaly is detected.",
    activeAlerts: "Active Alerts",
    durationPrefix: "Duration",
    last24Hours: "Diagnostic Logs in Last 24 Hours",
    emptyLog: "No abnormal fluctuation was recorded in the last 24 hours.",
    statusDuration: "Status: {{status}} | Duration: {{duration}}"
  },
  routingTab: {
    title: "Notification Routing & Rules Center",
    subtitle: "Define independent notification listeners to dispatch business events in milliseconds.",
    tabs: {
      rules: "Notification Rules",
      sources: "Business Event Sources",
      templates: "Notification Content Templates",
      executions: "Execution Logs"
    },
    rulesSectionTitle: "Global Notification Rules"
  },
  permissionAudit: {
    loading: "Loading permission audit data...",
    header: {
      title: "Permission Audit Center",
      subtitle: "Permission audit / real-time role load, permission distribution, and core module coverage"
    },
    cards: {
      totalUsers: {
        title: "Active Accounts",
        caption: "ACTIVE_ACCOUNTS"
      },
      totalRoles: {
        title: "Role Definitions",
        caption: "ROLE_DEFINITIONS"
      },
      totalPermissions: {
        title: "Permission Nodes",
        caption: "PERMISSION_NODES"
      },
      coreCoverage: {
        title: "Core Coverage",
        caption: "CORE_PENETRATION"
      }
    },
    charts: {
      userDistribution: {
        title: "Role User Distribution",
        description: "Distribution of user counts per role"
      },
      permissionLoad: {
        title: "Permission Load Comparison",
        description: "Comparison of permission node load per role",
        barLabel: "Permission Node Count"
      }
    },
    matrix: {
      title: "Core Module Access Coverage Matrix",
      description: "Metrics of functional redundancy per core business module",
      moduleSuffix: "Module",
      rolesAccess: "ROLES_ACCESS"
    },
    note: "* Audit data refreshes in real time as roles and permissions change, keeping the permission view aligned with the effective grant state.",
    modules: {
      warehouse: "Warehouse",
      trading: "Trading",
      mrp: "MRP",
      engineering: "Engineering",
      quality: "Quality",
      production: "Production",
      organization: "Organization"
    }
  },
  logisticsFallback: {
    moduleUnavailable: "Logistics API module is temporarily unavailable",
    breakerTriggered: "Circuit Breaker Triggered: {{message}}",
    retry: "Retry"
  },
  auditEngine: {
    title: "Audit Engine Monitor",
    subtitle: "Real-time synchronization status & data timeline coverage",
    systemStatus: "System Status",
    connected: "Connected",
    modulesCount: "{{connected}}/{{total}} Modules",
    status: {
      operational: "OPERATIONAL",
      partial: "PARTIAL MIGRATION",
      healthy: "HEALTHY",
      alert: "ALERT",
      critical: "CRITICAL"
    },
    metrics: {
      coverage: "Audit Coverage",
      hotStorage: "Hot Storage",
      latency: "Latency",
      days: "30 Days",
      neverSynced: "NEVER SYNCED"
    },
    footer: {
      policyTitle: "Engine Archival Policy",
      policyDesc: "The XDFC Audit Engine automatically archives hot data to cold JSON storage after 30 days. Field-level diffing is computed on the backend to ensure database leanness."
    },
    modules: {
      trading: "Trading & Sales",
      finance: "Finance Management",
      equipment: "Equipment & Tooling",
      engineering: "Engineering DB",
      warehouse: "Warehouse & Inventory"
    }
  }
} as const
