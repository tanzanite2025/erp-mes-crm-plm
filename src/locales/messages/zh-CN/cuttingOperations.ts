export const cuttingOperations = {
  tabs: {
    cuttingIssuance: '裁纱下达',
    productBinding: '产品绑定',
    sizeInventory: '裁纱尺寸库存',
  },
  productBinding: {
    header: {
      title: '产品绑定',
      description: '本页用于将编码中心一维码绑定到已在预浸料页面完成扫码与 OCR 激活的卷实例二维码，并记录卷实例上的多条产品绑定事件。',
    },
    cards: {
      scope: {
        title: '正式业务定位',
        description: '产品绑定的主对象是已激活的预浸料卷实例二维码，而不是裁纱执行单或抽象规格 token。',
      },
      nextStep: {
        title: '当前处理对象',
        description: '每次绑定只需录入产品一维码和卷实例二维码；同一卷允许对应多个产品码，但单个产品码只能保留一条当前绑定。',
      },
      boundary: {
        title: '稳定性边界',
        description: '本页优先保证产品码唯一性、卷实例有效性以及同一卷多产品绑定事件的历史回显一致性。',
      },
    },
    form: {
      title: '正式绑定作业区',
      description: '提交产品一维码与已激活的卷实例二维码，系统会校验卷实例状态并写入产品绑定事件。',
      steps: {
        step0: '步骤 00',
        step1: '步骤 01',
        step2: '步骤 02',
      },
      execution: {
        label: '裁纱执行单',
        placeholder: '请选择裁纱执行单',
        hint: '正式方案下，每条绑定记录都必须挂接到一个裁纱执行单。',
        loadingHint: '正在加载裁纱执行单选项...',
      },
      barcode: {
        label: '编码中心一维码',
        placeholder: '请扫描或输入编码中心一维码',
        hint: '支持扫码枪、手动输入，或通过下方手机扫码会话自动回填产品一维码。',
      },
      qr: {
        label: '预浸料二维码',
        placeholder: '请扫描或输入预浸料二维码',
        hint: '系统将解析二维码中的预浸料绑定 token，并校验当前占用状态。',
      },
      actions: {
        submit: '提交绑定',
        submitting: '提交中',
      },
    },
    mobileCapture: {
      title: '手机扫码回填一维码',
      description: '创建手机扫码会话后，可用手机打开二维码链接，直接扫描编码中心一维码并自动回填当前表单。',
      actions: {
        create: '创建手机扫码会话',
        copyLink: '复制手机链接',
      },
      status: {
        idle: '尚未创建手机扫码会话',
        created: '手机扫码会话已创建，请用手机扫描二维码',
        filled: '已收到手机扫码结果并自动回填',
        expired: '手机扫码会话已过期，请重新创建',
        pollingFailed: '手机扫码轮询失败，请稍后重试',
      },
      toasts: {
        filled: '手机扫码已回填',
        createFailed: '手机扫码会话创建失败',
        linkCopied: '手机扫码链接已复制',
        copyFailed: '复制失败，请手动复制链接',
      },
      link: {
        title: '手机扫码链接',
        description: '手机打开该链接后，可直接调起摄像头扫码并把结果回填到当前页面。',
      },
      page: {
        title: '产品一维码扫码',
        description: '请直接扫描编码中心一维码；识别成功后会自动提交到当前产品绑定页面。',
        placeholder: '请扫描或输入编码中心一维码',
        actions: {
          submit: '提交扫码结果',
        },
        submitted: {
          title: '扫码结果已提交',
          description: '可以返回电脑端继续完成卷实例产品绑定。',
        },
        errors: {
          missingToken: '缺少扫码会话口令，请重新打开手机扫码链接。',
          missingBarcode: '请先扫描或输入编码中心一维码。',
          submitFailed: '扫码结果提交失败，请稍后重试。',
        },
      },
    },
    feedback: {
      idle: {
        title: '等待绑定输入',
        description: '请录入产品一维码，并扫描已在预浸料页面完成激活的卷实例二维码后再提交绑定。',
      },
      missingExecution: {
        title: '缺少执行单',
        description: '正式方案要求每条绑定必须挂接裁纱执行单，请先选择执行单。',
      },
      missingBarcode: {
        title: '缺少一维码',
        description: '请先填写编码中心一维码，再继续提交正式绑定。',
      },
      missingQr: {
        title: '缺少二维码',
        description: '请先填写预浸料卷实例二维码，再继续提交正式绑定。',
      },
      submitting: {
        title: '正在提交正式绑定',
        description: '系统正在校验产品码唯一性、卷实例激活状态以及绑定事件写入条件，请稍候。',
      },
      success: {
        title: '绑定提交成功',
        description: '产品绑定当前状态与卷实例绑定事件已写入正式链路，页面已同步回显最新结果。',
      },
      duplicate: {
        title: '检测到重复提交',
        description: '本次提交命中了同卷既有绑定记录，系统已按既有绑定事件回显当前正式结果。',
      },
      conflict: {
        title: '检测到产品码冲突',
        description: '该产品码已绑定到其它预浸料卷，系统已回显当前既有绑定记录供你核对冲突来源。',
      },
      error: {
        title: '绑定提交失败',
        description: '本次正式绑定未成功，请检查卷实例二维码是否已激活、条码内容或产品码冲突信息。',
      },
      snapshot: {
        executionLabel: '卷实例规格快照',
        executionDetailLabel: '卷实例明细快照',
        barcodeLabel: '一维码输入快照',
        qrLabel: '二维码输入快照',
        tokenLabel: '预浸料绑定标记',
        protocolLabel: '条码协议',
        summaryLabel: '条码摘要',
        boundByLabel: '操作人',
        bindingIdLabel: '绑定记录编号',
        boundAtLabel: '绑定时间',
        statusLabel: '绑定状态',
        errorLabel: '错误信息',
      },
    },
    history: {
      title: '卷实例绑定记录',
      description: '当前筛选条件下已加载 {{count}} 条绑定记录，用于核对卷实例上的产品绑定事件。',
      loading: '正在加载卷实例绑定记录...',
      empty: '当前没有匹配的卷实例绑定记录，请先完成一条正式绑定。',
      error: '加载绑定记录失败：{{message}}',
      latestBadge: '最新提交',
      actions: {
        openDialog: '查看卷实例绑定记录',
        copyProductBarcode: '复制产品一维码',
      },
      toasts: {
        productBarcodeCopied: '产品一维码已复制。',
        copyFailed: '复制失败，请稍后重试。',
      },
      columns: {
        prepregQrCode: '二维码',
        productBarcode: '产品一维码',
        supplierBatchNo: '卷批号',
        productionDate: '卷生产日期',
        boundBy: '操作人',
        status: '状态',
        boundAt: '绑定时间',
      },
    },
    placeholders: {
      title: '预留能力槽位',
      barcode: '编码中心一维码输入区（待接入）',
      qr: '预浸料二维码输入区（待接入）',
      submit: '绑定确认动作区（待接入）',
    },
  },
  sizeInventory: {
    header: {
      title: '裁纱尺寸库存',
      description: '尺寸主数据直接读取裁切尺寸库，可选择启用的尺寸单元录入库存并回显当前库存数量。',
    },
    actions: {
      recordInventory: '录入库存',
    },
    metrics: {
      total: '尺寸总数',
      active: '启用尺寸',
      usageTypes: '用途类型数',
    },
    table: {
      title: '尺寸库存台账（尺寸来自裁切尺寸库）',
      hint: '录入时从裁切尺寸库选择尺寸单元，库存数量按入库记录累加。',
      loading: '正在加载尺寸库数据...',
      empty: '暂无可用尺寸，请先在“裁切尺寸库”维护尺寸单元。',
      noInventory: '暂无库存记录',
      noLocation: '未填写库位',
      error: '加载尺寸库存失败：{{message}}',
      columns: {
        code: '尺寸编号',
        name: '尺寸名称',
        size: '尺寸表达式',
        usage: '用途',
        sourceStatus: '来源状态',
        inventoryQty: '库存数量',
      },
    },
    dialog: {
      title: '录入裁纱尺寸库存',
      unit: '尺寸单元',
      unitPlaceholder: '请选择裁切尺寸库中的启用尺寸',
      quantity: '入库数量',
      location: '库位',
      locationPlaceholder: '例如 A-01 / 裁纱暂存区',
      remarks: '备注',
      remarksPlaceholder: '填写本次录入来源、批次或说明',
      cancel: '取消',
      save: '确认录入',
      saving: '录入中...',
    },
    toasts: {
      noActiveUnit: '暂无启用的裁切尺寸单元，请先维护裁切尺寸库。',
      selectUnit: '请先选择尺寸单元。',
      invalidQuantity: '请填写大于 0 的入库数量。',
      recordSuccess: '尺寸库存已录入。',
    },
    status: {
      Active: '启用',
      Inactive: '停用',
      Archived: '归档',
    },
  },
} as const
