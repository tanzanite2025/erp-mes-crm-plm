import { memo } from 'react'
import { motion } from 'framer-motion'
import { Activity, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Markdown } from '../../../components/markdown'
import {
  parseAllActionItems,
  cleanActionTags,
  type ActionItem,
} from '../utils/tag-parser'

interface AiMessageItemProps {
  msg: {
    role: 'user' | 'assistant' | 'system'
    content: string
  }
  onExecuteAction: (action: ActionItem) => void
}

/**
 * AI 单条消息渲染组件 (High Performance Memoized Item)
 * 职责：利用 React.memo 隔离重绘，支持 Markdown 渲染与协议标签解析。
 * 性能价值：在流式输出时，确保只有最后一条消息在更新，其余历史记录 0 重绘。
 */
export const AiMessageItem = memo(
  function AiMessageItem({ msg, onExecuteAction }: AiMessageItemProps) {
    const isUser = msg.role === 'user'

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'group flex flex-col gap-3',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'max-w-[92%] rounded-[24px] px-5 py-4 text-sm leading-relaxed transition-all sm:max-w-[88%]',
            isUser
              ? 'rounded-tr-none bg-primary font-medium text-primary-foreground shadow-lg shadow-primary/20'
              : 'rounded-tl-none border border-dashed border-primary/10 bg-muted/30 hover:bg-muted/50'
          )}
        >
          <Markdown
            className={isUser ? 'text-primary-foreground' : 'text-foreground'}
          >
            {cleanActionTags(msg.content)}
          </Markdown>

          {/* 动态指令按钮注入 (仅 Assistant 有) */}
          {!isUser && (
            <div className='mt-4 flex flex-wrap gap-2'>
              {parseAllActionItems(msg.content).map((action, aidx) => (
                <Button
                  key={aidx}
                  size='sm'
                  variant={action.type === 'ACT' ? 'secondary' : 'default'}
                  onClick={() => onExecuteAction(action)}
                  className='h-8 gap-1.5 rounded-full border border-primary/20 text-[10px] font-black tracking-widest uppercase transition-transform active:scale-90'
                >
                  <Activity className='size-3' />
                  {action.label}
                  <ChevronRight className='size-3 opacity-50' />
                </Button>
              ))}
            </div>
          )}
        </div>

        <span className='font-mono text-[8px] text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100'>
          {msg.role === 'assistant' ? 'NODE_AURORA' : 'OPERATOR'}
        </span>
      </motion.div>
    )
  },
  (prevProps, nextProps) => {
    // 自定义比对逻辑：仅当内容变化时才重绘
    return prevProps.msg.content === nextProps.msg.content
  }
)
