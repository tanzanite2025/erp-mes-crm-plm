export const dashboard = {
  page: {
    title: '数字化工厂实时概览态势中心',
    description: '全链路生产监控、实时 KPI 追踪与交付缺口预警看板',
    tabs: {
      overview: '全厂概览',
      calendar: '生产日历',
      analytics: '转化漏斗',
      reports: '交付进度',
      notifications: '系统全域动态',
    },
    throughput: {
      title: '各环节产能概览',
      description: '工段实时产量分布',
      empty: {
        title: '等待挂载工段...',
        description: '请通过设置按钮配置显示工段...',
      },
    },
    scanStream: {
      title: '最新扫码动态',
      description: '摄像头与扫码枪原始采集事件流',
    },
    segmentDialog: {
      title: '配置显示工段',
      description: '选择要在全厂概览中展示产量的工段环节。',
      emptyTitle: '暂无工段定义',
      emptyDescription: '请先前往“生产配置 -> 产线管理”添加工段。',
      cancel: '取消',
      save: '保存配置',
    },
    kpi: {
      wip: {
        title: '实时在制品',
        unit: '件',
        description: '铺层/热压/精修总计',
      },
      scrap: {
        title: '今日报废统计',
        unit: '个',
        delta: '较昨日同期: +{{value}}',
      },
      gap: {
        title: '交付缺口预警',
        unit: '单',
        description: '描述: {{value}}',
      },
      activation: {
        title: 'DM 码激活总量',
        unit: '码',
        description: '物理核验绑定总数',
      },
    },
    activities: {
      empty: '暂无最新扫码动态',
      waiting: '等待接收实时数据流...',
    },
    recentSales: {
      process: '工序',
      result: '结果',
      order: '销售单',
      note: '提示',
      owner: '责任人',
      location: '位置',
      timeUnit: {
        now: '刚刚',
        minutes: '{{count}} 分钟前',
        hours: '{{count}} 小时前',
      },
      demo: {
        pass: '合格',
        lost: '标签脱落挂失',
        name: '王五',
      },
    },
    systemEvents: {
      categories: {
        security: '安全风险反馈',
        audit: '管理审计流水',
        equipment: '设备运行状态',
        process: '工艺参数变更',
      },
      equipment: {
        waiting: '等待实时设备反馈...',
        offline: '数据流离线...',
        mold: '模具',
        furnace: '炉台',
        stats: '当前寿命',
        temp: '当前温度',
      },
    },
    analytics: {
      funnel: {
        title: '全链路生产漏斗',
        description: '展示从原始投入到最终成品入库的损耗转化率',
        stages: {
          pending: '待下发',
          inprogress: '生产中',
          done: '已入库',
          delivered: '已交付',
        },
      },
      scrapWorkshop: {
        title: '各车间报废占比',
      },
      moldFrequency: {
        title: '模具使用频率 (TOP 5)',
      },
      states: {
        syncing: '正在同步实时数据流...',
        noActiveStream: '暂无活跃订单流数据',
        waitingOrder: '等待订单全生命周期轨迹同步...',
        noQualityData: '暂无质量检测反馈流',
        waitingQuality: '等待质量管理数据上报...',
        noAssetRecords: '暂无资产运行记录',
      },
      units: {
        order: '单',
        cycle: '次',
      },
    },
    reports: {
      empty: {
        title: '暂无销售订单',
        description: '当前未查询到销售订单，请先在销售模块创建或同步订单。',
      },
      error: {
        title: '交付进度加载失败',
        description: '页面已保留可用状态，请根据原因排查后重试。',
        reasonPrefix: '失败原因：',
        reasons: {
          unauthorized: '登录已过期，请重新登录。',
          forbidden: '缺少生产报表访问权限。',
          network: '网络连接异常或请求超时。',
          server: '服务端处理失败，请联系管理员。',
          invalidResponse: '接口响应格式异常。',
          unknown: '未知错误。',
        },
      },
      labels: {
        batch: '批次',
        target: '目标',
        real: '实绩',
        wip: '在制',
        gap: '缺口',
        done: '已完成',
      },
    },
    calendar: {
      title: '生产日历执行系统',
      description: '每日产量、质量与效能的多维度追踪',
      error: {
        loadStats: '生产汇总数据加载失败。',
        loadCalendar: '生产日历数据加载异常。',
        loadDetails: '当日生产明细加载失败。',
      },
      stats: {
        totalOutput: '月度总产出',
        estPerformance: '预估达成率',
        syncRealtime: '实时同步中',
      },
      view: {
        timeline: '全厂排产执行时序大盘',
        today: '今日',
        moreNodes: '更多环节',
        days: {
          sun: '日',
          mon: '一',
          tue: '二',
          wed: '三',
          thu: '四',
          fri: '五',
          sat: '六',
        },
      },
      detail: {
        title: '生产执行明细',
        snapshot: '每日生产快照',
        dateFormat: 'yyyy年 MMMM d日',
        noRecords: '暂无生产记录',
        comingSoon: '功能开发中',
        qualityData: '质量检测数据 (暂未接入)',
        qualityWaiting: '等待质量管理数据上报...',
        generateReport: '生成报表',
        item: {
          order: '工单',
          quantity: '数量',
        },
      },
      units: {
        pcs: '件',
      },
    },
  },
} as const
