import { RefreshCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CardHeader } from '@/components/ui/card'
import {
  type RuleExecutionStatus,
  type RuleExecutionType,
} from '../../workflow-core/data/rule-execution-log-schema'

interface RuleExecutionLogToolbarProps {
  keyword: string
  onKeywordChange: (value: string) => void
  sourceCode: string
  onSourceCodeChange: (value: string) => void
  sourceOptions: string[]
  executionType: 'all' | RuleExecutionType
  onExecutionTypeChange: (value: 'all' | RuleExecutionType) => void
  executionStatus: 'all' | RuleExecutionStatus
  onExecutionStatusChange: (value: 'all' | RuleExecutionStatus) => void
  isFetching: boolean
  onRefresh: () => void
}

export function RuleExecutionLogToolbar({
  keyword,
  onKeywordChange,
  sourceCode,
  onSourceCodeChange,
  sourceOptions,
  executionType,
  onExecutionTypeChange,
  executionStatus,
  onExecutionStatusChange,
  isFetching,
  onRefresh,
}: RuleExecutionLogToolbarProps) {
  return (
    <CardHeader className='gap-0.5 border-b border-dashed border-muted/30 px-0 py-0'>
      <div className='grid gap-0.5 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.6fr))_auto]'>
        <div className='relative'>
          <Search className='pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder='搜索规则、分支、标题、状态或报错'
            className='h-9 rounded-2xl border-none bg-muted/50 pl-8.5'
          />
        </div>
        <Select value={sourceCode} onValueChange={onSourceCodeChange}>
          <SelectTrigger className='h-9 rounded-2xl border-none bg-muted/50'>
            <SelectValue placeholder='业务源' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>全部业务源</SelectItem>
            {sourceOptions.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={executionType}
          onValueChange={(value) =>
            onExecutionTypeChange(value as 'all' | RuleExecutionType)
          }
        >
          <SelectTrigger className='h-9 rounded-2xl border-none bg-muted/50'>
            <SelectValue placeholder='动作类型' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>全部动作</SelectItem>
            <SelectItem value='match'>规则命中</SelectItem>
            <SelectItem value='notify'>通知动作</SelectItem>
            <SelectItem value='approval'>审批动作</SelectItem>
            <SelectItem value='workflow'>流程动作</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={executionStatus}
          onValueChange={(value) =>
            onExecutionStatusChange(value as 'all' | RuleExecutionStatus)
          }
        >
          <SelectTrigger className='h-9 rounded-2xl border-none bg-muted/50'>
            <SelectValue placeholder='执行结果' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>全部结果</SelectItem>
            <SelectItem value='matched'>命中</SelectItem>
            <SelectItem value='success'>成功</SelectItem>
            <SelectItem value='failed'>失败</SelectItem>
            <SelectItem value='skipped'>跳过</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant='outline'
          onClick={onRefresh}
          disabled={isFetching}
          className='h-9 rounded-full border-dashed border-muted-foreground/30 px-3.5 text-[10px] font-black uppercase tracking-widest'
        >
          <RefreshCcw
            className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`}
          />
          刷新
        </Button>
      </div>
    </CardHeader>
  )
}
