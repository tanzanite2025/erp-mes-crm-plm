import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Edit2, Layout, MoreVertical, Plus, Trash2, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import type { JobCategory, TopologyTemplate } from '../../line-mgmt/types'
import type { HierarchyLevelOptionItem } from '../../hierarchy-config/data/hierarchy-config'
import { useLanguage } from '@/context/language-provider'
import { useHierarchyLevelLabels } from '../../hierarchy-config/hooks/use-hierarchy-level-labels'
import { useHierarchyLevelOptions } from '../../hierarchy-config/hooks/use-hierarchy-level-options'
import { HierarchyOptionDropdownButton } from '../../hierarchy-config/components/hierarchy-option-dropdown-button'

interface TemplateCardProps {
  template: TopologyTemplate
  onEdit: (template: TopologyTemplate) => void
  onDelete: (id: string) => void
  onUpdate: (updatedTemplate: TopologyTemplate) => void
}

export function TemplateCard({ template, onEdit, onDelete, onUpdate }: TemplateCardProps) {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const { level1Name, level2Name, level3Name } = useHierarchyLevelLabels()
  const { level1Options, level2Options } = useHierarchyLevelOptions()

  const handleAddSegment = (option: HierarchyLevelOptionItem) => {
    const nextName = option.name.trim()
    if (nextName === '') {
      return
    }

    const newSegment = {
      id: crypto.randomUUID(),
      name: nextName,
      hierarchyOptionId: option.id,
      jobCategories: [],
    }
    onUpdate({ ...template, segments: [...(template.segments || []), newSegment] })
  }

  const handleAddJobCategory = (segmentId: string, option: HierarchyLevelOptionItem) => {
    const nextName = option.name.trim()
    if (nextName === '') {
      return
    }

    const updatedSegments = (template.segments || []).map((segment) => {
      if (segment.id !== segmentId) {
        return segment
      }

      const jobCategories = segment.jobCategories || []
      const nextJobCategory: JobCategory = {
        id: crypto.randomUUID(),
        segmentId,
        name: nextName,
        hierarchyOptionId: option.id,
        sortOrder: jobCategories.length,
        processes: [],
      }

      return {
        ...segment,
        jobCategories: [...jobCategories, nextJobCategory],
      }
    })

    onUpdate({ ...template, segments: updatedSegments })
  }

  const handleRemoveSegment = (segmentId: string) => {
    onUpdate({ ...template, segments: (template.segments || []).filter((segment) => segment.id !== segmentId) })
  }

  const handleRemoveJobCategory = (segmentId: string, jobCategoryId: string) => {
    const updatedSegments = (template.segments || []).map((segment) => {
      if (segment.id !== segmentId) {
        return segment
      }

      return {
        ...segment,
        jobCategories: (segment.jobCategories || []).filter((jobCategory) => jobCategory.id !== jobCategoryId),
      }
    })

    onUpdate({ ...template, segments: updatedSegments })
  }

  const handleUpdateSegment = (segmentId: string, name: string) => {
    const updatedSegments = (template.segments || []).map((segment) =>
      segment.id === segmentId ? { ...segment, name, hierarchyOptionId: undefined } : segment
    )
    onUpdate({ ...template, segments: updatedSegments })
  }

  const handleUpdateJobCategory = (segmentId: string, jobCategoryId: string, name: string) => {
    const updatedSegments = (template.segments || []).map((segment) => {
      if (segment.id !== segmentId) {
        return segment
      }

      return {
        ...segment,
        jobCategories: (segment.jobCategories || []).map((jobCategory) =>
          jobCategory.id === jobCategoryId ? { ...jobCategory, name, hierarchyOptionId: undefined } : jobCategory
        ),
      }
    })

    onUpdate({ ...template, segments: updatedSegments })
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
              {isExpanded ? <ChevronDown className='size-5' /> : <ChevronRight className='size-5' />}
            </Button>
            <div className='space-y-1'>
              <div className='flex items-center gap-2'>
                <h4 className='text-base font-bold'>{template.name}</h4>
                <div className='flex items-center gap-1 rounded border border-orange-100 bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-600'>
                  <Copy className='size-2.5' /> {t('orgPersonnel.topologyTemplateMgmt.card.standardTopology')}
                </div>
              </div>
              <p className='text-xs text-muted-foreground'>
                {template.description || t('orgPersonnel.topologyTemplateMgmt.card.noDescription')}
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
              <DropdownMenuItem onClick={() => onEdit(template)} className='gap-2'>
                <Edit2 className='size-3.5' /> {t('orgPersonnel.topologyTemplateMgmt.card.editInfo')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(template.id)} className='gap-2 text-rose-500 focus:text-rose-500'>
                <Trash2 className='size-3.5' /> {t('orgPersonnel.topologyTemplateMgmt.card.deleteTemplate')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && (
          <div className='animate-in fade-in slide-in-from-top-2 flex h-auto min-h-0 w-full flex-col items-start space-y-1 pt-1 pb-1 duration-300'>
            {(template.segments || []).map((segment) => (
              <div key={segment.id} className='group/segment flex h-auto min-h-0 w-full flex-col gap-4 rounded-[32px] border-2 border-dashed border-muted/30 bg-muted/10 p-3 transition-all hover:border-orange-400/30 hover:bg-muted/15'>
                <div className='flex w-full items-center gap-3 pl-2 text-lg font-black uppercase tracking-tighter text-slate-900'>
                  <Layout className='size-5 shrink-0 text-orange-600' />
                  <div className='flex min-w-0 flex-1 items-center gap-3'>
                    <span className='shrink-0 text-[10px] font-bold tracking-[0.2em] text-orange-600/30'>[{level1Name}]</span>
                    <Input
                      value={segment.name}
                      onChange={(event) => handleUpdateSegment(segment.id, event.target.value)}
                      className='h-9 min-w-0 flex-1 border-transparent bg-transparent px-2 text-lg font-black tracking-tighter transition-all hover:border-slate-200 focus:border-orange-400'
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='flex size-8 shrink-0 items-center justify-center text-rose-300 opacity-0 transition-opacity hover:text-rose-500 group-hover/segment:opacity-100'
                        >
                          <X className='size-5' />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className='rounded-[32px] border-none bg-white/95 shadow-2xl backdrop-blur-xl'>
                        <AlertDialogHeader>
                          <AlertDialogTitle className='text-lg font-black tracking-tighter text-slate-900'>
                            {t('orgPersonnel.topologyTemplateMgmt.card.deleteStandardLevelTitle', { levelName: level1Name })}
                          </AlertDialogTitle>
                          <AlertDialogDescription className='px-1 text-[11px] font-medium uppercase tracking-wider leading-relaxed text-slate-500'>
                            {t('orgPersonnel.topologyTemplateMgmt.card.deleteStandardLevelDesc', { levelName: level1Name, name: segment.name })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className='gap-2'>
                          <AlertDialogCancel className='h-10 rounded-full border-none bg-slate-100 text-[10px] font-bold uppercase tracking-widest'>
                            {t('orgPersonnel.lineMgmt.dialog.cancel')}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveSegment(segment.id)}
                            className='h-10 rounded-full bg-rose-500 text-[10px] font-bold uppercase tracking-widest'
                          >
                            {t('orgPersonnel.lineMgmt.topology.authVerify')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className='flex h-auto min-h-0 w-full flex-col gap-4 pl-4 sm:pl-8'>
                  {(segment.jobCategories || []).map((jobCategory) => (
                    <div key={jobCategory.id} className='group/job-category relative flex w-full flex-col gap-3 rounded-[24px] border border-muted/30 bg-background/80 p-3 shadow-sm backdrop-blur-sm transition-all hover:border-orange-400/20 hover:shadow-md'>
                      <div className='flex items-center gap-2 text-sm font-black uppercase tracking-tighter text-slate-800'>
                        <span className='shrink-0 pl-1 text-[9px] font-bold tracking-widest text-orange-600/40'>[{level2Name}]</span>
                        <Input
                          value={jobCategory.name}
                          onChange={(event) => handleUpdateJobCategory(segment.id, jobCategory.id, event.target.value)}
                          className='h-7 min-w-0 flex-1 border-transparent bg-transparent px-1.5 text-xs font-black tracking-tight transition-all hover:border-slate-200 focus:border-orange-400'
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type='button'
                              className='flex size-7 shrink-0 items-center justify-center text-rose-300 opacity-0 transition-opacity hover:text-rose-500 group-hover/job-category:opacity-100'
                            >
                              <X className='size-4' />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className='rounded-[32px] border-none bg-white/95 shadow-2xl backdrop-blur-xl'>
                            <AlertDialogHeader>
                              <AlertDialogTitle className='text-lg font-black tracking-tighter text-slate-900'>
                                {t('orgPersonnel.topologyTemplateMgmt.card.deleteStandardLevelTitle', { levelName: level2Name })}
                              </AlertDialogTitle>
                              <AlertDialogDescription className='px-1 text-[11px] font-medium uppercase tracking-wider leading-relaxed text-slate-500'>
                                {t('orgPersonnel.topologyTemplateMgmt.card.deleteStandardLevelDesc', { levelName: level2Name, name: jobCategory.name })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className='gap-2'>
                              <AlertDialogCancel className='h-10 rounded-full border-none bg-slate-100 text-[10px] font-bold uppercase tracking-widest'>
                                {t('orgPersonnel.lineMgmt.dialog.cancel')}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveJobCategory(segment.id, jobCategory.id)}
                                className='h-10 rounded-full bg-rose-500 text-[10px] font-bold uppercase tracking-widest'
                              >
                                {t('orgPersonnel.lineMgmt.topology.authVerify')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      <div className='flex flex-col gap-3 pl-2'>
                        {(jobCategory.processes || []).length === 0 ? (
                          <p className='text-[10px] italic text-muted-foreground/45'>
                            {t('orgPersonnel.lineMgmt.editor.noLevelsConfigured', { levelName: level3Name })}
                          </p>
                        ) : (
                          (jobCategory.processes || []).map((process) => (
                            <div key={process.id} className='flex w-full items-center gap-2 rounded-[20px] border border-muted/25 bg-muted/10 px-3 py-2 text-[11px] font-bold text-slate-600'>
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

                  <HierarchyOptionDropdownButton
                    options={level2Options}
                    onSelect={(option) => handleAddJobCategory(segment.id, option)}
                    variant='ghost'
                    size='sm'
                    className='h-9 gap-2 rounded-[24px] border border-dashed border-orange-200 bg-white/30 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600/50 shadow-sm transition-all hover:bg-white hover:text-orange-600 active:scale-95'
                  >
                    <Plus className='size-3.5' /> {t('orgPersonnel.topologyTemplateMgmt.card.addStandardLevel', { levelName: level2Name })}
                  </HierarchyOptionDropdownButton>
                </div>
              </div>
            ))}

            <HierarchyOptionDropdownButton
              options={level1Options}
              onSelect={handleAddSegment}
              variant='outline'
              size='sm'
              className='mt-2 h-11 w-full rounded-[28px] border-dashed border-slate-300 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 shadow-sm transition-all hover:border-orange-400 hover:bg-orange-50/50 hover:text-orange-600 active:scale-95'
            >
              <Plus className='mr-2 size-4' /> {t('orgPersonnel.topologyTemplateMgmt.card.addStandardLevel', { levelName: level1Name })}
            </HierarchyOptionDropdownButton>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
