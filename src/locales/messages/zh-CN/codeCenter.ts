export const codeCenter = {
  title: '编码中心',
  linearBarcode: {
    symbols: {
      linearBarcode: '一维码',
      qrCode: '二维码',
      pairedSymbols: '一维码 / 二维码',
      sameCode: '一维码与二维码内容一致：{{code}}',
      loading: '正在生成码图',
      renderFailed: '码图生成失败',
    },
    tabs: {
      protocol: '协议规则',
      print: '打印',
      status: '编码状态',
      numbering: '业务编号',
    },
    print: {
      page: {
        title: '产品编码打印中心',
        subtitle: '唯一码发号、批次留痕与一维码 / 二维码预览',
        notice:
          '每枚产品编码只发号一次，同时生成内容一致的一维码与二维码。打印窗口可选择单码或双码标签；已有编码可在下方库存中补打。',
        badges: {
          placeholder: '骨架占位',
          awaitingOrder: '等待选择订单',
          analysisReady: '解析就绪 {{count}} 行',
          analysisBlocked: '阻断 {{count}} 行',
          protocolLinked: '协议已联动',
        },
      },
      actions: {
        gotoProtocol: '返回协议规则',
        gotoNumberingEngine: '前往共享发号引擎',
      },
      sections: {
        templates: {
          title: '订单读取区',
          description: '选择销售订单并读取订单详情，为打印前解析提供权威输入。',
          placeholder:
            '订单读取能力已接入。这里将优先消费销售订单详情中的归一字段，而不是重新跨多来源二次推断。',
          selectLabel: '选择销售订单',
          selectPlaceholder: '-- 请选择订单 --',
          summary: {
            orderNo: '订单编号',
            customer: '客户',
            status: '订单状态',
            lines: '订单行数',
          },
          states: {
            loadingOrders: '订单列表加载中',
            emptyOrders: '当前没有可选择的销售订单。',
            awaitingSelection: '请选择一张销售订单后再开始打印前解析。',
            loadingOrderDetail: '订单详情加载中',
            orderDetailFailed: '订单详情加载失败，请稍后重试。',
          },
        },
        parameters: {
          title: '解析规则区',
          description:
            '展示协议配置摘要，以及打印 TAB 当前采用的最小字段解析规则。',
          placeholder:
            '解析规则区已接入。这里仅说明当前字段来源与阻断规则，不承载打印机参数。',
          ruleTitle: '当前最小解析规则',
          summary: {
            protocolVersion: '协议版本',
            sequenceRuleKey: '发号规则键',
          },
          states: {
            loadingProtocol: '协议配置加载中',
            protocolLoadFailed: '协议配置加载失败，请稍后重试。',
          },
          rules: {
            modelCode: 'modelCode 来自订单行 `modelCodeSnapshot`',
            holePrefix: 'holePrefix 来自订单行 `holePrefixSnapshot`',
            appearanceCode:
              'appearanceCode 来自订单行 `appearanceBarcodeCodeSnapshot`',
            holeCount: 'holes 来自订单行 `holeCount`',
            quantity: '预打数量默认取订单行 `qty`，可独立调整为 1-200',
          },
        },
        preview: {
          title: '解析预览区',
          description:
            '按订单行设置独立预打数量，每枚唯一编码同时生成一维码与二维码，并在同一窗口预览。',
          placeholder: '预打数量独立于订单数量，单次支持 1 到 200 枚唯一条码。',
          actions: {
            printNow: '立即打印 {{quantity}} 张',
            printing: '正在生成预览 ({{quantity}})...',
            previewReady: '打印预览已生成',
            loadingIssuanceSummary: '正在读取签发数量',
            unattributedIssuedInventory: '历史编码归属未确认',
            orderQuantityReached: '已达到订单数量',
            batchPrintAll: '整单批量打印',
            batchPrinting: '整单打印中',
          },
          summary: {
            ready: '可解析 {{count}} 行',
            blocked: '阻断 {{count}} 行',
          },
          toasts: {
            linePrintSuccess: '已生成 {{quantity}} 枚标签的打印预览',
            linePrintSuccessDescription: '完整条码：{{code}}',
            linePrintFailed: '打印预览生成失败',
            batchPrintSuccess: '整单打印预览已生成，共 {{count}} 行。',
            batchPrintPartial:
              '整单打印预览部分成功：成功 {{successCount}} 行，失败 {{failureCount}} 行。',
            batchPrintFailed: '整单打印预览生成失败，请稍后重试。',
          },
          errors: {
            quantityInvalid:
              '预打数量 {{quantity}} 无效，单次必须是 1 到 200 的整数。',
            previewBlocked:
              '浏览器阻止了打印预览窗口，请允许本站打开弹窗后重试。',
            previewClosed:
              '打印预览窗口已关闭；如批次已创建，系统会自动将其报废。',
            renderFailed:
              '一维码或二维码渲染失败，请重试；新签发批次将按原打印规则作报废处理。',
          },
          states: {
            awaitingSelection: '请选择订单后查看解析结果。',
            loading: '订单解析中',
            noLines: '当前订单没有可用于解析的订单行。',
            lineReady: '可解析',
            lineBlocked: '已阻断',
            unattributedIssuedInventory:
              '有 {{quantity}} 个有效历史编码无法确认所属订单行，完成库存核对前暂不能继续签发。',
          },
          fields: {
            lineNo: '订单行',
            modelCode: '型号编码',
            holePrefix: '孔型前缀',
            appearanceCode: '外观位值',
            holeCount: '孔数',
            quantity: '数量',
            orderQuantity: '订单数量',
            issuedQuantity: '有效已签发',
            remainingQuantity: '剩余可签发',
            printQuantity: '本次预打数量',
            sequenceRuleKey: '发号规则键',
            mockSerial: '预览流水号',
            barcodeSerial: '打印配置流水号',
            blockReason: '阻断原因',
          },
          issues: {
            productMissing: '缺少产品绑定',
            modelCodeMissing: '缺少型号编码快照',
            holePrefixMissing: '缺少孔型前缀快照',
            appearanceCodeMissing: '缺少外观位值快照',
            holeCountMissing: '缺少孔数',
            quantityInvalid: '数量必须大于 0',
            sequenceRuleKeyMissing: '协议未配置发号规则键',
          },
        },
        result: {
          title: '本次任务结果',
          description:
            '保留最近一次整单批量打印的执行结果，方便快速回看成功/失败行。',
          actions: {
            retryFailedOnly: '仅重打失败行',
            retryingFailedOnly: '重打失败行中',
            retryItem: '重试打印',
            retryingItem: '重试中',
          },
          filters: {
            all: '全部',
            success: '成功',
            failed: '失败',
            skipped: '跳过',
          },
          summary: {
            totalLines: '总行数',
            printableLines: '可打印行数',
            successCount: '成功行数',
            failureCount: '失败行数',
            skippedCount: '跳过行数',
          },
          states: {
            emptyFiltered: '当前筛选条件下没有结果项。',
          },
          status: {
            success: '成功',
            failed: '失败',
            skipped: '跳过',
          },
          fields: {
            lineNo: '订单行',
            message: '结果说明',
            serial: '使用流水号',
            barcodeSerial: '打印流水号',
          },
          messages: {
            success: '打印预览已生成',
            failed: '打印预览生成失败',
            skippedBlocked: '该行不满足打印条件，已跳过。',
            skippedPreviewReady: '该行已生成打印预览，已阻止重复生成。',
          },
        },
        inventory: {
          title: '产品编码库存',
          description:
            '同一行展示每枚已签发编码的一维码与二维码。补打使用原编码，不重复发号。',
          actions: {
            reprint: '补打原编码',
            reprintCode: '补打原编码 {{code}}',
          },
          total: '库存 {{count}}',
          available: '可用 {{count}}',
          refresh: '刷新产品编码库存',
          loading: '产品编码库存加载中',
          loadFailed: '产品编码库存加载失败，请重试。',
          empty: '当前范围内还没有已生成的产品编码库存。',
          fields: {
            code: '完整条码',
            batchNo: '打印批次',
            lineNo: '订单行',
            status: '状态',
            expiresAt: '失效时间',
            createdAt: '生成时间',
          },
          status: {
            AVAILABLE: '可用',
            BOUND: '已绑定',
            EXPIRED: '已失效',
            SCRAPPED: '已报废',
          },
        },
      },
    },
    status: {
      page: {
        title: '产品编码状态定义',
        description:
          '定义产品编码在打印库存与生产执行中的状态；Code128 一维码和 QR 二维码使用同一编码、共享同一状态',
        badges: {
          definitionOnly: '状态定义',
        },
      },
      actions: {
        retryContract: '重新加载契约',
      },
      states: {
        loadingContract: '正在读取后端产品编码状态契约',
        contractLoadFailed: '产品编码状态契约加载失败',
        contractLoadFailedDescription:
          '状态定义不再使用前端兜底数组；如果这里加载失败，需要先修复后端契约接口，避免页面展示与真实状态机不一致。二维码与一维码共用这套状态。',
      },
      metrics: {
        total: '状态总数',
        inventory: '打印库存状态',
        terminal: '终态数量',
      },
      categories: {
        inventory: {
          title: '打印库存状态',
          description:
            '描述产品编码从打印生成到绑定、失效或作废的库存侧状态；一维码和二维码共用同一库存记录。',
        },
        production: {
          title: '生产执行状态',
          description:
            '描述产品编码在生产执行、转移、挂起和返工链路中的状态；生产开工不要求先完成卷材绑定，扫描任一图形都会进入同一状态。',
        },
      },
      location: {
        title: '生产状态二级定位',
        description:
          '生产执行状态是一级状态；具体路线位置由 routeStepId 标识，对应工序由 currentProcessStepId 表示。',
        required: '必填锚点',
        optional: '辅助锚点',
        writePolicyTitle: '写入边界',
      },
      locationAnchors: {
        ROUTE: {
          label: '产品路线',
          description:
            '说明条码属于哪条生产路线；没有路线时仍可保留状态，但无法按路线顺序自动推进。',
        },
        ROUTE_STEP: {
          label: '路线步骤',
          description:
            '精准定位当前生产位置。它代表某条路线里的具体步骤，而不是可复用的工序定义。',
        },
        PROCESS_STEP: {
          label: '当前工序',
          description:
            '从路线步骤带出的工序定义，用于展示当前产品处于哪个工序；写入时应由 routeStepId 校验并带出。',
        },
        CUSTODY_TRANSFER: {
          label: '持有/转移事实',
          description:
            '记录从本厂、待发区、委外单位到回收待检等持有方变化；它不替代生产执行状态。',
        },
      },
      writePolicies: {
        STATUS_DEFINITIONS_READ_ONLY:
          '状态定义是不可编辑契约，页面只能展示，不在这里手工改状态含义。',
        PRODUCTION_STATUS_WITH_LOCATION:
          '生产执行状态是一级状态；routeStepId 和 currentProcessStepId 是该状态下的二级位置。',
        ROUTE_STEP_IS_PRECISE_ROUTE_POSITION:
          '落库必须保存路线步骤 routeStepId，防止同一工序在重复路线位置定位错误。',
        WRITE_THROUGH_SCAN_OR_EXECUTION_COMMAND:
          '条码状态变化应通过扫码、执行、转移或带审计的纠错命令写入，不通过字典页直接编辑。',
      },
      flow: {
        title: '生命周期说明',
        description:
          '库存状态与生产状态分别由各自业务事实承载。产品绑定是可选的卷材追溯关联，不是生产开工前置。',
        printStageTitle: '产品编码签发',
        printStageDescription:
          '打印 TAB 为每枚产品编码建立库存记录，库存状态落在 linear_barcode_inventory_items。',
        bindingStageTitle: '可选：产品与卷材绑定',
        bindingStageDescription:
          '产品绑定将编码与已激活的预浸料卷实例关联；成功后库存从可用进入已绑定，不代表生产已开工。',
        executionStageTitle: '独立的生产执行履历',
        executionStageDescription:
          '生产状态初始化及扫码/工序命令写入生产状态、操作和事件；开工不要求产品绑定，也不修改编码库存。',
      },
      fields: {
        phase: '阶段',
        trigger: '触发方式',
        sourceTable: '数据表',
        terminalYes: '终态',
        terminalNo: '非终态',
      },
      definitions: {
        inventory: {
          AVAILABLE: {
            label: '可用',
            description:
              '产品编码已生成并保留在打印库存中，尚未与预浸料卷实例建立绑定。',
            phase: '打印后可用',
            trigger: '批量打印成功后自动写入',
          },
          BOUND: {
            label: '已绑定',
            description:
              '产品编码已与预浸料卷实例建立追溯关系，不能再次绑定到另一卷。',
            phase: '卷材追溯绑定后',
            trigger: '产品绑定动作成功后写入',
          },
          EXPIRED: {
            label: '已失效',
            description: '预打号码超过有效期，不应再被绑定到新产品。',
            phase: '库存失效',
            trigger: '过期编码查询时显示为已过期，扫码绑定检查时写入过期状态',
          },
          SCRAPPED: {
            label: '已报废',
            description:
              '打印预览关闭、批次作废或其他安全回滚后，该号码不可继续使用。',
            phase: '库存作废',
            trigger: '报废批次或安全回滚时写入',
          },
        },
        production: {
          NOT_STARTED: {
            label: '未开始',
            description: '产品编码已有生产状态记录，但还没有进入具体工序执行。',
            phase: '生产待启动',
            trigger: '初始化生产状态或路线步骤前进后写入',
          },
          IN_PROGRESS: {
            label: '执行中',
            description:
              '产品编码已经进入某个工序或执行动作，表示当前正在生产流转中。',
            phase: '工序执行',
            trigger: '扫码开始、工序执行或转移到新工序时写入',
          },
          COMPLETED: {
            label: '已完成',
            description:
              '产品编码对应的当前生产执行已经完成，可以进入后续验收、出货或归档判断。',
            phase: '执行完成',
            trigger: '工序完成或生产完成动作写入',
          },
          HOLD: {
            label: '已挂起',
            description:
              '产品编码暂时停在当前状态，需要人工确认、异常处理或等待后续动作。',
            phase: '异常等待',
            trigger: '异常挂起、暂停或等待处理时写入',
          },
          REWORK: {
            label: '返工中',
            description:
              '产品编码进入返工链路，后续仍需要通过扫码或执行动作回到明确状态。',
            phase: '返工处理',
            trigger: '品质异常、返工指令或返工转移时写入',
          },
        },
      },
    },
  },
  sharedCodeSource: {
    tabs: {
      holeCodes: '孔型孔数',
      numberingEngine: '共享发号引擎',
    },
    holeCodes: {
      page: {
        title: '孔型孔数编码源',
        description: '共享维护一维码孔型前缀与孔数的独立来源',
        total: '总条目 {{count}}',
        active: '启用 {{count}}',
      },
      sections: {
        prefix: {
          title: '孔型前缀',
          description: '维护一维码第 1 位孔型前缀来源。',
          total: '总前缀 {{count}}',
          active: '启用 {{count}}',
          emptyTitle: '暂无孔型前缀',
          emptyDescription: '当前还没有共享的孔型前缀，请先新增前缀来源。',
        },
        count: {
          title: '孔数',
          description: '维护一维码后 2 位孔数来源。',
          total: '总孔数 {{count}}',
          active: '启用 {{count}}',
          emptyTitle: '暂无孔数',
          emptyDescription: '当前还没有共享的孔数来源，请先新增孔数。',
        },
      },
      fields: {
        label: '显示名称',
        prefix: '孔型前缀',
        holes: '孔数',
        description: '说明',
        sortOrder: '排序',
        active: '启用状态',
      },
      actions: {
        createPrefix: '新增孔型前缀',
        createCount: '新增孔数',
        gotoHoleCodes: '前往孔型孔数配置',
        edit: '编辑',
        delete: '删除',
        save: '保存',
        cancel: '取消',
      },
      states: {
        loading: '孔型孔数加载中',
        emptyTitle: '暂无孔型孔数来源',
        emptyDescription: '当前还没有共享的孔型孔数编码来源，请先新增组合项。',
        noDescription: '暂无说明',
        enabled: '已启用',
        disabled: '已停用',
      },
      dialog: {
        prefixCreateTitle: '新增孔型前缀',
        prefixEditTitle: '编辑孔型前缀',
        prefixDescription: '维护共享编码源中的孔型前缀。',
        countCreateTitle: '新增孔数',
        countEditTitle: '编辑孔数',
        countDescription: '维护共享编码源中的孔数。',
      },
      toasts: {
        prefixSaveSuccess: '孔型前缀已保存',
        prefixSaveFailed: '孔型前缀保存失败',
        countSaveSuccess: '孔数已保存',
        countSaveFailed: '孔数保存失败',
        prefixDeleteSuccess: '孔型前缀已删除',
        prefixDeleteFailed: '孔型前缀删除失败',
        countDeleteSuccess: '孔数已删除',
        countDeleteFailed: '孔数删除失败',
        duplicatePrefixError: '该孔型前缀已存在',
        duplicateCountError: '该孔数已存在',
      },
    },
    numberingEngine: {
      page: {
        title: '共享发号引擎',
        description: '集中承载当前共享发号配置与产品编码发号规则入口',
        notice: '当前共享页仅保留产品编码共享发号规则配置。',
        badges: {
          linearBarcode: '产品编码',
        },
      },
      sections: {
        linearBarcode: {
          title: '产品编码发号规则',
          description:
            '复用当前产品编码发号规则与后端 /numbering/rules 配置能力。',
          status: '后端发号已接入',
        },
      },
    },
  },
}
