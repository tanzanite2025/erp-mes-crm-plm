import { type TranslationKey } from '@/locales'
import { getKnowledgeContentText } from './knowledge-content'

export type KnowledgeBaseCategory =
  | 'workflow'
  | 'status'
  | 'operation'
  | 'exception'
  | 'terminology'

export interface KnowledgeBaseEntry {
  id: string
  title: string
  category: KnowledgeBaseCategory
  summary: string
  content: string
  contentText?: string
  keywords: string[]
  routePath: string
  hasImage?: boolean
  hasVideo?: boolean
  viewCount?: number
  lastViewedAt?: string
  version?: number
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt: string
}

export { getKnowledgeContentText } from './knowledge-content'

export const KNOWLEDGE_BASE_CATEGORIES: Array<{
  value: KnowledgeBaseCategory | 'all'
  labelKey: TranslationKey
}> = [
  { value: 'all', labelKey: 'basicSettings.knowledgeBase.categories.all' },
  {
    value: 'workflow',
    labelKey: 'basicSettings.knowledgeBase.categories.workflow',
  },
  {
    value: 'status',
    labelKey: 'basicSettings.knowledgeBase.categories.status',
  },
  {
    value: 'operation',
    labelKey: 'basicSettings.knowledgeBase.categories.operation',
  },
  {
    value: 'exception',
    labelKey: 'basicSettings.knowledgeBase.categories.exception',
  },
  {
    value: 'terminology',
    labelKey: 'basicSettings.knowledgeBase.categories.terminology',
  },
]

export const EMPTY_KNOWLEDGE_BASE_ENTRY: Omit<
  KnowledgeBaseEntry,
  'id' | 'updatedAt'
> = {
  title: '',
  category: 'operation',
  summary: '',
  content: '',
  keywords: [],
  routePath: '',
}

export const DEFAULT_KNOWLEDGE_BASE_ENTRIES: KnowledgeBaseEntry[] = [
  {
    id: 'kb-sales-order-scheduling',
    title: '销售订单为什么要进入排产中',
    category: 'status',
    summary: '排产中是销售订单进入一维码打印、MRP 和仓储备货前的闭环状态。',
    content:
      '销售订单从待处理进入排产中后，代表订单已经被确认并进入生产准备链路。一维码打印只选择排产中的订单，避免草稿、待处理或已作废订单被误打印。',
    keywords: ['销售订单', '排产中', '一维码打印', '作废订单', '状态机'],
    routePath: '/code-center/linear-barcode/print',
    updatedAt: '2026-05-02T00:00:00.000Z',
  },
  {
    id: 'kb-packaging-assembly-scan',
    title: '装箱组装应该扫什么码',
    category: 'operation',
    summary: '装箱组装先扫描纸箱上的装箱码，再录入箱内产品一维码。',
    content:
      '装箱码应先打印并贴到纸箱上。手机端扫描纸箱上的装箱码后，进入该箱的组装录入流程，再继续扫描箱内产品一维码完成绑定。',
    keywords: ['装箱组装', '装箱码', '手机扫码', '产品一维码', '仓储配置'],
    routePath: '/warehouse-config/packaging-assembly',
    updatedAt: '2026-05-02T00:00:00.000Z',
  },
  {
    id: 'kb-canceled-order-meaning',
    title: '已作废订单为什么不参与业务选择',
    category: 'workflow',
    summary: '已作废订单只保留历史追溯，不再进入打印、备货、发货等执行链路。',
    content:
      '已作废订单表示该业务单据已经退出执行链路。它可以在历史或审计场景中查看，但不应该出现在需要继续执行的选择器中。',
    keywords: ['已作废', 'VOIDED', 'Canceled', '闭环', '历史追溯'],
    routePath: '/trading/sales-orders',
    updatedAt: '2026-05-02T00:00:00.000Z',
  },
]

export function normalizeKnowledgeKeywords(value: string) {
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function serializeKnowledgeKeywords(keywords: string[]) {
  return keywords.join('，')
}

export function matchesKnowledgeBaseEntry(
  entry: KnowledgeBaseEntry,
  keyword: string
) {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) return true

  const haystack = [
    entry.title,
    entry.summary,
    getKnowledgeContentText(entry.content),
    entry.routePath,
    ...entry.keywords,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalizedKeyword)
}
