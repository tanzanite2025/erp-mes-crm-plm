import { type RefObject } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { SectionActions, SectionChangeBadge } from './business-event-source-card-primitives'
import { ENTITY_OPTIONS } from './business-event-source-card-constants'
import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'
import { readonlyFieldClass } from './business-event-source-card-shared'

interface BusinessEventSourceBaseSectionProps {
  source: BusinessEventSource
  isIdentityLocked: boolean
  dirty: boolean
  changeSummary: string
  focused: boolean
  saving: boolean
  saveDisabled: boolean
  undoAvailable: boolean
  undoDisabled: boolean
  undoing: boolean
  sectionRef: RefObject<HTMLElement | null>
  onSave: () => void
  onUndo?: () => void
  onCodeChange: (value: string) => void
  onModuleChange: (value: string) => void
  onEntityChange: (value: BusinessEventSource['entity']) => void
  onDefaultActionUrlTemplateChange: (value: string) => void
}

export function BusinessEventSourceBaseSection({
  source,
  isIdentityLocked,
  dirty,
  changeSummary,
  focused,
  saving,
  saveDisabled,
  undoAvailable,
  undoDisabled,
  undoing,
  sectionRef,
  onSave,
  onUndo,
  onCodeChange,
  onModuleChange,
  onEntityChange,
  onDefaultActionUrlTemplateChange,
}: BusinessEventSourceBaseSectionProps) {
  return (
    <section
      ref={sectionRef}
      className={cn(
        'mx-6 mt-5 rounded-2xl border border-dashed border-muted/40 bg-muted/10 p-4',
        dirty && 'border-amber-300/80 bg-amber-50/40',
        focused && 'ring-2 ring-sky-300 ring-offset-1'
      )}
    >
      <div className='mb-3 flex items-center justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-2'>
          <h4 className='text-xs font-black tracking-tight'>基础配置</h4>
          <SectionChangeBadge dirty={dirty} summary={changeSummary} />
        </div>
        <SectionActions
          onUndo={undoAvailable ? onUndo : undefined}
          undoDisabled={undoDisabled}
          undoing={undoing}
          onSave={onSave}
          saveDisabled={saveDisabled}
          saving={saving}
          saveLabel='保存基础'
        />
      </div>
      <div className='grid grid-cols-1 gap-3 lg:grid-cols-4'>
        <label className='flex flex-col gap-1.5 text-xs font-black text-muted-foreground'>
          事件源编码
          <Input
            value={source.code}
            readOnly={isIdentityLocked}
            onChange={(event) => onCodeChange(event.target.value.trim())}
            className={cn(
              'h-10 rounded-2xl font-mono text-xs',
              readonlyFieldClass(isIdentityLocked)
            )}
          />
        </label>
        <label className='flex flex-col gap-1.5 text-xs font-black text-muted-foreground'>
          模块
          <Input
            value={source.module}
            readOnly={isIdentityLocked}
            onChange={(event) => onModuleChange(event.target.value)}
            className={cn(
              'h-10 rounded-2xl text-xs font-bold',
              readonlyFieldClass(isIdentityLocked)
            )}
          />
        </label>
        <label className='flex flex-col gap-1.5 text-xs font-black text-muted-foreground'>
          兼容实体
          <select
            value={source.entity}
            disabled={isIdentityLocked}
            onChange={(event) =>
              onEntityChange(event.target.value as BusinessEventSource['entity'])
            }
            className={cn(
              'h-10 rounded-2xl border border-input bg-background px-3 text-xs font-bold',
              readonlyFieldClass(isIdentityLocked)
            )}
          >
            {ENTITY_OPTIONS.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
        </label>
        <label className='flex flex-col gap-1.5 text-xs font-black text-muted-foreground'>
          默认跳转
          <Input
            value={source.config.defaultActionUrlTemplate ?? ''}
            onChange={(event) =>
              onDefaultActionUrlTemplateChange(event.target.value)
            }
            className='h-10 rounded-2xl text-xs font-bold'
            placeholder='/trading/orders/[OrderId]'
          />
        </label>
      </div>
      {isIdentityLocked && (
        <p className='mt-3 text-xs font-bold text-muted-foreground'>
          核心标识创建后锁定。需要变更编码、模块或兼容实体时，请复制新事件源并重新绑定规则。
        </p>
      )}
    </section>
  )
}
