import type { BusinessOperationGuideDefinition } from '@/components/chaptered-business-operation-guide-page'

const purchaseOperationGuideChapterDefinitions = [
  {
    key: 'preparation',
    topics: ['suppliers', 'materials', 'terms'],
    references: [
      {
        key: 'suppliers',
        path: '/purchase/suppliers',
      },
      {
        key: 'materials',
        path: '/materials/all',
      },
    ],
  },
  {
    key: 'orders',
    topics: ['header', 'lines', 'status'],
    references: [
      {
        key: 'orders',
        path: '/purchase/orders',
      },
      {
        key: 'suppliers',
        path: '/purchase/suppliers',
      },
    ],
  },
  {
    key: 'receiving',
    topics: ['logistics', 'receipt', 'inbound'],
    references: [
      {
        key: 'orders',
        path: '/purchase/orders',
      },
      {
        key: 'logistics',
        path: '/purchase/logistics',
      },
    ],
  },
  {
    key: 'returns',
    topics: ['returnSource', 'returnEvidence', 'returnReview'],
    references: [
      {
        key: 'orders',
        path: '/purchase/orders',
      },
    ],
  },
  {
    key: 'settlement',
    topics: ['payableSource', 'payment', 'reconciliation'],
    references: [
      {
        key: 'orders',
        path: '/purchase/orders',
      },
      {
        key: 'settlements',
        path: '/finance-settlements',
      },
    ],
  },
] as const

export const purchaseOperationGuideDefinition = {
  titleKey: 'purchase.operationGuide.title',
  domainLabelKey: 'purchase.operationGuide.domainLabel',
  introductionKey: 'purchase.operationGuide.introduction',
  mobileIntroductionKey: 'purchase.operationGuide.mobileIntroduction',
  contentsLabelKey: 'purchase.operationGuide.contentsLabel',
  readingAreaLabelKey: 'purchase.operationGuide.readingAreaLabel',
  prerequisiteLabelKey: 'purchase.operationGuide.prerequisiteLabel',
  stepsLabelKey: 'purchase.operationGuide.stepsLabel',
  resultLabelKey: 'purchase.operationGuide.resultLabel',
  questionLabelKey: 'purchase.operationGuide.questionLabel',
  referenceTitleKey: 'purchase.operationGuide.referenceTitle',
  referenceDescriptionKey: 'purchase.operationGuide.referenceDescription',
  chapters: purchaseOperationGuideChapterDefinitions.map((chapter) => ({
    key: chapter.key,
    labelKey: `purchase.operationGuide.chapters.${chapter.key}.label` as const,
    shortLabelKey:
      `purchase.operationGuide.chapters.${chapter.key}.shortLabel` as const,
    titleKey: `purchase.operationGuide.chapters.${chapter.key}.title` as const,
    descriptionKey:
      `purchase.operationGuide.chapters.${chapter.key}.description` as const,
    prerequisiteKey:
      `purchase.operationGuide.chapters.${chapter.key}.prerequisite` as const,
    resultKey:
      `purchase.operationGuide.chapters.${chapter.key}.result` as const,
    questionKey:
      `purchase.operationGuide.chapters.${chapter.key}.question` as const,
    answerKey:
      `purchase.operationGuide.chapters.${chapter.key}.answer` as const,
    steps: chapter.topics.map((topic) => ({
      titleKey: `purchase.operationGuide.topics.${topic}.title` as const,
      descriptionKey:
        `purchase.operationGuide.topics.${topic}.description` as const,
    })),
    referencePages: chapter.references.map((reference) => ({
      path: reference.path,
      labelKey: `purchase.operationGuide.references.${reference.key}` as const,
    })),
  })),
} satisfies BusinessOperationGuideDefinition
