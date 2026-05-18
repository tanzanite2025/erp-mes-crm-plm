export const systemManagement = {
  layout: {
    tabs: {
      auditEngine: "审计引擎"
    }
  },
  statusPage: {
    title: "系统基础设施监控看板",
    subtitle: "实时服务器健康与进程完整性监控",
    forceRefresh: "强制刷新",
    footer: {
      nodeResponseTime: "节点响应时间：{{time}}",
      engineVersion: "核心引擎 V2.6.4（稳定版）"
    }
  },
  serverIdentity: {
    initializing: "初始化中...",
    runtimeLabel: "运行时：{{runtime}}",
    systemUptime: "系统运行时长",
    environment: "环境",
    environmentValue: "生产集群"
  },
  infrastructure: {
    runtimeMemory: "运行内存",
    heapAllocation: "堆内存分配",
    goroutines: "并发协程",
    cpuCores: "处理器核心",
    databasePool: "数据库连接池",
    poolSaturation: "连接池饱和度",
    metrics: {
      inUse: "使用中",
      idle: "空闲",
      wait: "等待"
    }
  },
  componentStatus: {
    title: "核心引擎连通性",
    online: "在线",
    terminated: "终止",
    labels: {
      postgres: "PostgreSQL 数据库",
      redis: "Redis 键值服务",
      watchdog: "Watchdog 引擎",
      loki: "Loki 日志服务"
    }
  },
  diagnostic: {
    title: "系统自诊断告警",
    activeBadge: "{{count}} 条活动告警",
    healthy: "系统当前运行状态良好，未发现基础设施异常",
    activeAlerts: "当前活动告警",
    durationPrefix: "持续",
    last24Hours: "过去 24 小时自诊断日志",
    emptyLog: "最近 24 小时内未记录到异常波动。",
    statusDuration: "状态：{{status}} | 持续时长：{{duration}}"
  },
  routingTab: {
    title: "通知路由与规则中心",
    subtitle: "在这里统一配置业务状态触发的通知与审批，维护可监听的业务事件源、通知内容模板，并在需要时查看执行日志。",
    tabs: {
      rules: "通知监听规则",
      sources: "业务事件源",
      templates: "通知内容模板",
      executions: "执行日志"
    },
    rulesSectionTitle: "全局通知监听规则"
  },
  permissionAudit: {
    loading: "权限审计数据加载中...",
    header: {
      title: "权限审计中心",
      subtitle: "权限审计 / 显式用户授权、权限分布与核心模块覆盖率"
    },
    cards: {
      totalUsers: {
        title: "当前用户总量",
        caption: "ACTIVE_ACCOUNTS"
      },
      totalGrantedUsers: {
        title: "已授权用户数",
        caption: "USER_PERMISSION_GRANTS"
      },
      totalPermissions: {
        title: "权限节点数",
        caption: "PERMISSION_NODES"
      },
      coreCoverage: {
        title: "核心覆盖率",
        caption: "CORE_PENETRATION"
      }
    },
    charts: {
      userDistribution: {
        title: "用户权限分布",
        description: "按显式授权状态统计用户数量"
      },
      permissionLoad: {
        title: "权限负载对比",
        description: "按用户对比显式权限节点负载",
        barLabel: "权限节点数量"
      }
    },
    matrix: {
      title: "核心模块访问覆盖矩阵",
      description: "按核心业务模块衡量功能覆盖情况",
      moduleSuffix: "模块",
      rolesAccess: "USERS_GRANTED"
    },
    note: "* 审计数据只读取用户显式授权，确保权限视图与运行时快照保持一致。",
    modules: {
      warehouse: "仓储",
      trading: "贸易",
      purchase: "采购",
      mrp: "MRP",
      apsScheduling: "APS排产",
      engineering: "工程",
      quality: "质量",
      production: "生产",
      organization: "组织"
    }
  },
  logisticsFallback: {
    moduleUnavailable: "物流 API 模块暂不可用",
    breakerTriggered: "熔断器触发：{{message}}",
    retry: "重试"
  },
  auditEngine: {
    title: "审计引擎监控面板",
    subtitle: "实时同步状态与数据时间线覆盖率",
    systemStatus: "系统状态",
    connected: "已连接",
    modulesCount: "{{connected}}/{{total}} 个模块",
    status: {
      operational: "运行中",
      partial: "部分迁移中",
      healthy: "健康",
      alert: "告警",
      critical: "中断"
    },
    metrics: {
      coverage: "审计覆盖率",
      hotStorage: "热数据存储",
      latency: "同步延迟",
      days: "30 天",
      neverSynced: "从未同步"
    },
    footer: {
      policyTitle: "引擎归档政策",
      policyDesc: "审计引擎会在 30 天后自动将热数据转存至冷 JSON 存储。字段级 Diff 在后端完成计算，以确保数据库性能。"
    },
    modules: {
      trading: "销售与贸易管理",
      finance: "财务核算中心",
      equipment: "设备与模具资产",
      engineering: "工程研发数据库",
      warehouse: "智能仓储系统"
    }
  }
} as const
