import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { HierarchyConfigEditorController } from '../hooks/use-hierarchy-config-editor'

const LEVEL_DESCRIPTIONS = {
  1: '定义最上层结构名称，用于表达当前层级体系的顶层归属。',
  2: '定义中间层结构名称，用于承接上下层之间的分类与组织。',
  3: '定义末级结构名称，用于表达当前体系中的执行或落地单元。',
} as const

interface HierarchyConfigEditorProps {
  editor: Pick<
    HierarchyConfigEditorController,
    | 'levels'
    | 'optionCatalogs'
    | 'updateLevelName'
    | 'addLevelOption'
    | 'updateLevelOption'
    | 'toggleLevelOptionEnabled'
    | 'moveLevelOption'
    | 'removeLevelOption'
  >
  showPreview?: boolean
  scopedLevels?: number[]
  layoutVariant?: 'page' | 'dialog'
}

export function HierarchyConfigEditor({
  editor,
  showPreview = true,
  scopedLevels,
  layoutVariant = 'page',
}: HierarchyConfigEditorProps) {
  const {
    levels,
    optionCatalogs,
    updateLevelName,
    addLevelOption,
    updateLevelOption,
    toggleLevelOptionEnabled,
    moveLevelOption,
    removeLevelOption,
  } = editor
  const [draftOptions, setDraftOptions] = useState<Record<number, { name: string }>>({})
  const visibleLevels = scopedLevels?.length
    ? levels.filter((level) => scopedLevels.includes(level.level))
    : levels
  const isDialogLayout = layoutVariant === 'dialog'
  const outerGridClassName = cn(
    'grid gap-4',
    isDialogLayout
      ? visibleLevels.length >= 3
        ? 'md:grid-cols-2 xl:grid-cols-3 xl:items-start'
        : visibleLevels.length > 1
          ? 'xl:grid-cols-2 xl:items-start'
          : ''
      : 'xl:grid-cols-3 xl:items-start',
  )
  const editorRowClassName = 'flex items-center gap-1.5'
  const optionRowClassName = 'flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-dashed border-primary/20 bg-background/85 p-1.5'

  return (
    <div className='flex flex-col gap-2.5'>
      <div className={outerGridClassName}>
        {visibleLevels.map((level) => {
          const levelOptions = optionCatalogs.find((catalog) => catalog.level === level.level)?.items || []
          const draftOption = draftOptions[level.level] || { name: '' }

          return (
            <Card key={level.id} className='rounded-[24px] border border-dashed border-muted/40 bg-background/90 shadow-none'>
              <CardHeader className='space-y-1 p-3 pb-1.5'>
                <div className='flex items-start gap-2'>
                  <div className='flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-primary/15 bg-primary/5 text-primary'>
                    <span className='text-[10px] font-black uppercase tracking-widest'>L{level.level}</span>
                  </div>
                  <div className='space-y-0.5 pt-0.5'>
                    <CardTitle className='text-sm font-black italic tracking-tighter text-foreground leading-none'>第 {level.level} 层名称</CardTitle>
                    <p className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 leading-tight'>
                      {LEVEL_DESCRIPTIONS[level.level as keyof typeof LEVEL_DESCRIPTIONS]}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='flex flex-col gap-2 px-3 pb-2.5 pt-0'>
                <div className='space-y-0.5'>
                  <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>层级名称</p>
                  <Input
                    value={level.name}
                    onChange={(event) => updateLevelName(level.level, event.target.value)}
                    placeholder={`请输入第 ${level.level} 层名称`}
                    className='h-9 rounded-xl border-none bg-muted/50 px-3 text-sm font-black tracking-tight'
                  />
                </div>

                <div className='space-y-1 rounded-xl border border-dashed border-muted/30 bg-muted/10 p-2 px-2.5'>
                  <div className='space-y-0.5'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>候选项池</p>
                    <p className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/45'>用于产线与模板新增时下拉选择该层级名称</p>
                  </div>

                  <div className={editorRowClassName}>
                    <Input
                      value={draftOption.name}
                      onChange={(event) => setDraftOptions((current) => ({
                        ...current,
                        [level.level]: {
                          ...draftOption,
                          name: event.target.value,
                        },
                      }))}
                      placeholder={`新增第 ${level.level} 层候选项`}
                      className='h-9 rounded-xl border-none bg-background/80 px-3 text-sm font-bold tracking-tight'
                    />
                    <Button
                      type='button'
                      variant='outline'
                      className='h-9 shrink-0 rounded-xl border-dashed px-4 text-[10px] font-black uppercase tracking-widest'
                      onClick={() => {
                        const added = addLevelOption(level.level, draftOption.name, '')
                        if (added) {
                          setDraftOptions((current) => ({
                            ...current,
                            [level.level]: { name: '' },
                          }))
                        }
                      }}
                    >
                      <Plus className='mr-1.5 size-3.5' /> 添加
                    </Button>
                  </div>

                  {levelOptions.length ? (
                    <div className='space-y-1'>
                      {levelOptions.map((item, index) => (
                        <div
                          key={item.id}
                          className={optionRowClassName}
                        >
                          <Input
                            value={item.name}
                            onChange={(event) => updateLevelOption(level.level, item.id, { name: event.target.value })}
                            className='h-8 rounded-xl border-none bg-muted/40 px-3 text-sm font-black tracking-tight'
                          />
                          <div className='flex shrink-0 items-center justify-end gap-1.5'>
                            <Button
                              type='button'
                              variant='outline'
                              className='h-8 rounded-xl border-dashed px-2.5 text-[10px] font-black uppercase tracking-widest'
                              onClick={() => toggleLevelOptionEnabled(level.level, item.id)}
                            >
                              {item.enabled ? '启用中' : '已禁用'}
                            </Button>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='size-8 rounded-xl border-dashed'
                              onClick={() => moveLevelOption(level.level, item.id, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUp className='size-3.5' />
                            </Button>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='size-8 rounded-xl border-dashed'
                              onClick={() => moveLevelOption(level.level, item.id, 'down')}
                              disabled={index === levelOptions.length - 1}
                            >
                              <ArrowDown className='size-3.5' />
                            </Button>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='size-8 rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-600'
                              onClick={() => removeLevelOption(level.level, item.id)}
                            >
                              <Trash2 className='size-3.5' />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='rounded-xl border border-dashed border-muted/30 bg-background/70 px-3 py-2 text-[10px] font-bold text-muted-foreground/60'>
                      当前还没有候选项，保存后可供产线与模板新增时下拉选择。
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {showPreview ? (
        <Card className='rounded-[24px] border border-dashed border-muted/40 bg-background/90 shadow-none'>
          <CardHeader className='space-y-1 pt-2.5 pb-1 px-3'>
            <CardTitle className='text-sm font-black italic tracking-tighter text-foreground leading-none'>命名预览</CardTitle>
            <p className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 leading-tight'>Preview / 预览当前三级结构命名方式</p>
          </CardHeader>
          <CardContent className={cn(
            'grid gap-2 px-3 pb-3 pt-0',
            isDialogLayout ? 'xl:grid-cols-1' : 'xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.95fr)]',
          )}>
            <div className='space-y-1 rounded-xl border border-dashed border-muted/30 bg-muted/10 p-2 px-2.5'>
              {visibleLevels.map((level, index) => (
                <div key={level.id} className='flex items-center gap-3'>
                  <span className='inline-flex h-5 rounded-full border border-dashed border-primary/20 bg-primary/5 px-2 text-[8px] font-mono leading-5 text-primary'>LEVEL {level.level}</span>
                  <span className='text-sm font-black tracking-tight text-foreground'>{level.name.trim() || `第 ${level.level} 层`}</span>
                  {index < visibleLevels.length - 1 ? <span className='text-muted-foreground/35'>/</span> : null}
                </div>
              ))}
            </div>

            <div className='grid content-start gap-2'>
              <div className='space-y-1.5'>
                <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>配置说明</p>
                <div className='rounded-xl border border-dashed border-muted/30 bg-muted/30 px-3 py-1.5 text-[11px] leading-relaxed text-muted-foreground/80'>
                  当前配置已开始承载层级名称与候选项池。一级、二级新增入口已开始从候选项池中下拉选择，现阶段仍不改底层固定三层数据结构。
                </div>
              </div>

              <div className='rounded-xl border border-dashed border-amber-300/70 bg-amber-500/10 px-3 py-1.5 text-[10px] leading-relaxed text-amber-700'>
                当前版本仍未接入 APS；候选项池会先驱动一级、二级新增入口，第三级先仅保留在配置层，后续再评估是否接入更下游的结构链路。
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
