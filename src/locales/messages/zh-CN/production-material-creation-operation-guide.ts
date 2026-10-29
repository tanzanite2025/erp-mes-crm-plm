export const productionMaterialCreationOperationGuide = {
  title: '如何建立生产物料档案',
  domainLabel: '仓储管理 · 操作手册',
  introduction:
    '先建立物料身份与基础单位，再维护采购包装的拼装换算；以“手套按双使用、按袋采购”为例，逐项说明怎样填写并交给 BOM、采购与仓库核对。',
  mobileIntroduction:
    '用“1 袋手套有 10 双”的例子，说明物料建档、单位选择与拼装换算。',
  shortcutDescription:
    '建立生产物料、选对主单位，用手套整袋采购示例填写拼装换算，并衔接 BOM、采购与仓库。',
  entryLabel: '建档与拼装换算指南',
  contentsLabel: '生产物料建档指南目录',
  readingAreaLabel: '生产物料建档指南正文',
  referenceTitle: '继续办理',
  referenceDescription:
    '按当前步骤进入原业务页面。这里只显示你有权访问的入口；阅读指南不会保存档案或修改库存。',
  references: {
    materials: '打开生产物料档案',
    assembly: '打开拼装规则',
    units: '查看计量单位',
    bomGuide: '阅读如何建立 BOM',
    requirementsGuide: '阅读如何分析料号需求',
    requirements: '查看料号需求',
    purchasing: '打开采购订单',
    inventory: '查看生产物料仓库库存',
  },
  chapters: {
    purpose: {
      label: '先看用途',
      shortLabel: '用途',
      title: '先分清档案、配方与库存',
      description:
        '生产物料档案对应系统内置的“生产物料仓库”。这份指南说明这些生产用物料如何建档和维护包装换算，建好后继续供 BOM、采购和库存业务使用。',
      noticeTitle: '建立档案后，还需要办理实际业务',
      noticeDescription:
        '保存手套档案和“1 袋 = 10 双”的规则，只定义这是什么物料、怎样计量。实际采购、收料和库存数量，需要在各自业务中核对和记录。',
    },
    record: {
      label: '填写物料档案',
      shortLabel: '建档',
      title: '先建立一条能被 BOM、采购和库存共用的物料',
      description:
        '进入“生产物料档案 → 生产物料”，先检索名称与规格，再点击“登记档案”。下面用一种防护手套举例。',
      noticeTitle: '先确定实际使用的基础单位',
      noticeDescription:
        '若 BOM 和日常领用按“双”核算，手套主单位就选“双”。采购按袋交货时，后续建立“袋 → 双”的换算，不必为同一种手套再建一条按袋计量的档案。',
    },
    conversion: {
      label: '填写拼装换算',
      shortLabel: '换算',
      title: '把采购包装单位换成物料的基础单位',
      description:
        '保存物料后，进入同一模块的“拼装规则”，点击“新增换算规则”，搜索并选择刚建立的手套。假设供应商确认每袋装 10 双。',
      noticeTitle: '保存前读一遍换算预览',
      noticeDescription:
        '本例应显示“1 袋 = 10 双”。若基础单位显示为单位编码，请核对它对应“双”。预览若变成“1 双 = 10 袋”，说明方向不符，需要切换方向或重新填写系数。',
    },
    gloveExample: {
      label: '手套整袋示例',
      shortLabel: '示例',
      title: 'BOM 按双计算，采购和仓库按袋核对',
      description:
        '以下均为说明用示例：同一种手套，基础单位为双，供应商每袋装 10 双，某次 BOM 需求分析合计需要 25 双。',
      noticeTitle: '整包装建议与实际采购、收料分别核对',
      noticeDescription:
        '当前料号需求页会根据这条规则显示整包装建议；采购订单和仓库表单尚未自动读取此规则换算。实际填写时，数量与所选单位必须配套，收料以实际到货为准。',
    },
    handoff: {
      label: '核对与下一步',
      shortLabel: '衔接',
      title: '核对一次，再交给下一步业务',
      description:
        '建档完成后，按你要办理的事情进入 BOM、料号需求、采购订单或库存页面。各份指南独立阅读，通过相关入口衔接。',
      noticeTitle: '后续变化需要重新核对适用范围',
      noticeDescription:
        '已经被 BOM、采购或库存使用的物料，调整主单位前应先核对关联资料。供应商每袋数量变化时，重新核对规则和未完成业务，不能用新换算关系反推历史实际到货数量。',
    },
  },
  topics: {
    materialIdentity: {
      title: '生产物料档案：统一物料身份',
      description:
        '维护生产物料仓库所对应生产用物料的名称、规格、编码与主单位，包括原材料、包装、辅料、耗材和化学品。生产物料档案描述物料本身，生产物料仓库记录实际库存。',
    },
    warehouseScope: {
      title: '档案对应系统内置的生产物料仓库',
      description:
        '进入“仓储作业 → 库存清单”，查看“生产物料仓库”。它是系统内置的生产用料仓，承接这些物料的采购收料、物料入库和库存管理，无需再新建同名仓库。成品仓库、研发仓库等各有用途。建立档案本身不会产生库存，实际数量要通过收料、入库等业务记录。',
    },
    classification: {
      title: '物料分类不改变对应仓库',
      description:
        '手套可按企业口径归为“耗材”；原材料、包装、辅料、耗材和化学品是生产物料的分类，不是各自独立的仓库。日常生产用手套对应生产物料仓库，采购收料、物料入库时核对该仓库及实际数量。',
    },
    workflow: {
      title: '沿同一物料向下使用',
      description:
        '先查重并建档 → 确定主单位 → 按需建立拼装换算 → BOM 按主单位填写标准用量 → 采购和仓库核对包装与实际数量。BOM 的完整建立步骤见独立的“如何建立 BOM”指南。',
    },
    checkExisting: {
      title: '先按名称、规格查重',
      description:
        '先搜索已有手套，核对材质、尺码和计量口径。同一种手套共用一条档案；确实不同的规格再分别建档，避免采购和库存分散到重复料号。',
    },
    chooseUnit: {
      title: '主单位选“双”，包装单位稍后填“袋”',
      description:
        '主单位应与 BOM 实际用量和库存核对口径一致。本例选择“双”；选项中没有时，可从“单位设置”维护后再选择，并确认单位名称与编码对应正确。',
    },
    dimensions: {
      title: '结构化尺寸用于包装类物料',
      description:
        '选择“包装”分类时会显示内尺寸与物流尺寸。普通手套无需为了每袋装 10 双而改为“包装”分类；每袋数量在拼装规则中维护。',
    },
    saveRecord: {
      title: '保存后核对档案',
      description:
        '确认名称、规格、分类和单位后保存，返回列表检索并核对编码。当前编号由系统生成，新增时随名称和分类显示预览；BOM、采购和库存应关联保存后的同一物料。',
    },
    whenToConvert: {
      title: '什么时候适合建立拼装换算',
      description:
        '实际用量按双、米、平方米等基础单位计算，采购交货按袋、箱、卷等固定包装时，可以建立规则。例如一袋 10 双手套、一箱 100 个配件或一卷 25 m² 膜，均须先确认供应商实际包装量。',
    },
    baseUnit: {
      title: '基础单位从物料档案自动带入',
      description:
        '选择目标物料后，基础单位自动带入并且不能在规则弹窗里修改。如果本例没有带出“双”对应的单位，应先返回物料档案核对主单位。',
    },
    direction: {
      title: '系数按预览等式填写',
      description:
        '常用正向表示“1 包装单位 = 系数 × 基础单位”，本例填 10。切换方向后表示“1 基础单位 = 系数 × 包装单位”；若仍要表达同一包装关系，反向系数应为 0.1，而不是 10。系数必须大于 0。',
    },
    singleRule: {
      title: '同一种物料目前只保存一条换算规则',
      description:
        '已有规则时编辑原记录。目前不支持同时为同一物料建立袋、箱等多条规则，也不自动串联“箱 → 袋 → 双”。不同供应商包装不一致时，先统一适用口径，再按实际订单核对。',
    },
    bomUsage: {
      title: 'BOM 用量仍然按“双”填写',
      description:
        '在 BOM 中选择已保存的手套物料，按实际生产口径填写每件成品的标准用量，并与主单位“双”保持一致。实际标准用量由业务确认；本例只假定分析后的手套总需求为 25 双。',
    },
    wholeBags: {
      title: '25 双换算为至少 3 袋',
      description:
        '料号需求分析按总需求换算并向上取整：25 ÷ 10 = 2.5 袋，显示整包装建议 3 袋。这个建议基于总需求；实际采购还要结合可用库存、缺口和供应商起订量确认。',
    },
    purchaseQuantity: {
      title: '采购数量与价格都要对应同一单位',
      description:
        '与供应商沟通可写“3 袋，每袋 10 双，共 30 双”。若采购明细单位保持“双”，数量应填 30，单价也按每双核对；不能在单位仍为“双”时只填 3。若实际单据允许按袋办理，确认所选单位、每袋数量及计价口径。',
    },
    receivedQuantity: {
      title: '仓库按实际到货换算后核对',
      description:
        '若实到 3 袋且清点每袋 10 双，按基础单位核对为 30 双；若实到数量不同，按实际清点记录。需求 25 双与整袋到货 30 双之间多出的 5 双，要在后续实际领用后按库存记录核对，不能把建议数量当成已收料或已领用。',
    },
    checkRecord: {
      title: '档案检查',
      description:
        '同规格物料没有重复建档；分类正确；名称和规格可区分；主单位与 BOM、采购和库存核对口径一致。',
    },
    checkConversion: {
      title: '换算检查',
      description:
        '目标物料正确；供应商每袋数量已确认；基础单位与主单位一致；系数大于 0；预览准确表达“1 袋 = 10 双”，反向则是“1 双 = 0.1 袋”。',
    },
    followBusinessFlow: {
      title: '继续办理 BOM、需求、采购或入库',
      description:
        '建立配方去“如何建立 BOM”；查看按订单汇总的用量和整包装建议去“如何分析料号需求”或料号需求页；实际采购与库存分别回原页面办理。这里的说明和示例不会自动生成单据。',
    },
    relatedPackaging: {
      title: '其他包装业务在各自模块办理',
      description:
        '这里的拼装规则维护单位换算。仓储配置里的“装箱组装”绑定包装码与产品条码；物流“包装管理”维护包装尺寸、容量等资料并供装载计算使用。后两类业务的完整操作由各自指南后续承接。',
    },
  },
  materialFields: {
    title: '手套物料档案填写示例',
    headers: {
      field: '界面字段',
      value: '示例填写',
      explanation: '为什么这样填',
    },
    category: {
      field: '物料分类',
      value: '耗材',
      explanation: '按企业实际用途分类；采购按袋不改变物料分类。',
    },
    name: {
      field: '物料名称',
      value: '防护手套',
      explanation: '名称清楚，便于 BOM、采购与仓库检索。',
    },
    specification: {
      field: '规格型号',
      value: '棉纱，L 码',
      explanation: '写清会影响采购和领用的材质、尺码。',
    },
    unit: {
      field: '计量单位',
      value: '双',
      explanation: '本例 BOM 与日常用量按双核算，后续基础单位从这里带入。',
    },
    code: {
      field: '系统编号',
      value: '使用系统生成的编号',
      explanation: '保存后核对实际编码，后续关联同一物料。',
    },
    remarks: {
      field: '备注说明',
      value: '供应商标准包装：每袋 10 双',
      explanation: '备注帮助核对，正式换算关系还要在拼装规则保存。',
    },
  },
  conversionFields: {
    title: '“1 袋 = 10 双”逐项填写',
    headers: { field: '界面字段', value: '填写或核对', explanation: '含义' },
    material: {
      field: '目标物料',
      value: '已保存的防护手套',
      explanation: '核对名称、规格与编码，选择同一料号。',
    },
    baseUnit: {
      field: '基础单位',
      value: '自动带出“双”对应的单位',
      explanation: '只读，来自物料档案的主单位。',
    },
    packUnit: {
      field: '包装单位',
      value: '袋',
      explanation: '填包装名称；每袋数量填到系数中。',
    },
    factor: {
      field: '系数与方向',
      value: '10',
      explanation: '正向时每 1 袋含 10 双。',
    },
    direction: {
      field: '切换方向',
      value: '保持“1 袋 = 10 双”的正向',
      explanation: '若切到反向，要用 0.1 才能表示同一关系。',
    },
    preview: {
      field: '换算预览',
      value: '1 袋 = 10 双',
      explanation: '逐字核对后点击“确认保存”。',
    },
  },
  gloveExample: {
    title: '假设每袋 10 双、总需求 25 双',
    headers: { step: '核对环节', value: '示例数量', explanation: '使用口径' },
    requirement: {
      field: 'BOM 分析总需求',
      value: '25 双',
      explanation: '按物料基础单位汇总。',
    },
    rule: {
      field: '已确认的换算关系',
      value: '1 袋 = 10 双',
      explanation: '由供应商实际包装量确定。',
    },
    wholeBags: {
      field: '整包装建议',
      value: '25 ÷ 10 = 2.5 → 3 袋',
      explanation: '向上取整；还需核对库存和实际采购数量。',
    },
    received: {
      field: '假设实际到货',
      value: '3 袋 × 10 = 30 双',
      explanation: '实际数量配套实际单位，仓库按到货清点。',
    },
    remainder: {
      field: '假设随后实际领用 25 双',
      value: '30 − 25 = 5 双',
      explanation: '为方便理解的余量示例，实际余额以库存业务记录为准。',
    },
  },
}
