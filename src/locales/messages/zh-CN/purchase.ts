export const purchase = {
  tabs: {
    payables: "应付"
  },
  suppliers: {
    toasts: {
      saved: "供应商已保存",
      deleted: "供应商已删除"
    },
    ratings: {
      strategic: "战略合作伙伴 (Strategic)",
      preferred: "核心优质供应商 (Preferred)",
      standard: "一般合格供应商 (Standard)",
      probation: "考察中 / 待定 (Probation)"
    },
    loadingFailed: "供应商数据加载失败，请重试"
  },
  orders: {
    detailConfirmReceipt: "确认收货",
    viewPayable: "查看应付",
    detailPrintEvidence: "打印订单照片附件",
    detailReceiptAutoRemarks: "采购订单页人工确认收货",
    detailEvidenceTitle: "采购合同凭据",
    receiptDialogDescription: "逐行确认本次收货数量、批次号与目标仓位后提交。",
    receiptDialogDate: "收货日期",
    receiptDialogRemarks: "收货备注",
    receiptDialogRemainingQty: "待收数量",
    receiptDialogQuantity: "本次收货数量",
    receiptDialogBatchNo: "批次号",
    receiptDialogTargetCategory: "目标仓位",
    receiptDialogSelectCategory: "请选择目标仓位",
    receiptDialogCancel: "取消",
    receiptDialogSubmitting: "提交中...",
    receiptDialogSubmit: "确认收货并入库",
    toasts: {
      saved: "采购订单已保存",
      voided: "采购订单已作废",
      receiptConfirmed: "采购订单已确认收货"
    },
    validation: {
      supplierRequired: "请选择供应商",
      linesRequired: "订单必须包含至少一个明细项",
      lineInvalid: "请完善明细行信息，物料必填且数量需大于 0。"
    },
    status: {
      draft: "拟定中",
      sent: "正式下单",
      awaiting: "在途运输",
      received: "完成收货",
      canceled: "订单作废"
    }
  },
  payables: {
    title: "采购应付",
    description: "面向采购业务的应付账款入口，后续承接付款进度、账龄与对账视图。",
    summaryTotal: "应付余额",
    summaryOverdue: "逾期金额",
    summaryPending: "待付笔数",
    tableTitle: "应付清单",
    tableDescription: "查看应付台账余额、账龄状态，并进入明细弹层执行付款登记与分摊。",
    orderDialog: {
      noLedger: "当前采购订单暂无应付台账",
      loadFailed: "采购订单应付台账加载失败"
    },
    columns: {
      documentNo: "单据编号",
      supplierName: "供应商",
      invoiceAmount: "开票金额",
      paidAmount: "已付金额",
      outstandingAmount: "未付金额",
      dueDate: "到期日",
      agingBucket: "账龄",
      status: "状态"
    }
  },
  logistics: {
    offlineQueued: "已保存为离线草稿",
    offlineQueuedDesc: "物流单号 {{trackingNo}} 已暂存到本地，网络恢复后会自动提交。",
    offlineDraftsTitle: "离线入站草稿",
    offlineDraftsDesc: "这些记录只保存在当前设备，尚未正式提交到系统。",
    offlineDraftStatusPending: "待同步",
    offlineDraftStatusBlocked: "需要人工处理",
    offlineNetworkStatus: "已离线",
    offlineSyncNow: "立即同步",
    offlineSyncing: "同步中...",
    offlineSyncSuccess: "离线草稿已同步",
    offlineSyncSuccessDesc: "已成功提交 {{count}} 条草稿。",
    offlineSyncPending: "仍有草稿待处理",
    offlineSyncPendingDesc: "还有 {{count}} 条草稿留在本地，请稍后再试或人工处理。",
    offlineSavedAt: "本地保存时间：{{time}}",
    offlineLastError: "最近一次错误：{{message}}",
    offlineDraftRemoved: "已删除离线草稿"
  }
} as const
