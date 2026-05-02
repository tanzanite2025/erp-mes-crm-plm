import { cn } from '@/lib/utils'
import {
  knowledgeContentToEditorHtml,
  sanitizeKnowledgeContentHtml,
} from '../data/knowledge-content'

interface KnowledgeBaseRichContentProps {
  content: string
  variant?: 'compact' | 'full'
  tone?: 'primary' | 'amber'
  className?: string
}

export const knowledgeBaseRichContentClass =
  'prose-none text-[13px] font-bold leading-6 text-foreground/85 [&_a]:font-black [&_a]:text-primary [&_h3]:mb-2 [&_h3]:mt-1 [&_h3]:text-[14px] [&_h3]:font-black [&_h4]:mb-1.5 [&_h4]:mt-2 [&_h4]:text-[13px] [&_h4]:font-black [&_img]:my-3 [&_img]:max-h-72 [&_img]:max-w-full [&_img]:rounded-2xl [&_img]:border [&_img]:border-dashed [&_img]:border-muted/60 [&_img]:bg-background [&_img]:object-contain [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-1 [&_strong]:font-black [&_ul]:list-disc'

const compactRichContentClass =
  'max-h-10 overflow-hidden text-[12px] leading-5 text-foreground/75 [&_blockquote]:hidden [&_h3]:mb-0 [&_h3]:mt-0 [&_h3]:text-[12px] [&_h4]:mb-0 [&_h4]:mt-0 [&_h4]:text-[12px] [&_img]:hidden [&_li]:ml-4 [&_p]:my-0'

export const knowledgeBasePrimaryBlockquoteClass =
  '[&_blockquote]:my-2 [&_blockquote]:rounded-2xl [&_blockquote]:border-l-4 [&_blockquote]:border-primary/25 [&_blockquote]:bg-background/70 [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote]:text-[12px] [&_blockquote]:font-bold [&_blockquote]:text-muted-foreground'

const amberBlockquoteClass =
  '[&_blockquote]:my-2 [&_blockquote]:rounded-2xl [&_blockquote]:border-l-4 [&_blockquote]:border-amber-500/30 [&_blockquote]:bg-amber-500/5 [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote]:text-[12px] [&_blockquote]:font-bold [&_blockquote]:text-muted-foreground'

export function KnowledgeBaseRichContent({
  content,
  variant = 'full',
  tone = 'primary',
  className,
}: KnowledgeBaseRichContentProps) {
  const contentHtml = sanitizeKnowledgeContentHtml(knowledgeContentToEditorHtml(content))

  return (
    <div
      className={cn(
        knowledgeBaseRichContentClass,
        tone === 'amber' ? amberBlockquoteClass : knowledgeBasePrimaryBlockquoteClass,
        variant === 'compact' && compactRichContentClass,
        className
      )}
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  )
}
