import type { BusinessOperationGuideDefinition } from '@/components/chaptered-business-operation-guide-page'

const qualityStandardCreationOperationGuideChapters = [
  {
    key: 'preparation',
    topics: ['product', 'stages', 'units'],
    references: [
      { path: '/engineering/products', key: 'products' },
      { path: '/engineering/product-creation-guide', key: 'productGuide' },
      { path: '/quality/standards', key: 'standards' },
    ],
  },
  {
    key: 'criteria',
    topics: ['create', 'item', 'stageSnapshot'],
    references: [{ path: '/quality/standards', key: 'standards' }],
  },
  {
    key: 'grading',
    topics: ['center', 'deviations', 'example'],
    references: [{ path: '/quality/standards', key: 'standards' }],
  },
  {
    key: 'draft',
    topics: ['check', 'save', 'revise'],
    references: [{ path: '/quality/standards', key: 'standards' }],
  },
  {
    key: 'publication',
    topics: ['submit', 'review', 'publish'],
    references: [{ path: '/quality/standards', key: 'standards' }],
  },
] as const

export const qualityStandardCreationOperationGuideDefinition = {
  titleKey: 'quality.standardCreationGuide.title',
  domainLabelKey: 'quality.standardCreationGuide.domainLabel',
  introductionKey: 'quality.standardCreationGuide.introduction',
  mobileIntroductionKey: 'quality.standardCreationGuide.mobileIntroduction',
  contentsLabelKey: 'quality.standardCreationGuide.contentsLabel',
  readingAreaLabelKey: 'quality.standardCreationGuide.readingAreaLabel',
  prerequisiteLabelKey: 'quality.standardCreationGuide.prerequisiteLabel',
  stepsLabelKey: 'quality.standardCreationGuide.stepsLabel',
  resultLabelKey: 'quality.standardCreationGuide.resultLabel',
  questionLabelKey: 'quality.standardCreationGuide.questionLabel',
  referenceTitleKey: 'quality.standardCreationGuide.referenceTitle',
  referenceDescriptionKey: 'quality.standardCreationGuide.referenceDescription',
  chapters: qualityStandardCreationOperationGuideChapters.map((chapter) => ({
    key: chapter.key,
    labelKey:
      `quality.standardCreationGuide.chapters.${chapter.key}.label` as const,
    shortLabelKey:
      `quality.standardCreationGuide.chapters.${chapter.key}.shortLabel` as const,
    titleKey:
      `quality.standardCreationGuide.chapters.${chapter.key}.title` as const,
    descriptionKey:
      `quality.standardCreationGuide.chapters.${chapter.key}.description` as const,
    prerequisiteKey:
      `quality.standardCreationGuide.chapters.${chapter.key}.prerequisite` as const,
    resultKey:
      `quality.standardCreationGuide.chapters.${chapter.key}.result` as const,
    questionKey:
      `quality.standardCreationGuide.chapters.${chapter.key}.question` as const,
    answerKey:
      `quality.standardCreationGuide.chapters.${chapter.key}.answer` as const,
    steps: chapter.topics.map((topic) => ({
      titleKey: `quality.standardCreationGuide.topics.${topic}.title` as const,
      descriptionKey:
        `quality.standardCreationGuide.topics.${topic}.description` as const,
    })),
    referencePages: chapter.references.map((reference) => ({
      path: reference.path,
      labelKey:
        `quality.standardCreationGuide.references.${reference.key}` as const,
    })),
  })),
} satisfies BusinessOperationGuideDefinition
