import { Copy, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type StandardCommand } from '../../workflow-core/data/schema'

interface RuleTemplatePanelProps {
  commands: StandardCommand[]
  selectedCommandId: string
  selectedCommand?: StandardCommand
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
        className='inline-flex rounded-md border border-primary/15 bg-primary/10 px-1.5 py-0.5 text-[10px] font-black text-primary align-middle'
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
  onCommandChange,
  onCreateTemplate,
  onDuplicateTemplate,
}: RuleTemplatePanelProps) {
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
          {commands.map((command) => (
            <option key={command.id} value={command.id}>
              {command.title}
            </option>
          ))}
        </select>
        <div className='rounded-2xl border border-dashed border-primary/15 bg-background/70 px-3 py-2 text-[11px] font-bold text-muted-foreground'>
          {selectedCommand
            ? `当前模板：${selectedCommand.title}`
            : '当前未绑定模板'}
        </div>
      </div>
      <div className='mt-3 rounded-2xl border border-dashed border-primary/15 bg-background/70 px-4 py-3'>
        {selectedCommand ? (
          <div className='space-y-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-[11px] font-black text-foreground'>
                {selectedCommand.title}
              </span>
              {selectedCommand.targetLink ? (
                <span className='rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] font-bold text-primary'>
                  {selectedCommand.targetLink}
                </span>
              ) : null}
            </div>
            <p className='text-[11px] font-bold leading-relaxed text-muted-foreground'>
              {renderTemplatePreviewContent(selectedCommand.content)}
            </p>
          </div>
        ) : (
          <p className='text-[11px] font-bold leading-relaxed text-muted-foreground'>
            绑定后会在这里预览模板正文和跳转链接，方便直接确认这条状态消息会发什么。
          </p>
        )}
      </div>
    </div>
  )
}
