export const codeCenter = {
  title: '编码中心',
  linearBarcode: {
    tabs: {
      protocol: '协议规则',
      numbering: '业务编号',
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
  },
}
