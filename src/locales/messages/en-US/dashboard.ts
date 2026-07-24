export const dashboard = {
  page: {
    title: 'Digital Factory Real-Time Operations Center',
    description:
      'End-to-end production monitoring, real-time KPI tracking, and delivery gap alerts',
    tabs: {
      overview: 'Overview',
      calendar: 'Production Calendar',
      reports: 'Delivery Progress',
      notifications: 'System Activity',
    },
    throughput: {
      title: 'Throughput Overview',
      description: 'Real-time output distribution across {{levelName}}',
      empty: {
        title: 'Waiting for {{levelName}} attachment...',
        description: 'Configure visible {{levelName}} entries via settings...',
      },
    },
    scanStream: {
      title: 'Latest Scan Activity',
      description: 'Raw event streams from cameras and scanners',
    },
    segmentDialog: {
      title: 'Configure Visible {{levelName}}',
      description:
        'Choose which {{levelName}} entries should appear in the overview chart.',
      emptyTitle: 'No {{levelName}} defined',
      emptyDescription:
        'Please go to "Production Architecture -> Line Mindmap" and add {{levelName}} first.',
      cancel: 'Cancel',
      save: 'Save Configuration',
    },
    pendingConnection: {
      label: 'Pending Connection',
      description:
        'The real data pipeline for this metric is not connected yet',
    },
    kpi: {
      wip: {
        title: 'Real-time WIP',
        unit: 'UNIT',
        description: 'Total WIP (Layup / Pressing / Finishing)',
      },
      scrap: {
        title: 'Daily Scrap Flow',
        unit: 'NODES',
        delta: 'Risk Delta: +{{value}} vs Prev',
      },
      gap: {
        title: 'Delivery Gap Warning',
        unit: 'ORDERS',
        description: 'Desc: {{value}}',
      },
      activation: {
        title: 'SN Activation Total',
        unit: 'SN_INDEX',
        description: 'Verified Physical ID Sync Total',
      },
    },
    activities: {
      empty: 'No activity found',
      waiting: 'Waiting for stream...',
    },
    recentSales: {
      process: 'Level 3',
      result: 'Result',
      order: 'Order',
      note: 'Note',
      owner: 'Owner',
      location: 'Location',
      timeUnit: {
        now: 'Just now',
        minutes: '{{count}}m ago',
        hours: '{{count}}h ago',
      },
      demo: {
        pass: 'PASS',
        lost: 'TAG_LOST_ALERT',
        name: 'WANG FIVE',
      },
    },
    systemEvents: {
      categories: {
        security: 'Security Feedback',
        audit: 'Audit Logstream',
        equipment: 'Equipment Status',
        process: 'Hierarchy Params',
      },
      equipment: {
        waiting: 'Waiting for equipment feedback...',
        offline: 'Stream Offline...',
        mold: 'Mold',
        furnace: 'Furnace',
        stats: 'Life Cycle',
        temp: 'Temp',
      },
    },
    reports: {
      empty: {
        title: 'No Sales Orders',
        description:
          'No sales orders were found. Please create or sync orders in the Sales module first.',
      },
      error: {
        title: 'Failed to Load Delivery Progress',
        description:
          'The page remains available. Please troubleshoot based on the reason below and retry.',
        reasonPrefix: 'Reason: ',
        reasons: {
          unauthorized: 'Session expired. Please sign in again.',
          forbidden: 'Missing permission to access production reports.',
          network: 'Network issue or request timeout.',
          server: 'Server failed to process the request.',
          invalidResponse: 'Invalid response format from API.',
          unknown: 'Unknown error.',
        },
      },
      labels: {
        batch: 'BATCH',
        target: 'TARGET',
        real: 'REAL',
        wip: 'WIP',
        gap: 'GAP',
        done: 'DONE',
      },
    },
    calendar: {
      title: 'Manufacturing Execution Calendar',
      description:
        'Multi-dimensional tracking of output, quality, and performance',
      error: {
        loadStats: 'Failed to load production stats.',
        loadCalendar: 'Error loading production calendar data.',
        loadDetails: 'Failed to load production details for the day.',
      },
      stats: {
        totalOutput: 'Monthly Output',
        estPerformance: 'Est. Performance',
        syncRealtime: 'Syncing Real-time',
      },
      view: {
        timeline: 'Factory Production Timeline',
        today: 'Today',
        moreNodes: 'More Hierarchy Nodes',
        days: {
          sun: 'Sun',
          mon: 'Mon',
          tue: 'Tue',
          wed: 'Wed',
          thu: 'Thu',
          fri: 'Fri',
          sat: 'Sat',
        },
      },
      detail: {
        title: 'Production Execution Detail',
        snapshot: 'Daily Manufacturing Snapshot',
        dateFormat: 'MMMM d, yyyy',
        noRecords: 'No production records found',
        comingSoon: 'Coming Soon',
        qualityData: 'Quality Metrics (Unavailable)',
        qualityWaiting: 'Waiting for quality data stream...',
        generateReport: 'Generate Report',
        item: {
          order: 'Order',
          quantity: 'Qty',
        },
      },
      units: {
        pcs: 'PCS',
      },
    },
  },
} as const
