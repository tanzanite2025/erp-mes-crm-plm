import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Edit2,
  Layout,
  MoreVertical,
  Plus,
  Route,
  Trash2,
  X,
} from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useProductionTopologyLabels } from '../../../topology/production-topology-labels'
import type { TopologyTemplate } from '../../../topology/types'

interface TemplateCardProps {
  template: TopologyTemplate
  onEdit: (template: TopologyTemplate) => void
  onDelete: (id: string) => void
  onUpdate: (updatedTemplate: TopologyTemplate) => void
}

function createEmptySegment(name: string, sortOrder: number) {
  return {
    id: crypto.randomUUID(),
    name,
    sortOrder,
    processes: [],
  }
}

export function TemplateCard({
  template,
  onEdit,
  onDelete,
  onUpdate,
}: TemplateCardProps) {
  const { t } = useLanguage()
  const { level1Name, level2Name, level3Name } = useProductionTopologyLabels()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleAddSegment = () => {
    const nextName = window.prompt(`请输入${level2Name}名称`)
    if (!nextName?.trim()) {
      return
    }

    onUpdate({
      ...template,
      segments: [
        ...(template.segments || []),
        createEmptySegment(nextName.trim(), template.segments?.length || 0),
      ],
    })
  }

  const handleRemoveSegment = (segmentId: string) => {
    onUpdate({
      ...template,
      segments: (template.segments || []).filter(
        (segment) => segment.id !== segmentId
      ),
    })
  }

  const handleUpdateSegment = (segmentId: string, name: string) => {
    onUpdate({
      ...template,
      segments: (template.segments || []).map((segment) =>
        segment.id === segmentId ? { ...segment, name } : segment
      ),
    })
  }

  return (
    <Card className='group/card h-fit min-h-0 overflow-hidden rounded-[32px] border-l-4 border-l-orange-500 shadow-sm transition-all hover:shadow-md'>
      <CardContent className='h-fit min-h-0 space-y-3 p-3'>
        <div className='flex items-start justify-between'>
          <div className='flex flex-1 items-start gap-3'>
            <Button
              variant='ghost'
              size='icon'
              className='mt-1 size-8 text-muted-foreground'
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className='size-5' />
              ) : (
                <ChevronRight className='size-5' />
              )}
            </Button>
            <div className='space-y-1'>
              <div className='flex items-center gap-2'>
                <h4 className='text-base font-bold'>{template.name}</h4>
                <div className='flex items-center gap-1 rounded border border-orange-100 bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-600'>
                  <Copy className='size-2.5' />
                  {level1Name} 模板
                </div>
              </div>
              <p className='text-xs text-muted-foreground'>
                {template.description ||
                  t('orgPersonnel.topologyTemplateMgmt.card.noDescription')}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='size-8'>
                <MoreVertical className='size-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onClick={() => onEdit(template)}
                className='gap-2'
              >
                <Edit2 className='size-3.5' />
                {t('orgPersonnel.topologyTemplateMgmt.card.editInfo')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(template.id)}
                className='gap-2 text-rose-500 focus:text-rose-500'
              >
                <Trash2 className='size-3.5' />
                {t('orgPersonnel.topologyTemplateMgmt.card.deleteTemplate')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && (
          <div className='flex h-auto min-h-0 w-full animate-in flex-col items-start space-y-2 pt-1 pb-1 duration-300 fade-in slide-in-from-top-2'>
            {(template.segments || []).map((segment) => (
              <div
                key={segment.id}
                className='group/segment flex h-auto min-h-0 w-full flex-col gap-3 rounded-[28px] border-2 border-dashed border-muted/30 bg-muted/10 p-3 transition-all hover:border-orange-400/30 hover:bg-muted/15'
              >
                <div className='flex w-full items-center gap-3 pl-2 text-lg font-black tracking-tighter uppercase'>
                  <Layout className='size-5 shrink-0 text-orange-600' />
                  <span className='shrink-0 text-[10px] font-bold tracking-[0.2em] text-orange-600/50'>
                    [{level2Name}]
                  </span>
                  <Input
                    value={segment.name}
                    onChange={(event) =>
                      handleUpdateSegment(segment.id, event.target.value)
                    }
                    className='h-9 min-w-0 flex-1 border-transparent bg-transparent px-2 text-lg font-black tracking-tighter transition-all hover:border-slate-200 focus:border-orange-400'
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='flex size-8 shrink-0 items-center justify-center text-rose-300 opacity-0 transition-opacity group-hover/segment:opacity-100 hover:text-rose-500'
                      >
                        <X className='size-5' />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className='rounded-[32px] border-none bg-white/95 shadow-2xl backdrop-blur-xl'>
                      <AlertDialogHeader>
                        <AlertDialogTitle className='text-lg font-black tracking-tighter text-slate-900'>
                          {t(
                            'orgPersonnel.topologyTemplateMgmt.card.deleteStandardLevelTitle',
                            { levelName: level2Name }
                          )}
                        </AlertDialogTitle>
                        <AlertDialogDescription className='px-1 text-[11px] leading-relaxed font-medium tracking-wider text-slate-500 uppercase'>
                          {t(
                            'orgPersonnel.topologyTemplateMgmt.card.deleteStandardLevelDesc',
                            { levelName: level2Name, name: segment.name }
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className='gap-2'>
                        <AlertDialogCancel className='h-10 rounded-full border-none bg-slate-100 text-[10px] font-bold tracking-widest uppercase'>
                          {t('orgPersonnel.lineMgmt.dialog.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveSegment(segment.id)}
                          className='h-10 rounded-full bg-rose-500 text-[10px] font-bold tracking-widest uppercase'
                        >
                          {t('orgPersonnel.lineMgmt.topology.authVerify')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className='flex h-auto min-h-0 w-full flex-col gap-2 pl-4 sm:pl-8'>
                  {(segment.processes || []).length === 0 ? (
                    <p className='rounded-[20px] border border-dashed border-muted/40 bg-background/70 px-3 py-2 text-[10px] text-muted-foreground/50 italic'>
                      {t('orgPersonnel.lineMgmt.editor.noLevelsConfigured', {
                        levelName: level3Name,
                      })}
                    </p>
                  ) : (
                    (segment.processes || []).map((process) => (
                      <div
                        key={process.id}
                        className='flex w-full items-center gap-2 rounded-[20px] border border-muted/25 bg-background/80 px-3 py-2 text-[11px] font-bold text-slate-600'
                      >
                        <Route className='size-3.5 shrink-0 text-orange-600' />
                        <span className='shrink-0 rounded-full border border-orange-100 bg-orange-50 px-2 py-1 font-mono text-[10px] text-orange-700'>
                          {process.code || 'NO-CODE'}
                        </span>
                        <span className='truncate'>{process.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}

            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleAddSegment}
              className='mt-2 h-11 w-full rounded-[28px] border-dashed border-slate-300 text-[11px] font-black tracking-[0.2em] text-muted-foreground/60 uppercase shadow-sm transition-all hover:border-orange-400 hover:bg-orange-50/50 hover:text-orange-600 active:scale-95'
            >
              <Plus className='mr-2 size-4' />
              新增 {level2Name}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
