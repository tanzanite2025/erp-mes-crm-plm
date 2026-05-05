export const terminalConfig = {
  moduleTitle: '终端配置',
  tabs: {
    printers: '打印机驱动',
    pda: 'PDA 终端',
    scanners: '扫码设备',
    mobileCapture: '移动采集',
    downloads: '驱动下载',
    guides: '安装说明',
  },
  shared: {
    statusPendingUpload: '待上传',
    statusPlanned: '已规划',
    versionLabel: '版本',
    packageTypeLabel: '类型',
    downloadPending: '下载位待补充',
    viewGuide: '查看接入说明',
  },
  pages: {
    printers: {
      title: '打印机驱动',
      description: '集中维护标签打印、联调工具与打印设备驱动包的发布入口。',
      summary:
        '这里和打印中心分工不同：打印中心负责模板与记录，这里负责终端、驱动与接入包。正式驱动上传后，只需要替换静态清单里的下载链接即可。',
    },
    scanners: {
      title: '扫码设备',
      description: '覆盖扫码枪、固定扫描头和扫描模块的接入说明与参数模板。',
      summary:
        '扫码设备接入建议统一规范成 HID 回车模式或明确的串口协议模板，这样页面表单、产线过站和 PDA 扫码可以共用同一套约定。',
    },
    downloads: {
      title: '驱动下载',
      description: '统一汇总打印机、PDA 与扫码设备的下载位，便于现场快速分发。',
      summary:
        '第一版已经预留了统一下载位和分类卡片。后续如果你们把驱动包放进企业网盘、OSS 或内网文件服务器，只需要把清单里的下载地址补上即可。',
    },
    guides: {
      title: '安装说明',
      description:
        '整理打印机、PDA 与扫码设备部署前后的安装顺序、验收项和注意事项。',
    },
  },
  resources: {
    common: {
      placeholderVersion: 'v1.0 占位',
      windowsDriverPackage: 'Windows 驱动包',
      desktopDebugTool: '桌面调试工具',
      androidPda: 'Android PDA',
      terminalPackage: '终端配置包',
      operationManual: '操作手册',
      configGuide: '配置说明',
      parameterTemplate: '参数模板',
    },
    printers: {
      labelPrinters: {
        title: '标签打印机',
        description: '适用于成品标签、条码补打与批次重打场景。',
        items: {
          tsc: {
            title: 'TSC 标签打印机通用驱动',
            target: 'TSC / TTP / TDP 系列',
            note: '建议和打印中心模板配置配套发布，驱动包上传后可直接替换下载链接。',
          },
          zebra: {
            title: 'Zebra 工业打印机驱动',
            target: 'Zebra ZT / GK 系列',
            note: '适合仓储和产线标签枪联动打印。',
          },
        },
      },
      debugTools: {
        title: '打印调试工具',
        description: '用于端口检查、纸张校准与打印自检。',
        items: {
          portTool: {
            title: '打印端口联调工具',
            target: 'USB / 网口打印机',
            note: '建议与打印中心联调一起交付，减少模板正常但驱动未连通的问题。',
          },
        },
      },
    },
    pda: {
      workTerminals: {
        title: 'PDA 作业终端',
        description: '适用于入库、出货、盘点与现场扫码作业。',
        items: {
          browserShell: {
            title: 'PDA 浏览器壳配置包',
            note: '用于配置全屏、固定首页与自动唤起扫码键。',
          },
          offlineGuide: {
            title: 'PDA 离线缓存说明包',
            note: '描述断网缓存、重连同步和异常回传处理策略。',
          },
        },
      },
    },
    scanners: {
      deviceModules: {
        title: '扫码枪与扫描模块',
        description: '覆盖 HID 键盘模式、串口模式和固定扫描头调试。',
        items: {
          scannerGuide: {
            title: '扫码枪配置手册',
            target: 'USB HID 扫码枪',
            note: '建议默认切到回车结尾模式，便于 ERP 表单直接收枪。',
          },
          fixedHeadTemplate: {
            title: '固定扫描头串口参数模板',
            target: '串口 / 网口扫描头',
            note: '用于产线过站或自动触发采集场景。',
          },
        },
      },
    },
  },
  guides: {
    printerFlow: {
      title: '打印机接入流程',
      description: '先装驱动，再做打印模板联调。',
      points: [
        '先确认打印机接口是 USB 还是网口，再选择对应驱动包。',
        '驱动安装完成后，到打印中心验证模板、纸张尺寸和打印方向。',
        '联调通过后，再通知现场批量部署，避免一边改模板一边装驱动。',
      ],
    },
    pdaFlow: {
      title: 'PDA 终端上线流程',
      description: '优先确保网络、扫码键映射和浏览器壳配置。',
      points: [
        '建议使用固定浏览器或壳应用，首页直达业务页面，减少操作层级。',
        '现场要验证 Wi-Fi 漫游、离线缓存和重新同步行为。',
        '扫描规则变更后，要同步更新终端说明文档和培训清单。',
      ],
    },
    scannerChecklist: {
      title: '扫码设备验收项',
      description: '避免“能扫但不好用”的隐性问题。',
      points: [
        '确认扫码后是否自动补回车，避免用户每次手动提交。',
        '确认设备对一维码、二维码和低质量标签的识别率。',
        '确认与页面输入框、弹窗表单和批量模式的兼容性。',
      ],
    },
  },
  pda: {
    page: {
      title: 'PDA 终端',
      description:
        'PDA 扫码工作台，直接调用 /pda/ingest，并复用后端持久化的一维码协议默认值。',
      openShell: '打开扫码终端',
      configLoading: '配置加载中',
      configReady: '配置已就绪',
      autoSubmitOn: '自动提交已开启',
      autoSubmitOff: '自动提交已关闭',
    },
    workbench: {
      title: '扫码采集工作台',
      description:
        '手机摄像头、PDA 扫描头或扫码枪采到的原始码值，都会从这里进入统一采集链路。',
      inputTitle: '摄像头 / 扫码输入',
      inputDescription:
        '扫描到的码值会先保留原始值，再由后端解析协议、路由业务场景，并广播到 PC 端。',
      autoSubmit: '自动提交',
      saveDefaults: '保存默认值',
      inputPlaceholder: '扫描或输入原始条码，例如 25010101R140001',
    },
    fields: {
      symbology: '码制',
      symbologyPlaceholder: '选择码制',
      scene: '业务场景',
      scenePlaceholder: '选择业务场景',
      deviceId: '设备 ID',
      scannedQty: '扫描数量',
      taskId: '任务 ID',
      taskIdPlaceholder: '盘点任务 ID',
      materialCode: '物料编码',
      batchNo: '批次号',
      batchNoPlaceholder: '可选批次号',
    },
    sceneOptions: {
      general: '通用采集',
      stocktake: '盘点桥接',
      production: '生产过站',
      traceability: '质量追溯',
    },
    routing: {
      title: '路由就绪状态',
      ready: '当前 payload 已具备盘点桥接条件。',
      idle: '当前 payload 会走纯采集解析与广播，不会提交盘点结果。',
      submit: '提交采集',
    },
    defaults: {
      title: '协议默认值',
      description: '默认值来自后端持久化配置，不再只存在于前端页面里。',
      sequenceRule: '流水规则',
      sequenceRuleHint:
        'PDA 页面会直接读取这套协议中的 ingestDefaults，并可写回新的设备默认值。',
      payloadPreview: '载荷预览',
    },
    payload: {
      rawCode: '原始码值',
      symbology: '码制',
      scene: '场景',
      deviceId: '设备 ID',
      taskId: '任务 ID',
      materialCode: '物料编码',
      batchNo: '批次号',
      scannedQty: '扫描数量',
    },
    response: {
      title: '采集响应',
      description:
        '后端返回解析结果、命中的产品或物料，以及是否桥接到了盘点提交流程。',
      bridged: '已桥接',
      ingestOnly: '仅采集',
      productionDate: '生产日期',
      shortTag: '短标记',
      year: '年份',
      month: '月份',
      day: '日期',
      model: '型号',
      appearance: '外观',
      holePrefix: '孔位前缀',
      holes: '孔数',
      serial: '流水号',
      product: '产品',
      material: '物料',
      empty:
        '还没有提交采集请求。扫码后这里会显示协议解析、产品命中和桥接结果。',
    },
    toast: {
      rawCodeRequired: '请先采集或输入条码内容。',
      submitSuccess: '扫码数据已进入采集链路',
      submitFailed: '提交采集请求失败',
      saveDefaultsSuccess: 'PDA 默认 ingest 参数已写回协议配置',
      saveDefaultsFailed: '保存 PDA 默认参数失败',
    },
  },
  pdaShell: {
    page: {
      badge: 'PDA 扫码壳',
      title: '极简常驻扫码壳',
      description:
        '默认自动提交 /pda/ingest。失败按场景入队，重复码自动合并，联网后自动重试。',
      online: '在线',
      offline: '离线',
      configLoading: '配置加载中',
      configReady: '配置已就绪',
      wakeLockOn: '常亮锁定中',
      keepAwake: '保持常亮',
      wakeLockOff: '常亮已关闭',
    },
    actions: {
      enterLockMode: '进入锁定模式',
      exitLockMode: '退出锁定模式',
      keepAwakeOn: '关闭自动常亮',
      keepAwakeOff: '开启自动常亮',
      wakeScanner: '唤起扫码',
      retryScene: '重试当前场景',
      clearSceneQueue: '清空当前场景队列',
      clearAllQueue: '清空全部队列',
      openWorkbench: '打开工作台',
      backToWorkbench: '返回工作台',
      retry: '重试',
      drop: '移除',
      retryBucket: '重试该场景',
    },
    input: {
      placeholder: '扫描条码后自动提交，例如 25010101R140001',
    },
    status: {
      title: '扫描状态',
      waiting: '等待扫描',
      hotkeyWake: '硬件按键已唤起扫码',
      manualWake: '扫码窗口已手动唤起',
      retrySuccess: '重传成功：{{code}}',
      duplicateQueued: '重复失败已合并：{{code}} x{{count}}',
      queuedByScene: '提交失败，已加入 {{scene}} 重传队列',
    },
    stats: {
      autoSubmitTitle: '自动提交',
      autoSubmitValue: '已开启',
      autoSubmitHint: '扫描后 220ms 自动发送',
      currentSceneTitle: '当前场景',
      currentSceneHint: '当前场景待重传数量',
      retryQueueTitle: '重传队列',
      retryQueueHintRetrying: '正在后台重传',
      retryQueueHintIdle: '失败任务本地暂存',
      wakeTitle: '常亮 / 热键',
      wakeReady: '已就绪',
      wakeBestEffort: '尽力支持',
      wakeHint: '音量键唤起依赖浏览器与设备能力',
    },
    queue: {
      sceneBucketsTitle: '场景队列桶',
      sceneDuplicateSummary: '合并重复：{{count}}',
      pendingTitle: '待重试记录',
      pendingLine: '重试 {{attempts}} 次 / 合并 {{duplicates}} 次 / {{error}}',
      waitingRetry: '等待重试',
    },
    hints: {
      lockMode:
        '音量键唤起能力取决于设备浏览器是否分发按键事件。Web 页面无法在真正息屏状态下从系统层唤醒应用；当前实现是“前台锁定模式 + 保持常亮 + 热键尽力拦截”。',
    },
    toast: {
      scanCollected: '扫码已采集',
      submitQueued: '扫码提交失败，已进入重传队列',
      clearSceneQueue: '已清空 {{scene}} 队列',
      clearAllQueue: '已清空全部重传队列',
    },
  },
} as const
