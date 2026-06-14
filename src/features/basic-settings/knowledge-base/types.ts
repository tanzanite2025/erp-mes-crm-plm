import type { KnowledgeBaseEntry } from './data/knowledge-base'

export type KnowledgeBaseDraft = Pick<
  KnowledgeBaseEntry,
  | 'title'
  | 'category'
  | 'summary'
  | 'content'
  | 'keywords'
  | 'routePath'
  | 'version'
>
