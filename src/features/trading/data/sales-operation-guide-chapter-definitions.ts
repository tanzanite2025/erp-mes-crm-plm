import type { BusinessOperationGuideDefinition } from '@/components/chaptered-business-operation-guide-page'

const salesOperationGuideChapterDefinitions = [
  {
    key: 'preparation',
    topics: ['customers', 'products', 'terms'],
    references: [
      {
        key: 'customers',
        path: '/trading/customers',
      },
      {
        key: 'products',
        path: '/engineering/products',
      },
      {
        key: 'productGuide',
        path: '/engineering/product-creation-guide',
      },
      {
        key: 'quotes',
        path: '/quotes/orders',
      },
    ],
  },
  {
    key: 'orders',
    topics: ['header', 'lines', 'workflow'],
    references: [
      {
        key: 'orders',
        path: '/trading/sales-orders',
      },
      {
        key: 'customers',
        path: '/trading/customers',
      },
    ],
  },
  {
    key: 'delivery',
    topics: ['stock', 'shipping', 'tracking'],
    references: [
      {
        key: 'orders',
        path: '/trading/sales-orders',
      },
      {
        key: 'shipment',
        path: '/warehouse/shipment',
      },
      {
        key: 'vehicleMatch',
        path: '/shipping-management/vehicle-match',
      },
      {
        key: 'logistics',
        path: '/shipping-management/logistics',
      },
    ],
  },
  {
    key: 'afterSales',
    topics: ['returns', 'exchanges', 'returnAmounts'],
    references: [
      {
        key: 'orders',
        path: '/trading/sales-orders',
      },
      {
        key: 'returns',
        path: '/trading/sales-returns',
      },
      {
        key: 'exchanges',
        path: '/trading/sales-exchanges',
      },
    ],
  },
  {
    key: 'settlement',
    topics: ['receivableSource', 'collection', 'reconciliation'],
    references: [
      {
        key: 'orders',
        path: '/trading/sales-orders',
      },
      {
        key: 'settlements',
        path: '/finance-settlements',
      },
    ],
  },
] as const

export const salesOperationGuideDefinition = {
  titleKey: 'trading.operationGuide.title',
  domainLabelKey: 'trading.operationGuide.domainLabel',
  introductionKey: 'trading.operationGuide.introduction',
  mobileIntroductionKey: 'trading.operationGuide.mobileIntroduction',
  contentsLabelKey: 'trading.operationGuide.contentsLabel',
  readingAreaLabelKey: 'trading.operationGuide.readingAreaLabel',
  prerequisiteLabelKey: 'trading.operationGuide.prerequisiteLabel',
  stepsLabelKey: 'trading.operationGuide.stepsLabel',
  resultLabelKey: 'trading.operationGuide.resultLabel',
  questionLabelKey: 'trading.operationGuide.questionLabel',
  referenceTitleKey: 'trading.operationGuide.referenceTitle',
  referenceDescriptionKey: 'trading.operationGuide.referenceDescription',
  chapters: salesOperationGuideChapterDefinitions.map((chapter) => ({
    key: chapter.key,
    labelKey: `trading.operationGuide.chapters.${chapter.key}.label` as const,
    shortLabelKey:
      `trading.operationGuide.chapters.${chapter.key}.shortLabel` as const,
    titleKey: `trading.operationGuide.chapters.${chapter.key}.title` as const,
    descriptionKey:
      `trading.operationGuide.chapters.${chapter.key}.description` as const,
    prerequisiteKey:
      `trading.operationGuide.chapters.${chapter.key}.prerequisite` as const,
    resultKey: `trading.operationGuide.chapters.${chapter.key}.result` as const,
    questionKey:
      `trading.operationGuide.chapters.${chapter.key}.question` as const,
    answerKey: `trading.operationGuide.chapters.${chapter.key}.answer` as const,
    steps: chapter.topics.map((topic) => ({
      titleKey: `trading.operationGuide.topics.${topic}.title` as const,
      descriptionKey:
        `trading.operationGuide.topics.${topic}.description` as const,
    })),
    referencePages: chapter.references.map((reference) => ({
      path: reference.path,
      labelKey: `trading.operationGuide.references.${reference.key}` as const,
    })),
  })),
} satisfies BusinessOperationGuideDefinition
