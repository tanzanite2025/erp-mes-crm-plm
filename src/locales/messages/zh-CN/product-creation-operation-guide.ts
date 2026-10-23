export const productCreationOperationGuide = {
  title: '如何建立产品',
  launcherDescription:
    '选用已有模板和基础型号建立产品；BOM 可在验证确认后另行绑定。',
  openWizard: '开始 / 继续建档',
  guidedCreation: '步骤建档',
  readHandbook: '操作手册',
  productManagementEntryHint: '需要指引？可使用步骤建档。',
  previousStep: '上一步',
  stepNavigation: '产品建立步骤',
  templateIncludesAttributes: '模板已包含的属性',
  templateReuseHint: '确认后会直接沿用模板中的属性和必填规则，无需重新配置。',
  noTemplatesAvailable: '暂无可用模板，请联系负责模板配置的人员确认后再继续。',
  upstreamChangeHint:
    '更换配置后，需要重新确认后续步骤；已保存的业务记录会保留。',
  optionalBomDescription:
    '产品已建立，可以先结束本次操作。BOM 是产品生命周期管理的必备资料，可独立准备和验证，确认可用后再绑定到该产品。',
  bomComplete: 'BOM 已保存',
  finish: '完成并关闭',
  saveProductAndContinue: '保存产品并继续',
  stepLabels: {
    template: '选择模板',
    baseModel: '基础型号',
    product: '保存产品',
    bom: 'BOM（后续绑定）',
  },
  description:
    '先选用模板和基础型号，填写并保存产品资料。BOM 的准备、验证和绑定可分开进行，验证确认可用后再绑定产品。',
  reuseHint: '已有属性、模板或基础型号时，核对后直接复用，无需每次重新建立。',
  stepNumber: '第 {{number}} 步',
  fieldsLabel: '需要填写',
  resultLabel: '完成后',
  openPage: '进入{{page}}',
  accessRequired: '需要该页面的访问权限',
  reusableConfiguration: '已有可复用',
  productCreated: '完成产品建档',
  optionalNext: '按需继续',
  domainLabel: '产品 · 在线操作手册',
  progress: '产品建档 {{completed}} / 3 步已完成',
  completed: '已完成',
  current: '正在进行',
  pending: '待前步完成',
  skipped: '暂不建立',
  start: '开始本步',
  continue: '继续操作',
  review: '回看结果',
  close: '稍后继续',
  confirmAndContinue: '确认使用并继续',
  selectExisting: '选用已有配置',
  manageAttributes: '新增或维护属性分类',
  createBaseModel: '新增分类或基础型号',
  baseModelSelectionTitle: '选择已有基础型号',
  baseModelSelectionHint: '点击下方选择框，选用本次产品所属的基础型号。',
  baseModelSelectionPlaceholder: '点击选择基础型号',
  baseModelCurrentTemplate: '当前物理规格模板：',
  baseModelCurrentSelection: '本次使用的基础型号',
  baseModelNextAction: '确认型号后，点击“{{action}}”进入产品填写。',
  baseModelCreateTitle: '没有合适的基础型号？',
  baseModelCreateDescription: '已有型号直接选用；需要新型号时，从这里新增。',
  baseModelMeaningTitle: '通用基础型号与具体产品卡片',
  baseModelMeaning:
    '基础型号（如 R50）是同类产品共用的型号标识，用于归类。同一型号下，可以针对不同客户需求或 BOM 方案，分别建立具体产品；每个具体产品保存后形成一张独立卡片，并分别关联对应的 BOM。',
  baseModelProductCardExample:
    '例如：R50（碟刹）与 R50（V刹）共用 R50 基础型号，各自维护规格和 BOM。卡片名称以产品编辑中的“最终型号显示预览”为准。',
  baseModelProductAndBomTiming:
    '本步只选定基础型号，下一步再建立具体产品；产品可先保存，BOM 经验证确认后再单独关联。',
  baseModelCreateHelp:
    '新增时，父级选择二级分类，在“分类名称”和“分类编码”中手填型号名称和基础型号编码，并关联上一步选定的模板。尚无一级、二级分类时，可在同一弹窗逐级新增。也可在“产品管理 → 编辑分类 → 新增分类”中建立，已有型号直接选用。',
  selectAttributes: '选择本次需要的一级属性分类',
  attributeCategory: '属性分类',
  noAttributes: '本次不需要附加属性',
  selectTemplate: '选择物理规格模板',
  selectBaseModel: '选择三级基础型号',
  baseModelSelectionRule:
    '产品分类按“一级分类 → 二级分类 → 三级基础型号（如 R50）”组织。这里只列出已启用、且对应上一步所选模板的三级基础型号；一级、二级分类用于归类，不会出现在此下拉列表中。',
  baseModelCatalogSummary:
    '已读取：一级分类 {{levelOneCount}} 个，二级分类 {{levelTwoCount}} 个，三级基础型号 {{baseModelCount}} 个；本步可选 {{availableCount}} 个。',
  baseModelCatalogEmpty:
    '当前读取的产品分类为空。可点击“新增分类或基础型号”逐级建立；如已在其他电脑建立，请先重新加载核对。',
  baseModelMissingSecondLevel:
    '目前只有一级分类，尚无二级分类和三级基础型号。点击“新增分类或基础型号”，先选择已有一级分类作为父级，保存二级分类；再新增一次，选择二级父分类，手填三级型号名称、编码并关联上一步的模板。',
  baseModelMissingThirdLevel:
    '已有一级、二级分类，尚无三级基础型号。点击“新增分类或基础型号”，父级选择已有二级分类，手填型号名称、编码并关联上一步的模板，保存后即可选用。',
  baseModelInactiveCount:
    '{{count}} 个三级基础型号已停用，因此未列出。请在“产品管理 → 编辑分类”中核对，按实际需要启用。',
  baseModelUnresolvedTemplateCount:
    '{{count}} 个已启用的三级基础型号未关联到可用模板，因此未列出。请在“产品管理 → 编辑分类”中核对该型号及其父级的模板关联。',
  baseModelOtherTemplateCount:
    '{{count}} 个已启用的三级基础型号使用其他模板，与本次“{{template}}”不同，因此未列出。可点击顶部“选择模板”重新选用对应模板，或在“产品管理 → 编辑分类”中核对模板关联。',
  baseModelSelectionUnavailable:
    '上次选择的记录已不存在、已停用，或不符合本步的三级型号及模板要求，请重新选择。需要更换模板时，可点击顶部“选择模板”返回第一步。',
  baseModelSelectedStructuralCategory:
    '当前记录是一级或二级分类，仅用于归类；请按上方提示补齐并选用三级基础型号后继续。',
  baseModelCatalogLoadFailed:
    '产品分类读取失败，当前无法确认有哪些基础型号。请重新加载；读取失败不代表分类未建立。',
  baseModelTemplateLoadFailed:
    '模板读取失败，当前无法核对哪些基础型号符合上一步的模板。请重新加载。',
  productBaseModelUnavailable:
    '当前找不到上一步选定的基础型号。请点击顶部“基础型号”返回第二步，核对分类层级、启用状态及模板后重新选择；仅建立一级分类还不能生成具体产品。',
  selectPlaceholder: '请选择',
  emptyOptions: '暂无可用配置，请先新增。',
  selectedResult: '本次使用的配置',
  requiredAttribute: '必填',
  optionalAttribute: '选填',
  optionCount: '{{count}} 个可选项',
  noActiveAttributeOptions: '暂无已启用的二级属性选项。',
  templateMismatch:
    '该模板没有包含上一步选择的全部属性，请选用合适模板或新建模板。',
  baseModelMismatch:
    '该基础型号解析出的模板与上一步不一致，请选择合适的基础型号或重新配置。',
  savedBaseModelTemplateMismatch:
    '分类已保存，但该基础型号的模板与上一步不一致。请核对模板配置，无需重复新增。',
  savedBaseModelConfirmationFailed:
    '分类已保存，但模板核对失败。请点击“确认使用并继续”重试核对，无需重复新增。原因：{{message}}',
  missingAttributeOptions: '所选属性分类需要至少一个启用中的二级可选项。',
  loading: '正在加载业务配置…',
  loadFailed: '配置加载失败，请重试。',
  retry: '重新加载',
  saveFailed: '保存失败：{{message}}',
  confirmed: '本步已完成，继续下一步。',
  productComplete: '产品已建立',
  productCompleteDescription:
    '产品资料已保存，可以先完成本次产品建立。BOM 经验证确认可用后，可再单独绑定到该产品。',
  viewProduct: '查看产品档案',
  viewBom: '进入 BOM 配方',
  createBom: '继续建立 BOM',
  skipBom: '暂不建立 BOM，完成建档',
  startAnother: '建立另一个产品',
  startAnotherDescription: '开始新任务会清空本页进度，已保存的业务记录会保留。',
  startAnotherConfirm: '开始新的建档任务？',
  confirm: '确认',
  cancel: '取消',
  storageHint: '本次进度保存在当前账号的浏览器中，返回本 TAB 可继续操作。',
  storageFailed: '当前浏览器无法保存进度，离开本页后可能需要重新选择配置。',
  savedResult: '保存结果',
  recordVerificationHint:
    '完成状态以实际业务记录为准，本地进度用于恢复操作位置。',
  productVerificationChecking: '正在核对产品记录…',
  productVerificationFailed: '暂时无法核对产品记录，请重试。本地进度已保留。',
  productVerificationUnavailable:
    '当前没有产品页面的访问权限，无法核对产品记录。',
  productRecordMissing: '该产品记录已不存在，不能继续标记为已建立。',
  returnToProductStep: '返回产品步骤',
  bomVerificationChecking: '正在核对产品当前关联的 BOM…',
  bomVerificationFailed: '暂时无法核对 BOM 关联状态，请重试。本地进度已保留。',
  bomVerificationUnavailable: '当前没有 BOM 页面的访问权限，无法核对关联状态。',
  productCode: '产品编码',
  bomProductMismatch: '请选择本次刚建立的产品。',
  productBaseModelMismatch: '请选择本次确认的基础型号。',
  handbook: {
    contentsLabel: '本页内容',
    sections: {
      productRecord: '资料组成',
      classification: '型号与卡片',
      workflow: '建立步骤',
      displayMapping: '展示与维护',
      references: '配置参考',
    },
    referenceTitle: '配置参考与维护入口',
    introduction:
      '先确认三级基础型号，再按模板填写规格并保存具体产品。一个三级型号下面可以有多张产品卡片，卡片名称对应产品编辑中的聚合显示。BOM 经验证确认可用后再关联到具体产品。',
    productRecordTitle: '一个产品包含哪些资料',
    viewExistingProducts: '查看已有产品',
    existingProductsHint: '在产品管理中搜索、查看和编辑已有产品。',
    viewPage: '查看{{page}}',
    productRecord: {
      identity: {
        title: '基础型号与产品身份',
        description:
          '三级基础型号（如 R50）用于归类。每次新增并保存一个具体产品，就在该型号下面形成一张独立卡片，各自保存规格并关联 BOM。',
      },
      specifications: {
        title: '规格参数与属性',
        description:
          '基础型号关联的模板决定可填写的规格和必填属性，例如制动类型、工艺系列、轮圈类型。选定的具体值用于产品名称聚合和卡片标签展示。',
      },
      supportingInformation: {
        title: '图片与补充信息',
        description:
          '可补充产品缩略图、状态、生产约束，并按需关联工艺和模具分组。',
      },
      bom: {
        title: 'BOM · 产品生命周期管理',
        description:
          'BOM 是产品生命周期管理的必备资料，承载物料组成、版本和升级记录。产品可先建立，BOM 验证确认可用后再绑定，两项操作可以分开完成。',
      },
    },
    classificationExample: {
      title: '从三级分类到具体产品卡片',
      levelOne: '碳纤维车圈（一级分类）',
      levelTwo: '山地车车圈（二级分类）',
      levelThree: 'R50（三级基础型号）',
      productsLabel: '同属 R50，分别新增并保存的具体产品',
      discBrake: 'R50 (碟刹)',
      rimBrake: 'R50 (V刹)',
      description:
        'R50 是这些卡片共同所属的三级型号；碟刹、V刹是具体产品的规格差异。建立另一种具体产品时，可继续选用同一个 R50，并保存为另一张产品卡片。',
    },
    displayMapping: {
      title: '页面上的内容分别对应哪里',
      description:
        '分类、产品名称、规格标签和 BOM 标签各有维护位置。卡片名称以产品编辑底部“最终型号显示预览”的聚合显示为准。',
      columns: {
        display: '页面展示',
        meaning: '代表什么',
        location: '在哪里维护或核对',
      },
      rows: {
        classification: {
          display: '分类层级与 R50 标题',
          meaning:
            '一级、二级分类组织产品范围，第三级是自行命名的基础型号。同一个 R50 下可以归入多张具体产品卡片。',
          location:
            '产品管理 → 编辑分类 → 新增分类。选择二级父分类，再手填“分类名称”和“分类编码”，即建立三级基础型号；在分类弹窗维护层级和模板关系。',
        },
        productCard: {
          display: 'R50 下面的每张产品卡片',
          meaning:
            '每张卡片对应一条单独保存的具体产品记录，可以具有不同规格和各自关联的 BOM。同属一个三级型号的产品会一起展示在该型号下。',
          location:
            '产品管理 → 生成产品。选择基础型号 R50，填写本次产品的两位数字型号编码、规格和属性后保存；卡片右上角设置可编辑这条产品。',
        },
        namePreview: {
          display: '卡片名称，例如 R50 (碟刹)',
          meaning:
            '名称按现有规则聚合基础型号与相关规格。“R50”对应三级基础型号，“碟刹”对应产品所选的制动类型；完整名称以聚合预览为准。',
          location:
            '新增或编辑产品 → 底部“最终型号显示预览”。填写规格时核对聚合名称和标签，确认后保存。',
        },
        productAttributes: {
          display: '工艺系列、轮圈类型等规格标签',
          meaning:
            '来自这条产品按模板填写的规格属性，例如“常规系列”“有钩”。参与标题聚合的内容与其余标签共同说明这张产品卡片。',
          location:
            '新增或编辑产品时按所用模板填写。属性和可选内容直接在该模板中维护，各模板独立配置，具体产品分别保存自己的选择。',
        },
        bomAttributes: {
          display: 'BOM 类型、归属、归属客户、性能版本、成品重量',
          meaning:
            '来自该具体产品关联的 BOM；归属客户在客户专供时适用，性能版本和成品重量也由 BOM 维护。BOM 承载物料组成、版本和升级记录。',
          location:
            'BOM 配方 → 找到或建立该具体产品对应的 BOM，核对关联产品并维护相关资料。产品可先保存，BOM 准备和验证确认后再绑定。',
        },
      },
      unboundHint:
        '卡片中“未绑定”表示该项尚无可展示的信息。产品规格到产品编辑中补充；BOM 相关标签到 BOM 配方中核对该产品的关联和资料。产品可以先建立，BOM 经验证确认可用后再关联。',
    },
    topics: {
      template: {
        title: '物理规格模板 · 定义填写内容',
        description:
          '模板定义车圈、把立、前叉等产品的规格字段和选项，建档时直接选用已有模板。',
        first: '在对应模板内维护规格属性及选项，并设置是否必填、启用和排序。',
        second: '同类产品复用已有模板，模板由负责配置的人员统一维护。',
      },
      attributes: {
        title: '属性分类 · 定义可选内容',
        description:
          '先维护属性名称和可选内容，再由模板决定本类产品使用哪些属性。',
        first: '一级属性分类表示维度，例如“材质”“工艺系列”。',
        second:
          '二级可选项表示具体取值，例如“碳纤维”“常规系列”，产品建档时从中选择。',
      },
      appearance: {
        title: '产品外观 · 用图片说明效果',
        description:
          '用名称、说明和参考图片表达不同的外观效果，便于查看和辨认。',
        first: '可上传纹理、涂装等外观参考图片，列表中显示图片缩略图。',
        second:
          '维护外观的条码位值、启用状态和排序；已有外观可继续补充说明或更换图片。',
      },
    },
    workflowTitle: '产品建立与后续 BOM 绑定',
    workflowSteps: {
      template: '选用已有物理规格模板，核对要填写的规格、属性及必填要求。',
      baseModel:
        '选用已有三级基础型号（如 R50）。需要新增时，在“编辑分类 → 新增分类”中选择二级父分类，填写型号名称和分类编码，并关联模板。',
      product:
        '在“生成产品”中选定基础型号，填写两位数字的型号编码及规格属性，核对底部“最终型号显示预览”后保存，形成一张具体产品卡片。',
      bom: '产品保存后，BOM 可独立准备和验证。确认可用时，在 BOM 配方中关联这张卡片对应的具体产品，并维护物料、性能版本、重量等资料。',
    },
    workflowHint:
      '已有分类、基础型号和模板可直接复用。建立同型号的另一种产品时，继续选用该三级型号，填写本次规格并另行保存；各张产品卡片分别维护自己的资料及 BOM 关联。',
  },
  steps: {
    attributes: {
      title: '准备产品模板的两级属性分类',
      action:
        '编辑对应的产品模板，直接添加属性（如材质）及其选项（如碳纤维），可分别设置必填、启用和排序。每个模板独立维护，修改后随模板一起保存。',
      fields:
        '一级、二级属性分类的中文名称；英文名称及说明按需补充。内部编码由系统自动生成。',
      result:
        '得到一级属性维度及其二级可选项。下一步将一级属性分类装配到产品模板。',
    },
    template: {
      title: '选择物理规格模板',
      action:
        '从已维护的物理规格模板中选择本次使用的模板，核对属性和必填规则后继续。',
      fields: '本次使用的物理规格模板，以及模板包含的属性和必填要求。',
      result:
        '确定创建产品时会出现哪些规格和属性。下一步把模板关联到基础型号。',
    },
    baseModel: {
      title: '确认基础型号',
      action:
        '选择本次产品使用的基础型号，再确认进入产品填写；没有合适型号时，可在本步新增。',
      fields:
        '选用已有三级基础型号；新增时，父级选择二级分类，手填分类名称（型号名称）、分类编码（基础型号编码），并关联模板。',
      result:
        '产品表单可以选择该基础型号，并解析对应模板。下一步生成具体产品。',
    },
    product: {
      title: '生成产品并保存',
      action:
        '使用已确认的基础型号，按模板填写规格和属性，保存后即可先完成产品建立。BOM 可在验证确认后另行绑定。',
      fields:
        '基础型号、两位数字的型号代码、模板要求的规格及必填属性；图片、附件和备注按需补充。',
      result:
        '保存后得到产品资料及系统生成的名称、编码。可以先结束本次操作，后续在 BOM 验证确认可用后再进行绑定。',
    },
    bom: {
      title: '为已建产品建立 BOM',
      action:
        'BOM 经验证确认可用后，再在本步关联已建立的产品，并核对物料、分类、用量和损耗后保存。产品建立、BOM 准备与验证、BOM 绑定可以分开操作。',
      fields:
        '关联产品、BOM 版本、归属、性能版本、物料明细及成品重量/单位；客户归属时还需选择客户。',
      result:
        '得到关联该产品的 EBOM 草稿。后续评审、发布和派生生产 BOM 在 BOM 模块中继续处理。',
    },
  },
}
