import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownProps {
  children: string
  className?: string
}

/**
 * 极光工业级 Markdown 渲染器
 * 职责：支持标准 Markdown、GFM 表格及 任务列表。针对流式输出进行了初步优化。
 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none break-words',
        'prose-p:leading-relaxed prose-p:my-2',
        'prose-headings:font-black prose-headings:italic prose-headings:uppercase prose-headings:tracking-widest prose-headings:mb-3 prose-headings:mt-4',
        'prose-strong:font-bold prose-strong:text-primary',
        'prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none',
        'prose-ul:my-2 prose-li:my-1',
        'prose-table:border prose-table:border-dashed prose-table:border-primary/20 prose-table:rounded-lg prose-table:overflow-hidden',
        'prose-th:bg-muted/50 prose-th:px-4 prose-th:py-2 prose-th:text-[10px] prose-th:font-black prose-th:uppercase',
        'prose-td:px-4 prose-td:py-2 prose-td:border-t prose-td:border-dashed prose-td:border-primary/10',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
