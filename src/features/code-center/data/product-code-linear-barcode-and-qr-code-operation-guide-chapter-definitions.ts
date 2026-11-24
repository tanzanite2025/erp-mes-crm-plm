import type { BusinessOperationGuideDefinition } from '@/components/chaptered-business-operation-guide-page'

const productCodeLinearBarcodeAndQrCodeOperationGuideChapters = [
  {
    key: 'overview',
    topics: ['meaning', 'sameContent', 'ownership'],
    references: [
      { path: '/code-center/linear-barcode/status', key: 'status' },
      { path: '/code-center/linear-barcode/protocol', key: 'protocol' },
    ],
  },
  {
    key: 'preparation',
    topics: ['product', 'appearance', 'sources'],
    references: [
      { path: '/engineering/products', key: 'products' },
      { path: '/code-center/shared-code-source/hole-codes', key: 'holeCodes' },
      {
        path: '/code-center/shared-code-source/numbering-engine',
        key: 'numberingEngine',
      },
    ],
  },
  {
    key: 'rules',
    topics: ['openProtocol', 'checkSources', 'verifyRule'],
    references: [
      { path: '/code-center/linear-barcode/protocol', key: 'protocol' },
      {
        path: '/code-center/shared-code-source/numbering-engine',
        key: 'numberingEngine',
      },
    ],
  },
  {
    key: 'printing',
    topics: ['selectOrder', 'previewLabels', 'printBoundary'],
    references: [{ path: '/code-center/linear-barcode/print', key: 'print' }],
  },
  {
    key: 'bindingAndUse',
    topics: [
      'bindProduct',
      'scanBoundary',
      'readLifecycleHistory',
      'qualityStationBoundary',
    ],
    references: [
      { path: '/cutting-operations/product-binding', key: 'productBinding' },
      { path: '/production-execution', key: 'productionExecution' },
      { path: '/code-center/linear-barcode/status', key: 'status' },
    ],
  },
  {
    key: 'statusAndExceptions',
    topics: ['statusMeaning', 'reprint', 'exceptionHandling'],
    references: [
      { path: '/code-center/linear-barcode/status', key: 'status' },
      { path: '/code-center/linear-barcode/print', key: 'print' },
    ],
  },
] as const

export const productCodeLinearBarcodeAndQrCodeOperationGuideDefinition = {
  titleKey: 'productCodeLinearBarcodeAndQrCodeOperationGuide.title',
  domainLabelKey: 'productCodeLinearBarcodeAndQrCodeOperationGuide.domainLabel',
  introductionKey:
    'productCodeLinearBarcodeAndQrCodeOperationGuide.introduction',
  mobileIntroductionKey:
    'productCodeLinearBarcodeAndQrCodeOperationGuide.mobileIntroduction',
  contentsLabelKey:
    'productCodeLinearBarcodeAndQrCodeOperationGuide.contentsLabel',
  readingAreaLabelKey:
    'productCodeLinearBarcodeAndQrCodeOperationGuide.readingAreaLabel',
  prerequisiteLabelKey:
    'productCodeLinearBarcodeAndQrCodeOperationGuide.prerequisiteLabel',
  stepsLabelKey: 'productCodeLinearBarcodeAndQrCodeOperationGuide.stepsLabel',
  resultLabelKey: 'productCodeLinearBarcodeAndQrCodeOperationGuide.resultLabel',
  questionLabelKey:
    'productCodeLinearBarcodeAndQrCodeOperationGuide.questionLabel',
  referenceTitleKey:
    'productCodeLinearBarcodeAndQrCodeOperationGuide.referenceTitle',
  referenceDescriptionKey:
    'productCodeLinearBarcodeAndQrCodeOperationGuide.referenceDescription',
  chapters: productCodeLinearBarcodeAndQrCodeOperationGuideChapters.map(
    (chapter) => ({
      key: chapter.key,
      labelKey:
        `productCodeLinearBarcodeAndQrCodeOperationGuide.chapters.${chapter.key}.label` as const,
      shortLabelKey:
        `productCodeLinearBarcodeAndQrCodeOperationGuide.chapters.${chapter.key}.shortLabel` as const,
      titleKey:
        `productCodeLinearBarcodeAndQrCodeOperationGuide.chapters.${chapter.key}.title` as const,
      descriptionKey:
        `productCodeLinearBarcodeAndQrCodeOperationGuide.chapters.${chapter.key}.description` as const,
      prerequisiteKey:
        `productCodeLinearBarcodeAndQrCodeOperationGuide.chapters.${chapter.key}.prerequisite` as const,
      resultKey:
        `productCodeLinearBarcodeAndQrCodeOperationGuide.chapters.${chapter.key}.result` as const,
      questionKey:
        `productCodeLinearBarcodeAndQrCodeOperationGuide.chapters.${chapter.key}.question` as const,
      answerKey:
        `productCodeLinearBarcodeAndQrCodeOperationGuide.chapters.${chapter.key}.answer` as const,
      steps: chapter.topics.map((topic) => ({
        titleKey:
          `productCodeLinearBarcodeAndQrCodeOperationGuide.topics.${topic}.title` as const,
        descriptionKey:
          `productCodeLinearBarcodeAndQrCodeOperationGuide.topics.${topic}.description` as const,
      })),
      referencePages: chapter.references.map((reference) => ({
        path: reference.path,
        labelKey:
          `productCodeLinearBarcodeAndQrCodeOperationGuide.references.${reference.key}` as const,
      })),
    })
  ),
} satisfies BusinessOperationGuideDefinition
