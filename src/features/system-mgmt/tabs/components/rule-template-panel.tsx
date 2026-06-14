import { useMemo } from 'react'
import { Copy, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getStandardCommandDisplayTitle,
  getStandardCommandContextCategory,
  getStandardCommandContextGuard,
  getStandardCommandScopeSummary,
  type StandardCommand,
} from '../../workflow-core/data/schema'
import { useBusinessEventSources } from '../../workflow-core/hooks/use-business-event-sources'

interface RuleTemplatePanelProps {
  commands: StandardCommand[]
  selectedCommandId: string
  selectedCommand?: StandardCommand
  sourceCode: string
  actionCode: string
  statusCode: string
  onCommandChange: (commandId: string) => void
  onCreateTemplate: () => void
  onDuplicateTemplate: (template?: StandardCommand) => void
}

function renderTemplatePreviewContent(content: string) {
  return content.split(/(\[[A-Za-z][A-Za-z0-9_]*\])/g).map((part, index) => {
    const isVariable = /^\[[A-Za-z][A-Za-z0-9_]*\]$/.test(part)

    if (!isVariable) {
      return (
        <span key={`text-${index}`} className='whitespace-pre-wrap'>
          {part}
        </span>
      )
    }

    return (
      <span
        key={`var-${index}`}
        className='inline-flex rounded-md border border-primary/15 bg-primary/10 px-1.5 py-0.5 align-middle text-[10px] font-black text-primary'
      >
        {part}
      </span>
    )
  })
}

export function RuleTemplatePanel({
  commands,
  selectedCommandId,
  selectedCommand,
  sourceCode,
  actionCode,
  statusCode,
  onCommandChange,
  onCreateTemplate,
  onDuplicateTemplate,
}: RuleTemplatePanelProps) {
  const { sources } = useBusinessEventSources()
  const categorizedCommands = useMemo(() => {
    return commands.reduce(
      (result, command) => {
        const category = getStandardCommandContextCategory(command, {
          sourceCode,
          actionCode,
          statusCode,
        })
        result[category].push(command)
        return result
      },
      {
        recommended: [] as StandardCommand[],
        global: [] as StandardCommand[],
        other: [] as StandardCommand[],
      }
    )
  }, [actionCode, commands, sourceCode, statusCode])

  const selectedCategory = selectedCommand
    ? getStandardCommandContextCategory(selectedCommand, {
        sourceCode,
        actionCode,
        statusCode,
      })
    : null
  const selectedGuard = selectedCommand
    ? getStandardCommandContextGuard(selectedCommand, {
        sourceCode,
        actionCode,
        statusCode,
      })
    : null

  return (
    <div className='mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-4'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div className='space-y-1'>
          <div className='text-xs font-black text-primary'>通知内容模板</div>
          <p className='text-[11px] font-bold text-muted-foreground'>
            先绑定内容模板，再决定这条状态消息具体发什么。
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-9 rounded-xl text-[11px] font-black'
            onClick={onCreateTemplate}
          >
            <Plus className='mr-1 size-3.5' />
            新建模板
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-9 rounded-xl text-[11px] font-black'
            disabled={!selectedCommand}
            onClick={() => onDuplicateTemplate(selectedCommand)}
          >
            <Copy className='mr-1 size-3.5' />
            复制模板
          </Button>
        </div>
      </div>
      <div className='mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_220px] md:items-center'>
        <select
          value={selectedCommandId}
          onChange={(event) => onCommandChange(event.target.value)}
          className='h-10 rounded-2xl border border-input bg-background px-3 text-xs font-bold'
        >
          <option value=''>选择内容模板</option>
          {categorizedCommands.recommended.length > 0 ? (
            <optgroup label='当前状态推荐模板'>
              {categorizedCommands.recommended.map((command) => (
                <option key={command.id} value={command.id}>
                  {getStandardCommandDisplayTitle(command, sources)}
                </option>
              ))}
            </optgroup>
          ) : null}
          {categorizedCommands.global.length > 0 ? (
            <optgroup label='通用模板'>
              {categorizedCommands.global.map((command) => (
                <option key={command.id} value={command.id}>
                  {getStandardCommandDisplayTitle(command, sources)}
                </option>
              ))}
            </optgroup>
          ) : null}
          {categorizedCommands.other.length > 0 ? (
            <optgroup label='其他模板（范围冲突，不可选）'>
              {categorizedCommands.other.map((command) => (
                <option key={command.id} value={command.id} disabled>
                  {getStandardCommandDisplayTitle(command, sources)}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
        <div className='rounded-2xl border border-dashed border-primary/15 bg-background/70 px-3 py-2 text-[11px] font-bold text-muted-foreground'>
          {selectedCommand
            ? `当前模板：${getStandardCommandDisplayTitle(selectedCommand, sources)}`
            : '当前未绑定模板'}
        </div>
      </div>
      <div className='mt-3 rounded-2xl border border-dashed border-primary/15 bg-background/70 px-4 py-3 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
        当前上下文：{sourceCode} · {actionCode || '全部动作'} · {statusCode}
      </div>
      <div className='mt-3 rounded-2xl border border-dashed border-primary/15 bg-background/70 px-4 py-3'>
        {selectedCommand ? (
          <div className='space-y-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-[11px] font-black text-foreground'>
                {getStandardCommandDisplayTitle(selectedCommand, sources)}
              </span>
              <span className='rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] font-black text-primary'>
                {getStandardCommandScopeSummary(selectedCommand)}
              </span>
              {selectedCategory === 'recommended' ? (
                <span className='rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700'>
                  匹配当前状态
                </span>
              ) : null}
              {selectedCategory === 'global' ? (
                <span className='rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700'>
                  通用模板
                </span>
              ) : null}
              {selectedCategory === 'other' ? (
                <span className='rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700'>
                  范围冲突，禁止保存
                </span>
              ) : null}
              {selectedGuard?.tone === 'warning' ? (
                <span className='rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700'>
                  范围较宽，允许保存
                </span>
              ) : null}
              {selectedCommand.targetLink ? (
                <span className='rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] font-bold text-primary'>
                  {selectedCommand.targetLink}
                </span>
              ) : null}
            </div>
            {selectedGuard?.tone === 'blocking' &&
            selectedGuard.reasons.length > 0 ? (
              <div className='rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-black text-rose-700'>
                {selectedGuard.reasons.join('；')}
              </div>
            ) : null}
            {selectedGuard?.tone === 'warning' &&
            selectedGuard.reasons.length > 0 ? (
              <div className='rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-700'>
                {selectedGuard.reasons.join('；')}
              </div>
            ) : null}
            <p className='text-[11px] leading-relaxed font-bold text-muted-foreground'>
              {renderTemplatePreviewContent(selectedCommand.content)}
            </p>
          </div>
        ) : (
          <p className='text-[11px] leading-relaxed font-bold text-muted-foreground'>
            绑定后会在这里预览模板正文和跳转链接，方便直接确认这条状态消息会发什么。
          </p>
        )}
      </div>
    </div>
  )
}
