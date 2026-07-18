export const codeCenter = {
  title: '编码中心',
  linearBarcode: {
    tabs: {
      protocol: '协议规则',
      print: '打印',
      numbering: '业务编号',
    },
    print: {
      page: {
        title: '一维码打印中心',
        subtitle: 'LINEAR BARCODE PRINT / 唯一码发号、批次留痕与 Code128 预览',
        notice:
          '只有唯一发号、15 位协议校验、批次落库与可打印预览全部完成，任务才会记为成功。批量唯一发号接入前，系统禁止重复打印同一条码。',
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
            quantity: 'quantity 来自订单行 `qty`',
          },
        },
        preview: {
          title: '解析预览区',
          description:
            '展示订单行是否满足安全打印条件，以及当前可用的条码参数快照。',
          placeholder:
            '解析预览区会阻断缺少唯一条码的数据，避免同一流水号被重复打印。',
          actions: {
            issueRealNumbers: '获取真实发号',
            issuingNumbers: '发号中',
            numbersReady: '真实发号已加载',
            printNow: '立即打印 {{quantity}} 张',
            printing: '正在生成预览 ({{quantity}})...',
            previewReady: '打印预览已生成',
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
            uniqueCodesRequired:
              '已阻止打印 {{quantity}} 张：当前只有一个唯一流水号，不能重复生成相同条码。',
            previewBlocked:
              '浏览器阻止了打印预览窗口，请允许本站打开弹窗后重试。',
            previewClosed:
              '打印预览窗口已关闭；如批次已创建，系统会自动将其报废。',
            renderFailed: 'Code128 标签渲染失败，未创建打印批次。',
          },
          states: {
            awaitingSelection: '请选择订单后查看解析结果。',
            loading: '订单解析中',
            noLines: '当前订单没有可用于解析的订单行。',
            lineReady: '可解析',
            lineBlocked: '已阻断',
            awaitingRealNumber: '请先获取真实发号',
            numberingFailed: '真实发号失败，请稍后重试。',
          },
          fields: {
            lineNo: '订单行',
            modelCode: '型号编码',
            holePrefix: '孔型前缀',
            appearanceCode: '外观位值',
            holeCount: '孔数',
            quantity: '数量',
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
            uniqueCodesRequired:
              '数量为 {{quantity}}，但当前订单行只有一个唯一流水号；批量唯一发号接入前禁止打印。',
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
            skippedUnnumbered: '该行尚未获取真实发号，已跳过。',
            skippedPreviewReady: '该行已生成打印预览，已阻止重复生成。',
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
        description: '集中承载当前共享发号配置与一维码发号规则入口',
        notice: '当前共享页仅保留一维码共享发号规则配置。',
        badges: {
          linearBarcode: '一维码',
        },
      },
      sections: {
        linearBarcode: {
          title: '一维码发号规则',
          description:
            '复用当前一维码发号规则与后端 /numbering/rules 配置能力。',
          status: '后端发号已接入',
        },
      },
    },
  },
}
