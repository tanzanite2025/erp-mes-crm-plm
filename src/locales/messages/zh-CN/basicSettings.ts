export const basicSettings = {
  tabs: {
    dmNumbering: "DM码发号规则",
    units: "单位管理",
    sequences: "一维码发号规则",
    enterprise: "企业信息",
    security: "安全设置"
  },
  placeholders: {
    moduleInitialized: "功能模块已接入，等待底层业务逻辑挂载",
    dataEngineLinking: "数据引擎对接中",
    pages: {
      teamMgmt: "工作团队",
      numberingMgmt: "号码规则",
      printTemplateMgmt: "打印模板",
      templateVarMgmt: "模板变量",
      factoryMgmt: "工厂管理",
      lineMgmt: "产线管理",
      sectionMgmt: "区段管理",
      groupMgmt: "组别管理",
      routingMgmt: "途程管理",
      specialRoutingMgmt: "特殊途程",
      warehouseMgmt: "仓库管理",
      binLocationMgmt: "仓库储位"
    }
  },
  sequences: {
    page: {
      title: "一维码发号规则配置中心",
      subtitle: "维护一维码共享发号所需的规则键、周期策略与数字化发号逻辑"
    },
    syncGuard: {
      title: "原子性同步保障",
      description: "所有编号生成均在后端分布式事务中完成。修改逻辑将立即应用至下一次发号周期，确保全局唯一性。"
    },
    actions: {
      refresh: "刷新索引",
      addRule: "新增规则"
    },
    table: {
      headers: {
        ruleKey: "规则标识",
        prefix: "前缀",
        pattern: "生成模式",
        seq: "当前步长",
        reset: "重置策略",
        action: "配置"
      },
      resetPeriod: {
        monthly: "按月清零",
        yearly: "按年清零",
        never: "永久累加"
      },
      emptyLoading: "正在拉取规则架构...",
      emptyNoRules: "暂无规则定义"
    },
    dialog: {
      editTitle: "编辑规则",
      createTitle: "创建规则",
      description: "配置原子化发号逻辑。支持组件：{PREFIX}、{YYMM}、{SEQ}。",
      labels: {
        ruleKey: "规则标识",
        prefix: "前缀",
        padding: "流水位",
        pattern: "生成模板",
        resetStrategy: "重置策略"
      },
      placeholders: {
        ruleKey: "ORDER_ERP_GS",
        prefix: "ERP-",
        pattern: "{PREFIX}{YYMM}{SEQ}"
      },
      resetOptions: {
        monthly: "按月清零 (2403****)",
        yearly: "按年清零 (24******)",
        never: "永不清零 (GA Sequence)"
      },
      actions: {
        cancel: "取消操作",
        syncing: "同步中...",
        commit: "提交规则"
      }
    },
    toast: {
      fetchFailed: "获取编号规则失败",
      requiredMissing: "必填项缺失",
      patternMissingSeq: "生成模式必须包含 {SEQ} 占位符",
      saveSuccess: "规则已保存并同步至云端",
      conflict: "数据已被更新，请刷新后重试",
      saveFailed: "保存失败：{{message}}",
      unknown: "未知错误"
    }
  },
  appearanceMapping: {
    title: "查看外观编码映射",
    description: "当前页面仅展示条码中 1-9 位值对应的外观映射结果。若需编辑，请统一前往产品工程管理下的产品外观主数据页。",
    empty: {
      title: "暂无产品外观",
      description: "当前尚未在产品工程管理下维护任何产品外观，因此这里没有可展示的外观编码映射。"
    },
    fields: {
      label: "外观简称",
      description: "业务详细描述"
    },
    placeholders: {
      label: "如：UD / 3K...",
      description: "输入外观含义说明..."
    },
    actions: {
      reset: "恢复默认",
      save: "保存全局配置",
      gotoProductAppearance: "前往产品外观"
    },
    toasts: {
      saved: "外观映射规则已实时同步至全局",
      reset: "已恢复至系统出厂默认映射"
    }
  },
  units: {
    page: {
      title: "计量单位标准化中心",
      subtitle: "维护跨模块度量标准配置、精度控制与换算规则",
      searchPlaceholder: "搜索编码或显示名称..."
    },
    filters: {
      all: "全部"
    },
    categories: {
      all: "全部分类",
      quantity: "数量",
      weight: "重量",
      length: "长度",
      area: "面积",
      volume: "体积",
      time: "时间",
      other: "其他",
      QUANTITY: "数量",
      WEIGHT: "重量",
      LENGTH: "长度",
      AREA: "面积",
      VOLUME: "体积",
      TIME: "时间",
      OTHER: "其他"
    },
    excel: {
      sheetName: "计量单位导入模板",
      fileName: "XDFC_计量单位导入模板_{{date}}.xlsx",
      headers: {
        code: "单位编码(必填)",
        name: "显示名称(必填)",
        category: "所属分类",
        precision: "小数精度(数字)",
        description: "备注说明"
      },
      categoryQuantity: "数量",
      categoryWeight: "重量",
      categoryLength: "长度",
      categoryArea: "面积",
      categoryVolume: "体积",
      categoryTime: "时间",
      categoryOther: "其他",
      validation: {
        categoryErrorTitle: "选择错误",
        categoryError: "请从下拉列表中选择预定义的分类",
        precisionErrorTitle: "精度错误",
        precisionError: "精度必须是 0 到 10 之间的整数"
      },
      sample: {
        code1: "PCS",
        name1: "件",
        category1: "数量",
        precision1: "0",
        description1: "这是示例数据，导入前请删除此行",
        code2: "KG",
        name2: "千克",
        category2: "重量",
        precision2: "2",
        description2: "支持 2 位小数的重量单位"
      }
    },
    toolbar: {
      downloadTemplate: "模板下载",
      dataImport: "数据导入",
      importing: "导入中...",
      addNew: "新增单位"
    },
    table: {
      code: "单位编码",
      name: "显示名称",
      category: "分类",
      precision: "精度",
      description: "备注",
      status: "状态",
      empty: "未找到匹配的单位"
    },
    statuses: {
      active: "启用",
      inactive: "停用"
    },
    menu: {
      label: "单位操作",
      edit: "编辑资料",
      delete: "删除单位"
    },
    dialog: {
      createTitle: "新增计量单位",
      editTitle: "编辑计量单位",
      description: "定义系统范围内的度量标准与精度规则。",
      fields: {
        code: "单位编码",
        name: "显示名称",
        category: "所属分类",
        precision: "小数精度",
        status: "状态控制",
        description: "描述备注"
      },
      placeholders: {
        code: "如：PCS, KG",
        name: "如：件、千克",
        description: "补充说明该单位的适用场景..."
      },
      status: {
        active: "正常启用",
        inactive: "停用锁定"
      },
      cancel: "取消",
      save: "确认保存配置"
    },
    import: {
      parsing: "正在解析并准备导入模板...",
      missingRequired: "第 {{line}} 行：必填项编码或名称缺失",
      moreIssues: "等 {{count}} 个问题",
      noValidData: "未识别到有效的单位数据，请确认使用了标准模板",
      parseFailed: "Excel 解析失败，请检查文件是否损坏或格式不正确",
      syncing: "正在向服务器同步 {{count}} 条数据...",
      success: "成功导入 {{count}} 个计量单位",
      syncFailed: "服务器同步失败：{{message}}"
    },
    confirmDelete: "确定要删除单位“{{name}}”吗？",
    toasts: {
      created: "单位 {{name}} 已创建",
      updated: "单位 {{name}} 已更新",
      deleted: "单位已成功删除",
      createFailed: "创建单位失败",
      updateFailed: "更新单位失败",
      deleteFailed: "删除单位失败"
    }
  },
  securityPage: {
    loading: "正在进入加密配置中心...",
    title: "系统安全架构",
    subtitle: "系统级安全网关控制与拓扑权限校验中心",
    authCardTitle: "产线拓扑操作授权码 (AUTH_CODE)",
    authCardDescription: "控制产线更名、工序调整及节点溢出的全局验证密码",
    currentPassword: "当前授权码",
    placeholder: "输入至少 4 位数字或字母",
    warning: "高危提醒：修改此码后，所有已打开的产线页面将需要重新输入新码进行验证。",
    actions: {
      saving: "正在写入系统...",
      apply: "提交全局变更"
    },
    auditTitle: "安全审计说明",
    auditItems: {
      first: "1. 该授权码不仅在前端生效，后端 API 层也已强制接入二级鉴权。",
      second: "2. 所有使用该授权码的操作（更名、删除）均会记录在审计日志中。",
      third: "3. 授权码存储在系统核心配置数据库中，具备物理级不可绕过性。"
    },
    version: "系统安全加固版本：1.0.4",
    toasts: {
      loadFailed: "获取安全配置失败",
      minLength: "授权码长度至少为 4 位",
      saved: "安全授权码已更新",
      saveFailed: "更新失败，请重试"
    }
  },
  enterprisePage: {
    title: "企业信息身份中心",
    subtitle: "ENTERPRISE_IDENTITY / 配置系统全局显示的组织名称、数字化平台描述及品牌原子标识",
    form: {
      nameLabel: "系统显示名称 / SYSTEM NAME",
      namePlaceholder: "例如：纤镀复材",
      planLabel: "描述与版本 / PLATFORM DESC",
      planPlaceholder: "例如：数字化管理平台",
      saveButton: "保存配置并同步",
      saving: "正在同步..."
    },
    syncNotice: "SYSTEM_SYNC_NOTICE / 提示：修改后的名称将直接影响全系统的页眉展示、侧边栏头部以及导出的 PDF 报表抬头。建议使用 4-8 个字的中文字符以获得最佳展示效果。",
    toasts: {
      success: "保存成功",
      successDesc: "企业信息已更新，侧边栏将同步刷新。",
      error: "保存出错"
    }
  },
  dmNumbering: {
    page: {
      title: "DM码发号规则中心",
      subtitle: "维护 DM 码共享发号页中的段位规则、仿真配置与当前本地发号逻辑"
    },
    table: {
      headers: {
        segment: "分段",
        description: "含义描述",
        example: "编码示例",
        action: "操作"
      },
      segments: {
        year: {
          name: "年份 (YY)",
          desc: "公元年份后两位，固定 2 位数字编码。"
        },
        month: {
          name: "月份 (3位)",
          desc: "1-9月用原数字，10-12月分别使用 0, N, D 标识。"
        },
        model: {
          name: "产品型号",
          desc: "对应企业内部产品数据字典中的 2 位型号代码。"
        },
        appearance: {
          name: "外观方案",
          desc: "数值 1-9 代表不同的涂装或编织纹理映射。"
        },
        category: {
          name: "二级分类",
          desc: "对应物料主数据中的一级业务属性代码。"
        },
        holes: {
          name: "孔数",
          desc: "轮圈物理孔位数量，固定 2 位数字编码。"
        },
        serial: {
          name: "流水号",
          desc: "单型号独立计数的 5 位 Base-36 压缩编码。"
        }
      }
    },
    simulation: {
      batchSN: "生产批次序列号",
      verifiedStandard: "认证标准"
    },
    toasts: {
      modelRequired: "请先选择具体型号再申请流水号",
      serialSuccess: "型号 {{model}} 已成功发放流水码: {{serial}}"
    },
    footer: {
      title: "工业级追溯协议一致性说明",
      description: "此处的二维码编码配置将作为系统底层的主数据标准。所有移动端采集设备及 MES 执行终端将依据此处的段位定义进行解析。月中特殊代码映射逻辑（如 N=11月, D=12月）已在解析引擎中深度固化，确保数据在 2030 年前的全球唯一性。"
    },
    dialog: {
      editTitle: "编辑{{name}}逻辑",
      helperText: "修改此段位的编码逻辑后，系统将自动下推规则至生产执行层。变更将在下一次 DM 样张重绘时立即生效。",
      mappingMatrix: "映射表定义 (Mapping Matrix)",
      addMapping: "新增映射",
      originalValue: "原始值 (Key)",
      convertedValue: "转换码 (Value)",
      placeholderKey: "如: 11月",
      placeholderValue: "如: N",
      autoRules: "自动增量策略 (Auto Rules)",
      logicDescription: "逻辑描述/起始位",
      autoDescriptionPlaceholder: "如: 自 00001 开始累加",
      step: "步进: 1",
      period: "周期: 按月重置",
      save: "存储逻辑"
    },
    parser: {
      labels: {
        yearSuffix: "年",
        monthSuffix: "",
        categorySuffix: "类",
        appearancePrefix: "外观",
        holesSuffix: "孔",
        serialPrefix: "序列号",
        base36Suffix: " (Base-36)",
        anyCat: "未指定分类 (*)",
        anyModel: "未指定型号 (**)",
        unknownMonth: "未知月份",
        invalidCode: "无效编码",
        errorLength: "编码长度不符合 14 位标准预设",
        months: {
          "0": "10月",
          "1": "1月",
          "2": "2月",
          "3": "3月",
          "4": "4月",
          "5": "5月",
          "6": "6月",
          "7": "7月",
          "8": "8月",
          "9": "9月",
          N: "11月",
          D: "12月"
        }
      }
    }
  }
} as const
