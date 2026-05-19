export const equipmentTooling = {
  layout: {
    title: '设备工装中心',
    tabs: {
      overview: '资产看板',
      furnaces: '炉台资产',
      molds: '模具档案',
      loans: '模具流转',
      drawings: '图纸档案',
      partners: '合作单位',
    },
  },
  maintenanceCenter: {
    tabs: {
      overview: '概览',
      records: '维保记录',
    },
  },
  common: {
    unknownError: '未知错误',
  },
  imageUpload: {
    previewAlt: '图片预览',
    actions: {
      replace: '替换',
    },
    state: {
      uploading: '上传中...',
      captureOrUpload: '拍摄或上传',
      waitForSync: '请等待同步完成',
      formatHint: 'JPG / PNG / 最大 5.0MB',
    },
    toast: {
      uploaded: '图片上传成功',
      failed: '图片上传失败：{{message}}',
    },
  },
  furnaces: {
    page: {
      title: '炉台资产档案中心',
      description: '数字化热处理设备台账',
      searchPlaceholder: '搜索炉台编号或名称...',
    },
    actions: {
      add: '新增炉台资产',
    },
    confirm: {
      remove: '确定要移除这台炉台资产吗？',
    },
    toast: {
      removed: '炉台已移除',
      updated: '炉台档案已更新',
      created: '新炉台已登记',
    },
    status: {
      idle: '空闲',
      heating: '运行中',
      cooling: '冷却中',
      maintenance: '维护中',
      fault: '故障',
      unknown: '未知',
    },
    card: {
      type: '类型',
      location: '位置',
      none: '无',
      tempLive: '实时温度',
      maxTemp: '上限 {{value}}°C',
      sensorOffline: '传感器离线',
    },
    stats: {
      totalUnits: '总炉台数',
      runningNow: '当前运行',
      live: '实时',
      maintenance: '维护中',
      faultAlert: '故障预警',
    },
    dialog: {
      title: {
        edit: '编辑设备档案',
        create: '登记新炉台资产',
      },
      description: '录入设备编号、最高温度和所在区域信息',
      fields: {
        sn: '设备编号',
        name: '设备名称',
        type: '设备类型',
        location: '所在区域',
        maxTemp: '最高温度 (°C)',
        description: '备注说明',
      },
      placeholders: {
        sn: '例如 FURN-2024-01',
        name: '例如 1号真空炉',
        type: '例如 真空电炉',
        location: '例如 A区',
        description: '填写详细说明或历史记录...',
      },
      defaults: {
        type: '真空电炉',
      },
      validation: {
        snRequired: '请输入炉台编号',
        nameRequired: '请输入炉台名称',
        typeRequired: '请输入炉台类型',
        maxTempPositive: '最高温度必须大于 0',
      },
      actions: {
        cancel: '取消',
        save: '保存',
      },
    },
  },
  molds: {
    defaults: {
      uncategorized: '未分组',
    },
    page: {
      title: '模具资产主档案',
      description: 'MOLD_ASSET_REPOSITORY / 系统自动追踪模具寿命与维保状态',
      searchPlaceholder: '搜索模具编号、名称或库位...',
    },
    actions: {
      add: '录入模具资产',
      addInGroup: '在此分组新增资产',
    },
    confirm: {
      remove: '确定要移除这项模具资产吗？此操作不可撤销。',
    },
    toast: {
      removed: '模具资产已移除',
      updated: '模具档案已更新',
      created: '新模具已入库',
    },
    status: {
      idle: '闲置中',
      inUse: '生产中',
      checking: '待检验',
      maintenance: '维修中',
      retired: '已报废',
      lentOut: '已借出',
      borrowed: '已借入',
      unknown: '未知状态',
    },
    group: {
      assets: '{{count}} 个资产',
      grouping: '模具分组',
      sku: 'SKU：',
      expired: '{{count}} 个到期',
      maintain: '{{count}} 个维保',
      healthy: '健康',
    },
    card: {
      sn: '编号：{{sn}}',
      masterSpec: '主规格',
      sku: 'SKU',
      unset: '未设置',
      location: '库位',
      pendingLocation: '待录入',
      healthIndex: '健康指数',
      cycles: '当前 {{current}} / 上限 {{limit}}',
      totalLife: '累计 {{total}}',
    },
    empty: {
      title: '暂无模具资产',
      description: '请点击下方按钮初始化模具资产档案。',
      init: '立即初始化',
    },
    dialog: {
      title: {
        edit: '编辑模具档案',
        create: '录入模具资产',
      },
      description: {
        prefix: '录入模具编号与寿命阈值后，系统会根据循环次数自动触发',
        alertCode: 'MAINTENANCE ALERT',
        suffix: '维保预警。',
      },
      healthIndex: '健康指数 / HEALTH INDEX',
      realtimeSync: '实时同步',
      metrics: {
        current: '当前：{{value}}',
        total: '上限：{{value}}',
      },
      fields: {
        sn: '模具编号 / SERIAL NO.',
        name: '模具名称 / ASSET NAME',
        group: '所属分组 / GROUP SCHEMA',
        location: '存放库位 / BIN LOCATION',
        currentCycles: '当前次数（初始值）',
        maxCycles: '寿命上限 / LIFESPAN',
        maintenanceThreshold: '预警阈值 / ALERT POINT',
        image: '资产照片 / MASTER IMAGE',
        description: '备注 / MEMO',
      },
      labels: {
        image: '主资产照片',
        linkedDrawings: '已关联图纸（{{count}}）',
      },
      placeholders: {
        sn: 'M-2024-XXX',
        name: '成型模 / 注塑模...',
        newGroup: '请输入新分组名称...',
        selectRegistry: '选择已有分组',
        location: 'SECTION-A-01',
        currentCycles: '输入当前已使用次数',
        description: '填写规格说明...',
      },
      emptyLinkedDrawings: '暂无关联图纸',
      actions: {
        useChooser: '选择器',
        newGroup: '新分组',
        archive: '归档',
        cancel: '取消',
        save: '确认保存档案',
      },
      validation: {
        snRequired: '请输入模具编号',
        nameRequired: '请输入模具名称',
        maxCyclesPositive: '寿命上限必须大于 0',
        maintenanceThresholdPositive: '预警阈值必须大于 0',
        duplicateSn: '编号 {{sn}} 已存在，请更换唯一编号',
      },
    },
  },
  partners: {
    page: {
      title: '合作单位档案',
      description: 'PARTNER_REGISTRY / 协作工厂与内外部单位管理',
    },
    actions: {
      add: '新增合作单位',
    },
    confirm: {
      remove: '确定要移除这个合作单位吗？历史记录可能回退为原始 ID。',
    },
    toast: {
      removed: '合作单位已移除',
      updated: '合作单位已更新',
      created: '新合作单位已添加',
      loadFailed: '从遥测桥接服务加载单位数据失败。',
    },
    validation: {
      nameRequired: '单位名称不能为空',
    },
    types: {
      internal: '内部厂区',
      external: '外部合作方',
      internalShort: '内部',
      externalShort: '外部',
    },
    dialog: {
      title: {
        edit: '编辑合作单位',
        create: '新增合作单位',
      },
      fields: {
        name: '单位名称',
        type: '单位类型',
        contact: '联系人',
        phone: '电话',
        address: '位置说明',
      },
      placeholders: {
        name: '例如 总装一厂 / 仓储中心',
        contact: '请输入姓名',
        phone: '请输入电话号码',
        address: '填写位置或备注',
      },
      actions: {
        cancel: '取消',
        save: '保存',
      },
    },
    card: {
      contact: '联系人',
      phone: '电话',
      location: '位置',
    },
    empty: {
      title: '合作单位列表为空',
    },
  },
  loans: {
    defaults: {
      homeFactory: '总部一厂',
    },
    page: {
      title: '模具流转记录',
      description: 'MOLD_FLOW_LOGS / 追踪跨厂区、跨车间的临时借调流转',
      searchPlaceholder: '搜索模具编号、名称或经办人...',
    },
    actions: {
      add: '登记流转记录',
      return: '确认归还',
    },
    dialog: {
      title: {
        edit: '编辑流转记录',
        create: '登记流转记录',
      },
      description: '追踪模具在单位间的物理位置变动与状态同步',
      modes: {
        lend: '我方借出',
        borrow: '他方借入',
      },
      fields: {
        mold: '选择借出模具',
        fromFactory: '借出单位',
        toFactory: '接收单位',
        externalSn: '外部模具编号',
        moldName: '模具名称',
        sourceFactory: '来源单位',
        currentCycles: '当前寿命计数',
        contact: '对接 / 经办人',
        loanDate: '发生日期',
        expectedReturnDate: '预计归还',
        remarks: '流转备注',
        photo: '影像校验',
      },
      placeholders: {
        selectMold: '请选择闲置模具资产',
        selectSourceFactory: '选择借出单位',
        selectTargetFactory: '选择接收单位',
        moldSn: '例如 M-EXT-001',
        moldName: '例如 外部腔体模具',
        selectPartner: '选择合作单位',
        contact: '填写经办人姓名',
        remarks: '输入备注...',
      },
      actions: {
        loading: '正在加载...',
        close: '关闭',
        save: '保存',
        create: '立即创建',
        cancel: '取消',
        submit: '提交 {{mode}}',
      },
    },
    validation: {
      incompleteLend: '请完整填写借出信息。',
      incompleteBorrow: '请完整填写借入模具信息。',
    },
    confirm: {
      return: '确认该模具已经运回并完成归还？',
      createDescription: '正在登记模具流转记录，此操作将同步变更关联模具的库存状态，并开启时间窗追踪。',
    },
    toast: {
      createdLend: '借出记录已创建',
      createdBorrow: '借入记录已创建',
      returned: '归还已确认',
    },
    status: {
      returned: '已归还',
      overdue: '已逾期',
      lent: '借出中',
      borrowed: '借入中',
    },
    card: {
      photoTitle: '影像校验',
      photoDescription: '登记时留存的对照照片，用于回库核验。',
      path: '流转路径',
      agent: '经办人',
      cycle: '时间窗口',
      returnDate: '归还日期',
      memo: '备注：',
    },
    empty: {
      title: '暂无流转记录',
      description: '等待接收活跃的流转记录同步...',
    },
    borrow: {
      autoDescription: '借入自 {{fromFactory}}',
    },
  },
  drawings: {
    page: {
      title: '图纸档案库',
      description: 'DRAWING_ARCHIVE / 集中管理模具图纸与技术文件',
      searchPlaceholder: '搜索图纸名称或关联模具编号...',
    },
    actions: {
      add: '登记图纸档案',
      download: '下载文件',
    },
    tooltips: {
      history: '审计历史',
      obsolete: '标记作废',
      activate: '恢复现行',
    },
    card: {
      asset: '关联资产',
      date: '归档日期',
      unbound: '未绑定',
    },
    status: {
      active: '现行',
      obsolete: '作废',
    },
    empty: {
      title: '图纸档案为空',
    },
    dialog: {
      title: {
        edit: '编辑图纸',
        create: '上传图纸',
      },
      fields: {
        name: '图纸名称',
        type: '文件类型',
        version: '版本号',
        mold: '关联资产',
        source: '图纸来源',
        remarks: '档案备注',
      },
      placeholders: {
        name: '例如 400C 成型模总图',
        version: 'V1.0',
        selectMold: '选择关联资产',
        remarks: '填写改模记录或备注...',
      },
      warnings: {
        unbindConfirm: '检测到资产解绑动作。该图纸将不再与模具关联，是否确认脱钩？',
      },
      actions: {
        cancel: '取消',
        save: '完成归档',
      },
    },
    types: {
      twoD: '2D 图纸 (DWG/PDF)',
      threeD: '3D 模型 (STP/XT)',
      techSpec: '技术规格书',
      other: '其他附件',
    },
    options: {
      independent: '独立文件',
    },
    source: {
      ready: '已就绪',
      archived: '已归档文件',
      reupload: '重新上传',
      clickUpload: '点击上传文件',
    },
    toast: {
      nameRequired: '请填写图纸名称。',
      fileRequired: '请上传图纸文件。',
      uploading: '正在上传源文件...',
      uploaded: '文件上传完成',
      updated: '图纸已更新',
      created: '图纸已归档',
      conflict: '数据已被其他人更新，请刷新后重试。',
      saveFailed: '保存失败：{{message}}',
      statusObsolete: '图纸已标记为作废',
      statusActive: '图纸已恢复为现行',
    },
    validation: {
      nameRequired: '请输入图纸名称',
      fileRequired: '请上传图纸文件',
    },
    audit: {
      title: '生命周期审计 / LIFE-CYCLE',
      description: '文件 ID：{{fileId}} / 资产：{{asset}}',
      global: '全局档案',
      operator: '操作员',
      empty: '该文件暂无审计流水记录',
      close: '退出审计视图',
    },
  },
  dashboard: {
    error: {
      title: '遥测链路中断',
      description: '看板聚合服务暂不可用，请检查网络或后端容器状态。',
      retry: '重试',
    },
    header: {
      title: '模具资产遥测中心',
      systemHealthLabel: '系统健康指数',
      stable: '稳定运行',
      activeSensorsLabel: '活跃感知点',
      vectors: '个向量',
    },
    activity: {
      title: '资产动态流',
      live: '实时',
      empty: '暂无最近动态',
      item: '{{contactPerson}} 处理了资产流转 - {{status}}',
    },
    summary: {
      avgLifespan: '平均寿命消耗',
      criticalAlerts: '关键预警',
    },
    stats: {
      units: '台',
      saturation: '占比',
      cards: {
        total: {
          title: '模具库存',
          subtext: '资产总量',
        },
        idle: {
          title: '闲置资产',
          subtext: '库中待命',
        },
        production: {
          title: '生产中',
          subtext: '正在使用',
        },
        maintenance: {
          title: '维保队列',
          subtext: '待处理维保',
        },
        overdue: {
          title: '借出逾期',
          subtext: '待归还预警',
        },
        retired: {
          title: '已退役',
          subtext: '报废资产',
        },
      },
    },
    detail: {
      statusTitle: '状态热力图',
      lifecycleTitle: '生命周期扫描',
      labels: {
        idle: '闲置',
        production: '生产',
        maintenance: '维保',
        scrapped: '报废',
      },
      avgLife: '平均寿命消耗',
      activeAssets: '活跃资产',
      thermalLoad: '热负荷',
      normal: '正常',
      optimal: '最优状态',
      unitsValue: '{{value}} 台 / {{percentage}}%',
    },
    warnings: {
      title: '关键资产预警',
      retired: '已退役',
    },
  },
} as const
