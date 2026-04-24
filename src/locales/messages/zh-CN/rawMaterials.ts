export const rawMaterials = {
  moduleTitle: '原材料管理',
  tabs: {
    catalog: '预浸料',
    batchEngine: '拆批引擎',
    cutSizeLibrary: '裁切尺寸库',
  },
  batchEngine: {
    title: '拆批引擎',
    description: '预留按卷材能力进行裁切模拟、长条优先拆分和下达联动的专用工作区。',
    status: '结构已就位',
    sections: {
      control: {
        kicker: '输入侧',
        title: '卷材与规则准备区',
        description: '后续这里承接卷实例选择、NFC 绑定、裁纱方案选择和规则输入。',
        blocks: {
          roll: {
            title: '当前卷材',
            value: '先选中具体哪一卷预浸料，再进入换算',
            hint: '这里后续会显示卷实例、NFC 标签、剩余面积/长度、回温时限和库存状态。',
          },
          plan: {
            title: '裁纱单据',
            value: '加载一张裁纱方案，并把每行工艺拆成结构化规则',
            hint: '角度、叠层数、长条优先、边损、渐短错位等会逐步从备注转成结构化字段。',
          },
          engine: {
            title: '引擎假设',
          },
        },
      },
      stage: {
        kicker: '模拟区',
        title: '卷到长条的裁切预览',
        description: '中间这块预留给图形化模拟，不再只靠表格推面积，因为真实工艺是先切长条再二次分切。',
        rollCanvasLabel: '模拟画布',
        rollCanvasHint: '后续会在这里展示整卷、首刀长条、长条分块、角度件和损耗区域。',
        simulationStatus: '预览骨架',
      },
      summary: {
        kicker: '输出侧',
        title: '结果摘要与下达联动',
        description: '这里后续承接本卷可执行数量、损耗说明，以及如何送入裁纱下达。',
        cards: {
          output: {
            title: '计划输出',
            value: '这里预留给本卷可执行数量、剩余卷能力和损耗拆解。',
            hint: '第一版先回答“这卷今天最多能做多少”，而不是直接对整张订单下达。',
          },
          linkage: {
            title: '下达流程',
            step1: '1. 选中真实预浸料卷和裁纱方案。',
            step2: '2. 模拟长条切法、叠层、角度裁切和损耗。',
            step3: '3. 把本卷可执行数量送入裁纱下达，作为本次执行量。',
          },
        },
        todoTitle: '预留主题',
      },
    },
    metrics: {
      roll: {
        label: '卷材基准',
        value: '一卷实物料',
        hint: '默认不再按整张销售订单总量直接换算。',
      },
      mode: {
        label: '规划模式',
        value: '先切长条，再拆小块',
        hint: '更贴近现场大刀路径，而不是把每块都当成独立净面积。',
      },
      loss: {
        label: '损耗口径',
        value: '角度 / 叠层 / 修边',
        hint: '损耗不能只看净面积，折角、错位和角度包络都要计入。',
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
          subtitle: '45 度裁切需要额外包络，不能只按净面积理解。',
          lossHint: '角度包络损耗',
        },
        layup: {
          title: '叠层裁切路径',
          subtitle: 'FAW 变化很多时候来自叠层工艺，而不是另一种原料。',
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
  },
  cutSizeLibrary: {
    title: '裁切尺寸库',
    description: '将标准裁切单元作为受控主数据维护，为模拟裁切与下达联动提供稳定输入。',
    status: '骨架已就位',
    actions: {
      add: '新增尺寸单元',
    },
    sections: {
      dataset: {
        kicker: '主数据集',
        title: '结构化裁切尺寸单元',
        description: '替代 1x20x9 这类自由字符串，改为结构化宽长、角度、叠层和损耗字段。',
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
      title: '暂未建立尺寸单元',
      description: '先在这里建立标准尺寸库，再让裁纱方案与模拟引擎引用，避免继续手输字符串。',
    },
    fields: {
      size: {
        label: '尺寸字段',
        hint: '将宽、长、张数拆为独立数值字段。',
      },
      angle: {
        label: '角度字段',
        hint: '将 0 / 45 / 自定义角度写入专用字段，不再混在备注。',
      },
      layup: {
        label: '叠层字段',
        hint: '记录叠层数与叠层模式，用于表达 FAW 叠层语义。',
      },
      loss: {
        label: '损耗字段',
        hint: '记录修边、刀缝、角度包络等额外损耗参数。',
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
