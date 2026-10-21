export const home = {
  title: '首页',
  tab: '快捷入口',
  heading: '从这里开始工作',
  description: '跟随业务步骤完成工作，也可以按分类查找常用功能。',
  showMore: '查看更多',
  showLess: '收起',
  entryCount: '{{count}} 个入口',
  emptyTitle: '暂无可用的业务入口',
  emptyDescription: '开通业务权限后，相应的快捷入口会显示在这里。',
  productCreationGuide: {
    title: '如何建立产品',
    description:
      '先准备属性、模板和基础型号，再生成产品；产品保存后，可继续建立 BOM。',
    reuseHint: '已有属性、模板或基础型号时，核对后直接复用，无需每次重新建立。',
    stepNumber: '第 {{number}} 步',
    fieldsLabel: '需要填写',
    resultLabel: '完成后',
    openPage: '进入{{page}}',
    accessRequired: '需要该页面的访问权限',
    reusableConfiguration: '已有可复用',
    productCreated: '完成产品建档',
    optionalNext: '按需继续',
    steps: {
      attributes: {
        title: '准备产品模板的两级属性分类',
        action:
          '在“产品模板属性分类”中维护一级属性分类（如材质）及二级属性分类（如碳纤维）；已有合适的属性分类可直接复用。',
        fields:
          '一级、二级属性分类的中文名称；英文名称及说明按需补充。内部编码由系统自动生成。',
        result:
          '得到一级属性维度及其二级可选项。下一步将一级属性分类装配到产品模板。',
      },
      template: {
        title: '配置产品模板',
        action:
          '新增或选用产品模板，加入上一步的一级属性分类，并设置哪些属性为必填。',
        fields: '模板名称、说明，以及一级属性分类和必填设置。',
        result:
          '确定创建产品时会出现哪些规格和属性。下一步把模板关联到基础型号。',
      },
      baseModel: {
        title: '建立基础型号并关联模板',
        action:
          '在分类树中先维护一级、二级分类，再在二级分类下新增三级基础型号，确认其使用的产品模板。',
        fields:
          '上级分类、分类名称、分类编码、关联模板；可复用已存在的分类和模板配置。',
        result:
          '产品表单可以选择该基础型号，并解析对应模板。下一步生成具体产品。',
      },
      product: {
        title: '生成产品并保存',
        action:
          '进入“产品管理”，点击“生成产品”，选择基础型号，按解析出的模板填写规格和属性，再保存。',
        fields:
          '基础型号、两位数字的型号代码、模板要求的规格及必填属性；图片、附件和备注按需补充。',
        result:
          '保存后得到产品档案及系统生成的名称、编码。仅建立产品，到这里即可；需要配方时继续下一步。',
      },
      bom: {
        title: '为已建产品建立 BOM',
        action:
          '在“BOM 配方”中新建 EBOM，选择刚保存的产品，添加已有物料，维护分类、用量和损耗后保存草稿。',
        fields:
          '关联产品、BOM 版本、归属、档次、物料明细及成品重量/单位；客户归属时还需选择客户。',
        result:
          '得到关联该产品的 EBOM 草稿。后续评审、发布和派生生产 BOM 在 BOM 模块中继续处理。',
      },
    },
  },
  categories: {
    product: '建立产品档案，维护产品模板、属性及 BOM 结构。',
    dashboard: '查看全厂运行情况、生产日历、交付进度和系统动态。',
    purchaseAndSales: '处理采购、报价、销售订单及发货业务。',
    production: '衔接物料需求、排产、生产执行、委外与计件协同。',
    rawMaterials: '管理原材料资料、裁切计划、执行及引擎配置。',
    businessAnalysis: '分析产能、生产负荷、质量趋势及客户销售情况。',
    engineering: '查找工程数据库、工艺资料及技术参考。',
    quality: '维护质量标准，开展检验、审核与质量作业。',
    warehouseAndLogistics: '处理库存、出入库、盘点、包装及物流配置。',
    assets: '管理设备工装、维护保养、组织人员与实验业务。',
    finance: '维护财务基础配置，处理业务结算。',
    messagesAndApproval: '集中处理审批事项，查看业务消息和执行记录。',
    system: '管理系统设置、基础资料、终端及快捷操作。',
  },
}
