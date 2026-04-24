export const rawMaterials = {
  moduleTitle: '原材料管理',
  tabs: {
    catalog: '预浸料',
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
      save: '保存规格',
      saving: '保存中...',
      cancel: '取消',
    },
    toasts: {
      created: '预浸料规格已建立',
      updated: '预浸料规格已更新',
      recognizedApplied: '识别结果已填入，请核对后保存',
      requiredCodeAndName: '请先填写产品编号和产品名称',
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
  batchEngine: {
    title: '拆批引擎',
    description: '预留按卷材能力进行裁切模拟、长条优先拆分和下达联动的专用工作区。',
    status: '结构就绪',
    sections: {
      control: {
        kicker: '输入侧',
        title: '卷材与规则准备区',
        description: '这里承接卷实例选择、NFC 绑定、裁纱方案选择和规则输入。',
        fields: {
          prepregRef: '引用预浸料卷规格',
          rollWidth: '卷材幅宽 (mm)',
          rollLength: '卷材长度 (m)',
          knifeGap: '刀缝 (mm)',
          edgeTrim: '修边 (mm)',
          cutSizeRef: '引用裁切尺寸单元',
        },
        placeholders: {
          loading: '加载中...',
          selectPrepreg: '请选择预浸料规格',
          selectCutSize: '请选择尺寸单元',
          none: '不引用（允许空值）',
        },
        prepregSummary: {
          prefix: '已引用卷规格',
          empty: '允许空值；选择后将只读取预浸料主数据中的卷宽与卷长。',
        },
        cutSizeSummary: {
          angle: '角度',
          layup: '叠层',
          usage: '用途',
          empty: '选择尺寸单元后，模拟区将按长条优先规则实时计算。',
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
            value: '加载一张裁纱方案，并将每行工艺转为结构化规则',
            hint: '角度、叠层、长条优先、修边、错位等会逐步结构化。',
          },
          engine: {
            title: '引擎假设',
          },
        },
      },
      stage: {
        kicker: '模拟区',
        title: '卷到长条的裁切预览',
        description: '中间区域用于图形化模拟，而不是仅靠表格面积计算。',
        rollCanvasLabel: '模拟画布',
        rollCanvasHint: '后续将展示整卷、首刀长条、分块、角度件和损耗区域。',
        simulationStatus: '预览骨架',
        computedStatus: '长条优先已计算',
        openCanvas: '打开 CANVAS 预览',
        pendingHint: '等待输入参数',
        unitPrefix: '尺寸单元',
        pieceCountPrefix: '可切块数',
        stats: {
          stripCount: '长条数量',
          piecesPerStrip: '每条可切块',
          executableSets: '可执行套数',
          leftoverWidth: '余宽 (mm)',
          leftoverLength: '余长 (mm)',
        },
      },
      summary: {
        kicker: '输出侧',
        title: '结果摘要与下达联动',
        description: '用于承接本卷可执行数量、损耗说明以及流转到裁纱下达。',
        cards: {
          output: {
            title: '计划输出',
            value: '预留给本卷可执行数量、剩余能力和损耗拆解。',
            hint: '第一版先回答“这卷今天最多能做多少”，不直接对整单计算。',
          },
          linkage: {
            title: '下达流程',
            step1: '1. 选择实际预浸料卷和裁纱方案。',
            step2: '2. 模拟长条切法、叠层、角度裁切和损耗。',
            step3: '3. 将本卷可执行数量送入裁纱下达，作为本次执行量。',
          },
        },
        todoTitle: '预留主题',
      },
    },
    metrics: {
      roll: {
        label: '卷材基准',
        value: '一卷实物料',
        hint: '默认不按整张销售订单总量直接换算。',
      },
      mode: {
        label: '规划模式',
        value: '先切长条，再拆小块',
        hint: '贴近现场路径：先切长条，再二次分块。',
      },
      loss: {
        label: '损耗口径',
        value: '角度 / 叠层 / 修边',
        hint: '损耗不只净面积，需计入折角、错位与角度包络。',
      },
    },
    rules: {
      stripFirst: '长条优先',
      angleAware: '考虑角度裁切',
      layupAware: '考虑叠层工艺',
      lossAware: '损耗计入',
    },
    legend: {
      roll: '整卷区域',
      strip: '首刀长条',
      piece: '二次分块',
      loss: '损耗区域',
    },
    preview: {
      roll: {
        title: '预浸料卷示意',
        size: '150m x 固定门幅',
      },
      strips: {
        primary: {
          title: '长条主路径',
          subtitle: '先切一刀长条，再从长条里拆出小块。',
          lossHint: '修边 + 刀缝',
        },
        angle: {
          title: '角度裁切路径',
          subtitle: '45 度裁切需要额外包络，不能只按净面积。',
          lossHint: '角度包络损耗',
        },
        layup: {
          title: '叠层裁切路径',
          subtitle: 'FAW 变化很多来自叠层工艺，而非另一种原料。',
          lossHint: '折角 + 叠层修边',
        },
      },
    },
    todo: {
      rollBinding: '卷实例绑定',
      cutRule: '裁切规则',
      lossModel: '损耗模型',
      issuanceLink: '下达联动',
    },
    canvasPreview: {
      title: 'CANVAS 裁切预览',
      description: '长条优先可视化模拟。滚轮缩放、拖拽平移、点击区域看明细。',
      close: '关闭预览',
      summary: {
        roll: '卷材',
        unit: '尺寸单元',
        executableSets: '可执行套数',
        executablePieces: '可执行块数',
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
