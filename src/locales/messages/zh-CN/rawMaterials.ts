export const rawMaterials = {
  moduleTitle: '原材料管理',
  tabs: {
    catalog: '预浸料',
    bindingQr: '绑定二维码',
    batchEngine: '拆批引擎',
    cutSizeLibrary: '裁切尺寸库',
    cuttingPlan: '裁纱方案',
  },
  catalog: {
    hero: {
      title: '预浸料主数据',
      description:
        '这里只维护预浸料定义信息：产品编号、产品名称、映射显示名、供应商引用、树脂含量、宽度和合格面积。',
    },
    metrics: {
      total: '规格数',
      active: '启用',
      dimensionReady: '尺寸就绪',
    },
    flow: {
      definition: {
        label: '基础定义',
        value: '编号 / 名称 / 显示名 / 供应商',
      },
      dimension: {
        label: '尺寸主键',
        value: '宽度 / 合格面积 / 自动换算卷长',
      },
      recognition: {
        label: '识别策略',
        value: '识别不换算，清洗后入库',
      },
      scope: {
        label: '边界说明',
        value: '当前仅做原材料定义',
      },
    },
    searchPlaceholder: '搜索产品编号、名称、显示名、供应商标签',
    loading: '正在加载预浸料规格...',
    empty: {
      title: '还没有预浸料规格',
      description: '先录入标签上的产品编号、产品名称、宽度、树脂含量/批号。',
    },
    table: {
      columns: {
        product: '产品与映射',
        material: '纤维 / 树脂',
        dimension: '宽度 / 合格面积',
        production: '生产信息',
        actions: '操作',
      },
      summaryEmpty: '未填写规格摘要',
      length: '换算卷长',
      inspector: '检验员',
      boxNo: '箱号',
      fallback: {
        fiberModel: '未填写纤维型号',
        resin: '未填写树脂信息',
        width: '未填写宽度',
        area: '未填写合格面积',
        productionDate: '未填写生产日期',
        inspection: '未填写检验信息',
      },
    },
    dialog: {
      titleCreate: '新增预浸料规格',
      titleEdit: '编辑预浸料规格',
    },
    form: {
      code: {
        label: '产品编号',
        placeholder: '例如 CFS-247-75',
      },
      name: {
        label: '产品名称',
        placeholder: '例如 单向预浸料',
      },
      displayAlias: {
        label: '映射显示名（裁纱单/打印）',
        placeholder: '例如 C24T-75主料',
      },
      supplier: {
        label: '供应商（系统引用）',
        placeholder: '请选择供应商',
        loading: '加载供应商中...',
        empty: '暂无可选供应商',
        legacyPrefix: '历史值 /',
        legacyIdPrefix: '历史供应商 /',
      },
      fiberModel: {
        label: '纤维型号',
        placeholder: '例如 T700 / T800 / 40F',
      },
      resinContentBatchRaw: {
        label: '树脂含量/批号（标签原值）',
        placeholder: '例如 37%/260204',
      },
      widthMm: {
        label: '宽度',
        placeholder: '例如 1000',
      },
      nominalAreaM2: {
        label: '合格面积 (m2)',
        placeholder: '例如 150',
      },
      inspector: {
        label: '检验员',
        placeholder: '例如 Z',
      },
      boxNo: {
        label: '箱号',
        placeholder: '例如 23',
      },
      productionDate: {
        label: '生产日期',
        placeholder: '例如 2026-03-06',
      },
      status: {
        label: '状态',
      },
      description: {
        label: '备注',
        placeholder: '补充供应商、检验、替代料或使用限制',
      },
    },
    cleanedPreview: {
      title: '清洗数据（保存按此入库）',
      description:
        '识别阶段只填标签值，不做转换；这里统一单位并做必要换算，后续链路读取清洗后的数据。',
      resinContent: '清洗树脂含量',
      supplierBatchNo: '清洗批号',
      widthMm: '清洗宽度',
      lengthM: '清洗卷长',
      nominalAreaM2: '清洗合格面积',
      resinDerivation: '含量/批号来源：',
      resinDerivationManual: '手工拆分字段',
      resinDerivationFromRaw: '标签“树脂含量/批号”拆分',
      dimensionDerivationLabel: '换算来源：',
      dimensionDerivation: {
        manual: '手工/标签直填',
        lengthFromArea: '由面积 + 宽度换算卷长',
        areaFromLength: '由卷长 + 宽度换算面积',
        widthFromAreaAndLength: '由面积 + 卷长换算宽度',
      },
      notes: {
        resinContentMissing: '树脂含量/批号未识别出有效含量，请手工复核。',
        supplierBatchMissing: '树脂含量/批号未识别出批号，请手工复核。',
        areaMismatch:
          '面积与宽度/卷长不一致，已保留手工输入，请复核标签单位。',
      },
    },
    status: {
      active: '启用',
      inactive: '停用',
      archived: '归档',
    },
    actions: {
      create: '新增预浸料规格',
      scanBind: '扫码绑定',
      save: '保存规格',
      saveAndBind: '保存并绑定',
      saving: '保存中...',
      binding: '绑定中...',
      cancel: '取消',
    },
    toasts: {
      created: '预浸料规格已建立',
      updated: '预浸料规格已更新',
      saveFailed: '预浸料规格保存失败，请稍后重试',
      recognizedApplied: '识别结果已填入，请核对后保存',
      requiredCodeAndName: '请先填写产品编号和产品名称',
      bindingActivated: '绑定二维码已识别，当前弹窗进入绑定模式',
      bindingInvalid: '当前内容不是有效的预浸料绑定二维码',
      bindingExpired: '该绑定二维码已过期，请重新生成后再绑定',
      bindingAlreadyBound: '该绑定二维码已绑定到已有预浸料规格',
      bindingLookupFailed: '绑定二维码状态读取失败，请稍后重试',
      bindingSaved: '预浸料规格已保存并完成绑定',
      qrGenerated: '二维码已按当前清洗口径生成',
      qrGenerateFailed: '二维码生成失败，请重试',
      qrPrintBlocked: '请先生成二维码后再打印',
    },
    binding: {
      title: '当前为二维码绑定模式',
      description: '请完成当前预浸料规格录入，保存后会把本次二维码与该规格绑定。',
      tokenLabel: '当前绑定码',
    },
    scanBinding: {
      title: '扫码绑定预浸料',
      description: '请扫描或粘贴未绑定二维码。识别成功后，系统会自动打开新增预浸料规格弹窗并进入绑定模式。',
      placeholder: '扫描二维码内容，或粘贴带 bindToken 的链接 / TOKEN',
      hint: '支持扫码枪输入、手工粘贴 TOKEN，或直接粘贴二维码深链 URL。',
    },
    qr: {
      title: '二维码直转 / 直打',
      description: '基于当前弹窗已填字段与清洗结果生成二维码，并可直接打印贴标。',
      empty: '尚未生成二维码',
      requirements: '至少填写产品编号和产品名称后，再点击“转为二维码”。二维码内容严格跟随当前清洗口径。',
      previewTitle: '贴标预览',
      previewDescription: '当前二维码与字段快照',
      previewAlt: '预浸料规格二维码',
      payload: '二维码载荷',
      generatedFromCleaned: '以下内容由当前表单和清洗结果统一生成',
      actions: {
        generate: '转为二维码',
        regenerate: '重新生成',
        generating: '生成中...',
        print: '打印标签',
        close: '关闭',
      },
    },
    ocr: {
      title: '标签拍照识别',
      description: '电脑端可直接上传；也可生成手机采集链接，手机提交后自动回填当前弹窗。',
      waitingImage: '等待标签照片',
      previewAlt: '预浸料标签预览',
      textPlaceholder:
        '可粘贴 OCR 文本，例如：产品编号 CFS-247-75，树脂含量/批号 37%/260204，宽度 1000MM，合格面积 150m2，检验员 Z，箱号 23，生产日期 2026-03-06。',
      emptyParsedFields: '暂无可填字段',
      mobile: {
        title: '手机扫码采集',
        description: '链接 30 分钟内有效。手机提交后，此弹窗会自动接收字段。',
      },
      message: {
        idle: '拍照或上传标签后，可粘贴/校正识别文本，再一键填入表单。',
        mobileSubmitted: '手机端已提交识别结果，请核对后保存。',
        mobilePollingFailed: '手机采集会话轮询失败，可重新生成链接。',
        localUploaded: '标签照片已读取，请核对识别文本后填入。',
        localUploadFailed: '标签照片读取失败，请重试或手工录入。',
        mobileSessionCreated: '手机采集链接已生成，请扫码拍照并提交。',
      },
      actions: {
        localUpload: '本机上传',
        mobileCapture: '手机采集',
        parseAndApply: '解析并填入',
        copyLink: '复制链接',
        reading: '读取中...',
      },
      toasts: {
        noFields: '还没有可填入的识别字段，请先粘贴或校正标签文本。',
        mobileApplied: '手机识别结果已填入',
        mobileSessionFailed: '手机采集链接生成失败',
        linkCopied: '采集链接已复制',
        copyFailed: '复制失败，请手动复制链接',
      },
    },
    mobileCapture: {
      title: '预浸料标签采集',
      description: '拍照留底，粘贴或输入标签文字，系统会提取固定字段。',
      previewAlt: '标签照片预览',
      imagePlaceholder: '拍照/上传标签',
      textTitle: '标签文字',
      textPlaceholder:
        '把手机 OCR / 相册识别出的文本粘贴到这里，也可手工录入：产品编号 CFS-247-75，树脂含量/批号 37%/260204，宽度 1000MM，合格面积 150m2，检验员 Z，箱号 23，生产日期 2026-03-06。',
      actions: {
        submit: '提交到电脑端',
      },
      submitted: {
        title: '已提交',
        description: '电脑端预浸料弹窗会自动接收识别结果，请回到电脑端核对保存。',
      },
      errors: {
        missingToken: '采集链接缺少口令，请回到电脑端重新生成。',
        emptyFields: '还没有解析到字段，请先输入或粘贴标签文字。',
        submitFailed: '提交失败，请重试。',
      },
    },
  },
  bindingQr: {
    hero: {
      kicker: '独立作业页',
      title: '预浸料批量绑定二维码',
      description: '这里独立批量生成未绑定二维码并打印，不干扰当前预浸料规格录入弹窗。二维码仅作为后续绑定入口，未绑定时不承载规格信息，5 天未绑定自动失效。',
    },
    actions: {
      generate: '批量生成二维码',
      generating: '生成中...',
      print: '打印本批二维码',
      clear: '清空当前批次',
    },
    form: {
      title: '生成参数',
      description: '输入本次需要打印的未绑定二维码数量，系统会通过后端签发并即时生成二维码卡片用于打印。',
      quantityLabel: '生成数量',
      quantityHint: '当前页面单次限制 1-200 张，用于车间或人工批量贴标准备。',
      rulesTitle: '当前口径',
      ruleUnbound: '二维码默认未绑定，扫码后再进入绑定流程',
      ruleNoLeak: '未绑定二维码不承载预浸料规格信息',
      rulePrintable: '本页只负责批量生成、打印与清空 UI，不做过度治理',
      ruleExpiry: '未绑定二维码 5 天后自动失效并参与清理',
    },
    grid: {
      title: '本批二维码',
      emptyTitle: '还没有生成二维码',
      emptyDescription: '先输入数量并执行批量生成，再统一打印。',
      tokenLabel: '绑定 TOKEN',
      expiresAtLabel: '失效时间',
      cardTip: '未绑定 TOKEN / 5 天内扫码绑定',
    },
    batchValidity: {
      title: '本批有效期提示',
      remainingLabel: '剩余有效时间',
      remainingValue: '约 {{value}}',
      expiresAtLabel: '本批统一失效时间',
    },
    toasts: {
      generated: '本批绑定二维码已生成',
      generateFailed: '批量二维码生成失败，请重试',
      printBlocked: '请先生成二维码后再打印',
      cleared: '当前批次已从页面清空',
    },
  },
  batchEngine: {
    title: '拆批引擎',
    description: '按当前卷规格与裁纱单据整单需求，实时计算预估损耗并生成正式求解候选。',
    sections: {
      control: {
        kicker: '输入侧',
        title: '卷材与规则准备区',
        description: '选择卷规格与裁纱单据，并设置刀缝与修边参数。',
        fields: {
          prepregRef: '引用预浸料卷规格',
          rollWidth: '卷材幅宽 (mm)',
          rollLength: '卷材长度 (m)',
          knifeGap: '刀缝 (mm)',
          edgeTrim: '修边 (mm)',
          cuttingPlanRef: '引用裁纱单据',
        },
        placeholders: {
          loading: '加载中...',
          selectPrepreg: '请选择预浸料规格',
          selectCuttingPlan: '请选择裁纱单据',
          none: '不引用（允许空值）',
        },
        prepregSummary: {
          prefix: '已引用卷规格',
          empty: '允许空值；选择后将只读取预浸料主数据中的卷宽与卷长。',
        },
        cuttingPlanSummary: {
          document: '文件编号',
          revision: '版次',
          lines: '需求行数',
          invalidLines: '待修复行数',
          empty: '选择裁纱单据后，系统会读取整张单据的全部有效行参与求解。',
        },
        objective: {
          title: '评分预设',
          placeholder: '选择评分预设',
          description: '用于选择系统默认评分偏好模板，可继续手工微调权重。',
          options: {
            yieldFirst: '产出优先',
            stabilityFirst: '稳定性优先',
          },
        },
        scoreWeights: {
          title: '评分权重',
          description: '用于正式求解评分，决定系统在满足率、利用率、稳定性与惩罚项之间的取舍。',
          fields: {
            utilization: '利用率',
            stability: '稳定性',
            splitPenalty: '拆分惩罚',
          },
        },
        blocks: {
          roll: {
            title: '当前卷材',
            value: '先选中具体卷材，再进入换算',
            hint: '后续展示卷实例、NFC 标签、剩余能力、回温窗口和库存状态。',
          },
          rollSpec: {
            title: '卷规格只读区',
          },
          plan: {
            title: '裁纱单据',
            value: '加载一张裁纱单据，并将全部有效行转为结构化需求',
            hint: '系统会基于整张裁纱单据生成多条 demand lines，用于整体最小损耗求解。',
          },
        },
      },
      stage: {
        kicker: '模拟区',
        title: '裁纱单据整单预演',
        description: '中间区域用于整单聚合预演，正式方案仍以后端求解结果为准。',
        rollCanvasLabel: '模拟画布',
        rollCanvasHint: '选择裁纱单据后，在此查看整单预演摘要与代表性排样画布。',
        simulationStatus: '待计算',
        computedStatus: '整单预演已生成',
        openCanvas: '打开 CANVAS 预览',
        pendingHint: '等待输入参数',
        planPrefix: '裁纱单据',
        stats: {
          demandLines: '总需求行数',
          validDemandLines: '有效需求行',
          totalRequiredPieces: '总需求块数',
          totalDemandArea: '真实裁片面积 (m2)',
          totalOccupiedArea: '角度占用面积 (m2)',
          leftoverWidth: '余宽 (mm)',
          leftoverLength: '余长 (mm)',
        },
      },
      summary: {
        kicker: '输出侧',
        title: '结果摘要',
        description: '展示当前卷在现有参数下的产出与损耗摘要。',
        cards: {
          output: {
            title: '计划输出',
            value: '待输入完整参数后生成结果摘要。',
            hint: '当前摘要仅基于本页输入参数实时计算。',
          },
        },
      },
    },
    debug: {
      kicker: '引擎联动',
      title: '当前应用配置',
      description: '展示拆批引擎当前使用的裁纱引擎配置与 Rust/WASM 请求载荷。',
      resultStale: '配置已变化，请重新求解',
      fields: {
        preset: '目标预设',
        weights: '权重 U/S/P',
        geometry: '刀缝 / 修边',
        lengthRules: '长度边界',
        directionRules: '纱向 / 角度',
      },
      payload: {
        title: 'CuttingEngineInput Payload',
        description: '展开后可查看本次正式求解传入 Rust/WASM 的真实 JSON。',
        empty: '当前输入不足，尚未生成 CuttingEngineInput。',
      },
    },
    metrics: {
      roll: {
        label: '卷规格基准',
        value: '规格宽长',
        hint: '当前展示来自预浸料规格主数据，不代表真实库存卷实例。',
      },
      mode: {
        label: '规划策略',
        value: '长条优先，后续分块',
        hint: '当前采用长条优先、后续分块的规划方式。',
        currentCuttingPlan: '当前裁纱单据: {name} / {lineCount} 行',
      },
      loss: {
        label: '预估损耗',
        value: '本地预演结果',
        hint: '基于当前卷规格、尺寸单元、刀缝与修边的本地预演结果，非正式优化后的最终损耗。',
        utilizationHint: '当前预演占用口径利用率 {percent}% / 占用面积 {occupiedArea} m2',
      },
    },
    scoreBreakdown: {
      title: '评分拆解',
      subtitle: 'preset / contribution / penalty',
      fields: {
        objectivePreset: '评分预设',
        finalScore: '最终评分',
        fulfilledRate: '满足率',
        structuredRuleRisk: '规则风险总数',
        fulfilledContribution: '满足贡献',
        utilizationContribution: '利用率贡献',
        stabilityContribution: '稳定性贡献',
        assignmentPenalty: '分配惩罚',
        unfulfilledPenalty: '未满足惩罚',
        splitPenalty: '跨卷惩罚',
        mustPenalty: 'Must 约束惩罚',
        groupSplit: '组内拆分',
        sequenceViolation: '顺序破坏',
        directionSwitch: '方向切换',
        mixViolation: '禁混冲突',
      },
    },
    comparePanel: {
      title: '候选比较面',
      scoreChip: '评分 {score}',
      mustOk: 'Must 满足',
      mustRisk: 'Must 风险',
      ruleRisk: '规则风险 {count}',
      ruleStable: '规则稳定',
      metrics: {
        utilization: '利用率',
        fulfilledDemand: '已满足需求',
        splitDemand: '跨卷需求',
        usedRolls: '已用卷材',
        remainingRollArea: '剩余卷材',
        unfulfilledArea: '未满足面积',
        fulfilledContribution: '满足贡献',
        mustPenalty: 'Must 约束惩罚',
        groupSplit: '组内拆分',
        sequenceViolation: '顺序破坏',
        directionSwitch: '方向切换',
        mixViolation: '禁混冲突',
        diffDemand: '差异需求',
        diffZones: '差异热区',
      },
      baseline: '相对基准: Top{rank}',
      mustDiagnostics: 'Must 诊断: {count}',
    },
    mustReview: {
      title: 'Must 失败原因',
      empty: '当前方案没有 mustFulfill 诊断信息。',
      statuses: {
        fulfilled: '已满足',
        unfulfilled: '未满足',
      },
      labels: {
        constraint: '约束',
        suggestion: '建议',
      },
      constraints: {
        none: '无阻塞',
        group: '分组约束',
        sequence: '顺序约束',
        direction: '方向约束',
        mix: '禁混约束',
        capacity: '容量约束',
      },
    },
    solutionOverview: {
      title: '正式求解概览',
      solving: '后端正在生成正式候选方案...',
      empty: '尚未发起正式求解。',
      currentPlan: '当前方案',
      optionalPlan: '可选方案',
      currentPlanDetail: '当前方案详情',
      summary: {
        solverStatus: '求解状态',
        planCount: '返回方案数',
        message: '摘要',
      },
      metrics: {
        strategy: '策略',
        score: '评分',
        utilization: '利用率',
        loss: '损耗',
        assignments: '分配条目',
        unfulfilledLines: '未满足行',
        splitDemand: '跨卷需求',
        usedRolls: '已用卷材',
        structuredRuleRisk: '规则风险 {count}',
        mustRisk: 'Must 风险 {count}',
        groupSplit: '组内拆分',
        sequenceViolation: '顺序破坏',
        directionSwitch: '方向切换',
        mixViolation: '禁混冲突',
        baseline: '相对基准',
      },
    },
    legend: {
      roll: '整卷区域',
      strip: '首刀长条',
      piece: '二次分块',
      loss: '损耗区域',
    },
    canvasPreview: {
      title: 'CANVAS 裁切预览',
      description: '长条优先可视化模拟。滚轮缩放、拖拽平移、点击区域看明细。',
      close: '关闭预览',
      summary: {
        roll: '卷规格',
        unit: '裁纱单据',
        executableSets: '需求行数',
        executablePieces: '总需求块数',
        utilization: '利用率',
      },
      legend: {
        roll: '整卷区域',
        strip: '首刀长条',
        piece: '二次分块',
        loss: '损耗区域',
        aggregate: '聚合占位',
      },
    },
    canvas: {
      scale: '缩放',
      zones: '区域',
      selection: '选中',
      hoverHint: '悬停或点击长条/分块/损耗区域查看明细。',
      type: '类型',
      position: '坐标 (mm)',
      size: '尺寸 (mm)',
    },
  },
  engineConfig: {
    tab: '裁纱引擎配置',
    hero: {
      title: '原材料裁纱引擎配置',
      description:
        '裁切几何求解器配置中心。在此调整材料利用率、排布稳定性、刀缝、修边、公差与物理约束。本页面为核心计算资产，请妥善保管访问权限。',
    },
    preset: {
      title: '求解目标预设',
      description: '选择裁切计算的核心求解取向，系统将自动填充推荐的几何与材料利用率参数。',
      options: {
        yieldFirst: {
          label: '出率优先',
          description: '最大化利用率，减少废料。',
        },
        stabilityFirst: {
          label: '稳定性优先',
          description: '减少排布缝合，提高物理抗拉强度。',
        },
      },
    },
    weights: {
      title: '裁切几何打分权重模型',
      description: '调整裁切计算因子，数值越大表示引擎越倾向于优化该几何或材料利用率指标。',
      utilization: '原材利用率权重',
      stability: '卷材排布稳定性权重',
      splitPenalty: '物理分切惩罚项',
      mustFulfillPenalty: '必达需求惩罚权重',
    },
    constraints: {
      title: '几何与物理约束',
      description: '配置设备极限与物理刀头尺寸参数。',
      lengthRules: {
        title: '裁切长度规则',
        description: '用最小/最大长度约束计算边界，并用固定决策长度支持工艺微调覆写。',
        minSupportedLength: {
          label: '最小支持长度',
          hint: '低于该长度不纳入裁切计算候选。',
        },
        maxSupportedLength: {
          label: '最大支持长度',
          hint: '高于该长度不纳入裁切计算候选。',
        },
        fixedDecisionLength: {
          label: '固定决策长度',
          hint: '用于覆写最终裁切长度决策。',
        },
      },
      angleRules: {
        title: '支持裁切角度',
        description: '声明当前尺寸库与裁纱输入链路支持的裁切角度集合。',
        hint: '角度由尺寸库维护并随裁纱单需求进入引擎输入，计算核心只接收已投影几何与角度元数据。',
      },
      directionRules: {
        title: '纱向与角度规则',
        description: '控制同向优先、角度混排和方向切换惩罚，这些规则会进入正式 WASM 求解输入。',
        angleMixMode: {
          label: '角度混排策略',
          options: {
            allow: '允许混排',
            'prefer-same-angle': '同角优先',
            'strict-same-angle': '严格同角',
          },
        },
        sameDirectionPreferred: {
          label: '同向优先',
          hint: '开启后，同纱向/同角度候选将获得轻量评分优势。',
        },
        directionSwitchPenalty: {
          label: '方向切换惩罚',
          hint: '每次纱向或角度切换计入的评分扣减权重。',
        },
      },
      ruleStrategy: {
        title: '规则开关 / 约束策略',
        description: '定义引擎如何消费必达、混排、顺序与纱向角度规则。本阶段进入 WASM 合约并作为诊断信号。',
        mustFulfillMode: {
          label: 'Must Fulfill 模式',
          options: {
            strict: {
              label: 'Strict',
              description: '作为硬性约束处理。',
            },
            'soft-penalty': {
              label: 'Soft Penalty',
              description: '作为评分惩罚处理。',
            },
            ignore: {
              label: 'Ignore',
              description: '忽略必达标记。',
            },
          },
        },
        mixingStrategy: {
          label: '混排策略',
          options: {
            allow: {
              label: 'Allow',
              description: '允许跨组混排。',
            },
            sameGroupOnly: {
              label: 'Same Group',
              description: '仅同组优先混排。',
            },
            strictNoMix: {
              label: 'No Mix',
              description: '严格禁止混排。',
            },
          },
        },
        orderStrategy: {
          label: '顺序策略',
          options: {
            respectOrder: {
              label: 'Respect',
              description: '严格尊重顺序。',
            },
            softPenalty: {
              label: 'Soft',
              description: '顺序偏离计入惩罚。',
            },
            ignore: {
              label: 'Ignore',
              description: '忽略顺序字段。',
            },
          },
        },
        directionStrategy: {
          label: '纱向/角度策略',
          options: {
            sameDirectionPreferred: {
              label: 'Preferred',
              description: '同向同角优先。',
            },
            sameDirectionRequired: {
              label: 'Required',
              description: '同向同角必需。',
            },
            allowSwitch: {
              label: 'Allow Switch',
              description: '允许方向切换。',
            },
          },
        },
      },
      knifeGap: {
        label: '分切刀口宽度',
        hint: '每次切割损耗的刀口宽度。',
      },
      edgeTrim: {
        label: '卷材边缘裁剪',
        hint: '两端必须剥离的非反应区宽度。',
      },
      timeout: {
        label: '最大求解耗时限制',
        hint: '单次排版最长运算耗时限制。',
      },
      units: {
        mm: '毫米',
        sec: '秒',
      },
    },
    security: {
      title: '参数安全警示',
      description:
        '裁切几何模型直接影响车间出料率与裁切合格性，调整后将对新生成的裁切计算生效。非工艺部授权专业人员，请勿擅自修改本页面参数。',
    },
    actions: {
      reset: '恢复默认',
      save: '保存配置',
      saving: '正在保存...',
    },
    toasts: {
      presetChanged: '已切换为「{{preset}}」官方工艺推荐权重参数。',
      saveSuccess: '裁纱引擎计算配置固化成功！新裁切计算任务将自动加载此参数资产。',
      reset: '配置参数已重置为系统出厂工艺默认值。',
    },
  },
  cutSizeLibrary: {
    title: '裁切尺寸库',
    description: '将标准裁切单元作为受控主数据维护，为模拟裁切与下达联动提供稳定输入。',
    status: '结构就绪',
    actions: {
      add: '新增尺寸单元',
    },
    sections: {
      dataset: {
        kicker: '主数据集',
        title: '结构化裁切尺寸单元',
        description:
          '替代 1x20x9 这类自由字符串，改为结构化宽长、角度、叠层和损耗字段。',
      },
    },
    columns: {
      code: '编号',
      name: '名称',
      size: '宽 x 长 x 张数',
      angle: '裁切角度',
      layup: '叠层规则',
      loss: '损耗模型',
      usage: '用途类型',
      status: '状态',
    },
    empty: {
      title: '暂无尺寸单元',
      description: '先建立标准尺寸库，再让裁纱方案与模拟引擎引用，避免手输字符串。',
    },
    fields: {
      size: {
        label: '尺寸字段',
        hint: '将宽、长、张数拆为独立数值字段。',
      },
      angle: {
        label: '角度字段',
        hint: '将 0 / 45 / 自定义角度写入专用字段，不混在备注。',
      },
      layup: {
        label: '叠层字段',
        hint: '记录叠层数与叠层模式，用于表达 FAW 叠层语义。',
      },
      loss: {
        label: '损耗字段',
        hint: '记录修边、刀缝和角度包络等额外损耗参数。',
      },
      usage: {
        label: '用途标签',
        hint: '区分主纱、补强、补片、圆环或自定义用途。',
      },
      trace: {
        label: '追溯联动',
        hint: '预留与打印单、模板、下达链路的来源关联字段。',
      },
    },
  },
} as const
