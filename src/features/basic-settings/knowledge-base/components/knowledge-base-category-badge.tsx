import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import {
  KNOWLEDGE_BASE_CATEGORIES,
  type KnowledgeBaseCategory,
} from '../data/knowledge-base'

interface KnowledgeBaseCategoryBadgeProps {
  category: KnowledgeBaseCategory
  className?: string
}

export function KnowledgeBaseCategoryBadge({
  category,
  className,
}: KnowledgeBaseCategoryBadgeProps) {
  const { t } = useLanguage()
  const labelKey = KNOWLEDGE_BASE_CATEGORIES.find(
    (item) => item.value === category
  )?.labelKey

  if (!labelKey) return null

  return (
    <Badge
      variant='secondary'
      className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-black', className)}
    >
      {t(labelKey as any)}
    </Badge>
  )
}
