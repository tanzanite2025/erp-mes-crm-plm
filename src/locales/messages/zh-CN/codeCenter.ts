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
        subtitle: 'LINEAR BARCODE PRINT / 协议联动、模板承载与打印任务骨架页',
        notice: '当前页面先提供一维码打印能力的模块级承载骨架。后续将逐步接入模板管理、打印参数配置、预览与任务编排能力。',
        badges: {
          placeholder: '骨架占位',
          protocolLinked: '协议已联动',
        },
      },
      actions: {
        gotoProtocol: '返回协议规则',
        gotoNumberingEngine: '前往共享发号引擎',
      },
      sections: {
        templates: {
          title: '打印模板区',
          description: '承载后续的一维码标签模板、样式版本与模板映射配置。',
          placeholder: '模板管理能力将在后续阶段接入。当前先保留模块级入口与页面结构，用于承接标签模板列表、模板编辑器与版本切换。',
        },
        parameters: {
          title: '打印参数区',
          description: '承载纸张、方向、偏移、批次变量与条码协议联动参数。',
          placeholder: '打印参数能力将在后续阶段接入。这里将用于承接标签尺寸、打印机参数、批量打印变量及协议字段映射。',
        },
        preview: {
          title: '预览与任务区',
          description: '承载标签预览、任务下发、打印日志与异常回执。',
          placeholder: '打印预览与任务编排能力将在后续阶段接入。这里将用于承接标签渲染预览、任务队列、失败重试与打印回执。',
        },
      },
    },
  },
  dmCode: {
    tabs: {
      rules: 'DM码规则',
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
        notice: '当前共享页仅保留一维码共享发号规则配置。DM 码发号规则请在独立的 DM 码模块中维护。',
        badges: {
          linearBarcode: '一维码',
          dmCode: 'DM码',
        },
      },
      sections: {
        linearBarcode: {
          title: '一维码发号规则',
          description: '复用当前一维码发号规则与后端 /numbering/rules 配置能力。',
          status: '后端发号已接入',
        },
      },
    },
  },
}
