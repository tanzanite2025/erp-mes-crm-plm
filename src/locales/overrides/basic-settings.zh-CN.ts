export const basicSettingsZhCNOverrides = {
  basicSettings: {
    tabs: {
      linearBarcode: '一维码',
    },
    linearBarcode: {
      page: {
        title: '一维码规则中心',
        subtitle:
          'LINEAR_BARCODE_PROTOCOL / 维护年月日、型号、外观、孔型前缀、孔数与四位流水号的持久化 Code128 协议。',
        badges: {
          active: '协议已启用',
          loading: '配置加载中',
          saving: '配置同步中',
          synced: '配置已同步',
          payload: '负载：15 位核心编码 + 统一业务编号服务',
        },
        actions: {
          save: '保存协议',
          saving: '同步中',
          numberingRule: '业务编号规则',
          reset: '重置协议',
        },
      },
      table: {
        headers: {
          segment: '字段',
          description: '说明',
          example: '示例',
          action: '操作',
        },
        segments: {
          year: { name: '年份 (YY)', desc: '生产年份后两位，固定 2 位编码。' },
          month: {
            name: '月份 (1 位)',
            desc: '1-9 表示 1-9 月，0 表示 10 月，N 表示 11 月，D 表示 12 月。',
          },
          day: { name: '日期 (DD)', desc: '自然日编码，范围固定为 01-31。' },
          model: {
            name: '型号',
            desc: '与工程产品档案中的 2 位型号编码保持一致。',
          },
          appearance: {
            name: '外观',
            desc: '沿用共享外观字典的一位外观映射值。',
          },
          holePrefix: {
            name: '孔型前缀',
            desc: '占 1 位，当前使用 R/D 等孔型分类标识。',
          },
          holes: {
            name: '孔数',
            desc: '占 2 位，使用两位数字编码，例如 14、18、32。',
          },
          serial: {
            name: '流水号',
            desc: '通过共享业务编号规则发放的四位流水号。',
          },
        },
      },
      simulation: {
        title: '一维码动态仿真输出',
        subtitle: '年份 + 月份 + 日期 + 型号 + 外观 + 孔型前缀 + 孔数 + 流水号',
        codeLabel: '编码',
        form: {
          year: '年份 (YY)',
          month: '月份 (1 位)',
          day: '日期 (DD)',
          model: '型号 (2 位)',
          appearance: '外观 (1 位)',
          holePrefix: '孔型前缀 (R/D)',
          holes: '孔数 (2 位)',
          serial: '四位流水号',
          notIssued: '未发放',
          requestSerial: '发号',
          undefinedAppearance: '未定义',
          specialPrefix: '特殊前缀：泄水孔',
          enableHPrefix: '启用 H 前缀',
          suffixWheel: '后缀标识：轮位',
          suffixScope: '后缀标识：范围',
          scopePlaceholder: '输入范围代码，例如 AM',
          placeholders: {
            year: '选择年份',
            month: '选择月份',
            day: '选择日期',
            model: '选择型号',
            appearance: '选择外观',
            holes: '选择孔数',
          },
          holePrefixOptions: {
            R: '公路 (R)',
            D: '山地 (D)',
          },
          wheelOptions: {
            F: '前轮 (F)',
            R: '后轮 (R)',
            H: '混合 (H)',
          },
        },
        validator: {
          title: '解析结果',
          description: '扫码枪回传的就是该条码载荷，便于终端直接复用。',
        },
        sequenceRule: {
          title: '发号规则说明',
          description: '流水号来自业务编号规则',
          patternHint: '请配置为',
        },
      },
      footer: {
        title: '一维码实施说明',
        description:
          '当前页面定义了 15 位轮圈一维码结构：年份 + 月份 + 日期 + 型号 + 外观 + 孔型前缀 + 孔数 + 流水号。其中孔型前缀占 1 位、孔数占 2 位；流水号复用业务编号规则 {{key}}，便于 PDA 与扫码入站端共享同一套后端默认值。',
      },
      resetDialog: {
        title: '重置一维码协议',
        description:
          '该操作会将本页字段说明和仿真输入恢复为默认值，并同步写回后端持久化配置。',
        verifyPrompt: '请输入校验文本后再继续。',
        verifyTarget: '重置一维码',
        placeholder: '在此输入校验文本...',
        discard: '放弃操作',
        commit: '确认重置协议',
      },
      toasts: {
        invalidSerialFormat:
          '规则 {{key}} 必须返回 4 位数字流水号，请将业务编号规则配置为 pattern={SEQ} 且 padding=4。',
        requestSerialSuccess: '已获取一维码流水号：{{serial}}',
        requestSerialFailed: '获取流水号失败。',
        sequenceRuleMissing:
          '请先创建业务编号规则 {{key}}，并配置为 pattern={SEQ} 且 padding=4。',
        saveSuccess: '一维码协议已同步到后端配置中心。',
        saveFailed: '保存一维码协议失败。',
        resetSuccess: '已恢复一维码默认配置。',
      },
      dialog: {
        editTitle: '编辑{{name}}逻辑',
        helperText: '这里的修改会更新管理页与后端持久化配置使用的协议元数据。',
        mappingMatrix: '映射矩阵',
        addMapping: '新增映射',
        originalValue: '原始值',
        convertedValue: '转换值',
        placeholderKey: '例如 11月',
        placeholderValue: '例如 N',
        autoRules: '自动规则',
        logicDescription: '逻辑说明',
        autoDescriptionPlaceholder: '描述该字段如何生成',
        step: '步进：固定',
        period: '周期：持久化',
        save: '保存逻辑',
        configRevision: '配置版本：{{value}}',
        protocol: '协议：{{value}}',
        segmentLabel: '字段',
        modeLabel: '模式',
      },
    },
  },
} as const
