import { useState } from 'react'
import {
  MoreVertical,
  Edit2,
  Trash2,
  Settings2,
  ChevronDown,
  ChevronRight,
  Plus,
  FileCode,
  Check,
} from 'lucide-react'
import { trackDelta } from '@/lib/delta/proxy-tracker'
import { type DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { HierarchyOptionDropdownButton } from '../../hierarchy-config/components/hierarchy-option-dropdown-button'
import { useHierarchyLevelLabels } from '../../hierarchy-config/hooks/use-hierarchy-level-labels'
import { useHierarchyLevelOptions } from '../../hierarchy-config/hooks/use-hierarchy-level-options'
import { useLineTopology } from '../hooks/use-line-topology'
import { useTopologyTemplates } from '../hooks/use-topology-templates'
import type { ProductionLine, TopologyTemplate } from '../types'
import { SecurityAuthDialog } from './topology/security-auth-dialog'
import { SegmentNode } from './topology/segment-node'

interface LineCardProps {
  line: ProductionLine
  onEdit: (line: ProductionLine, authCode?: string) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string) => void
  onUpdate: (
    payload:
      | { type: 'CREATE'; data: ProductionLine }
      | { type: 'UPDATE'; id: string; delta: DeltaSet; version: number },
    authCode?: string
  ) => void
}

export function LineCard({
  line,
  onEdit,
  onDelete,
  onToggleActive,
  onUpdate,
}: LineCardProps) {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<
    'edit' | 'delete' | 'topology' | null
  >(null)
  const [pendingDelta, setPendingDelta] = useState<DeltaSet | null>(null)
  const { templates, addTemplate } = useTopologyTemplates()
  const { level1Name, level2Name, level3Name } = useHierarchyLevelLabels()
  const { level1Options, level2Options } = useHierarchyLevelOptions()
  const authDialogTitle =
    pendingAction === 'edit'
      ? t('orgPersonnel.lineMgmt.auth.editTitle')
      : pendingAction === 'topology'
        ? t('orgPersonnel.lineMgmt.topology.authGenericTitle')
        : t('orgPersonnel.lineMgmt.auth.deleteTitle')
  const authDialogDescription =
    pendingAction === 'edit'
      ? t('orgPersonnel.lineMgmt.auth.editDesc')
      : pendingAction === 'topology'
        ? t('orgPersonnel.lineMgmt.topology.authGenericDesc')
        : t('orgPersonnel.lineMgmt.auth.deleteDesc')

  const handleTopologyUpdate = (updatedLine: ProductionLine) => {
    // 1. 自动生成 Delta 载荷
    const tracker = trackDelta(line)
    Object.assign(tracker.data, updatedLine)
    const delta = tracker.commit()

    if (Object.keys(delta).length === 0) return

    // 2. 检查权限需求
    const requiresAuth = Boolean(line.id && !line.id.startsWith('temp-'))

    if (!requiresAuth) {
      onUpdate({ type: 'UPDATE', id: line.id, delta, version: line.version })
      return
    }

    setPendingDelta(delta)
    setPendingAction('topology')
    setIsAuthOpen(true)
  }

  const {
    handleApplyTemplate,
    handleAddSegment,
    handleAddJobCategory,
    handleUpdateSegment,
    handleUpdateJobCategory,
    handleRemoveSegment,
    handleRemoveJobCategory,
  } = useLineTopology(line, handleTopologyUpdate)

  const segmentCount = line.segments?.length || 0
  const jobCategoryCount =
    line.segments?.reduce(
      (count, segment) => count + (segment.jobCategories?.length || 0),
      0
    ) || 0
  const processCount =
    line.segments?.reduce(
      (count, segment) =>
        count +
        (segment.jobCategories || []).reduce(
          (segmentCount, jobCategory) =>
            segmentCount + (jobCategory.processes?.length || 0),
          0
        ),
      0
    ) || 0

  const handleAuthConfirm = (password: string) => {
    if (pendingAction === 'edit') {
      onEdit(line, password)
    } else if (pendingAction === 'delete') {
      onDelete(line.id)
    } else if (pendingAction === 'topology' && pendingDelta) {
      onUpdate(
        {
          type: 'UPDATE',
          id: line.id,
          delta: pendingDelta,
          version: line.version,
        },
        password
      )
    }
    setPendingDelta(null)
    setPendingAction(null)
  }

  const handleSaveAsTemplate = () => {
    const newTemplate: TopologyTemplate = {
      id: crypto.randomUUID(),
      name: `${line.name} ${t('orgPersonnel.lineMgmt.card.templateBackup')}`,
      description: t('orgPersonnel.lineMgmt.card.saveTemplateFrom', {
        name: line.name,
      }),
      segments: structuredClone(line.segments),
      createdAt: new Date().toISOString(),
    }
    addTemplate(newTemplate)
    alert(t('orgPersonnel.lineMgmt.card.templateSuccess'))
  }

  return (
    <Card
      className={`group/card overflow-hidden rounded-[28px] border border-dashed bg-background/90 shadow-none backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-28px_rgba(6,182,212,0.55)] ${!line.isActive ? 'opacity-70 grayscale' : 'border-cyan-500/20'}`}
    >
      <CardContent className='space-y-3 p-3.5'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex min-w-0 flex-1 items-start gap-2.5'>
            <Button
              variant='ghost'
              size='icon'
              className='size-8 shrink-0 rounded-full border border-dashed border-muted/30 bg-muted/5 text-muted-foreground transition-all hover:border-cyan-500/20 hover:bg-cyan-500/5 hover:text-cyan-700'
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className='size-3.5' />
              ) : (
                <ChevronRight className='size-3.5' />
              )}
            </Button>
            <div className='min-w-0 flex-1 space-y-2'>
              <div className='flex flex-wrap items-center gap-2'>
                <h4 className='truncate text-[15px] font-black tracking-tight text-foreground'>
                  {line.name}
                </h4>
                <Badge
                  variant='outline'
                  className='rounded-full border-cyan-500/15 bg-cyan-500/5 px-2.5 py-0.5 text-[9px] font-black tracking-[0.24em] text-cyan-700/70 uppercase'
                >
                  {line.code}
                </Badge>
                <Badge
                  variant='outline'
                  className={`rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-[0.24em] uppercase ${line.isActive ? 'border-emerald-500/15 bg-emerald-500/5 text-emerald-700' : 'border-slate-500/15 bg-slate-500/5 text-slate-600'}`}
                >
                  {line.isActive
                    ? t('orgPersonnel.lineMgmt.card.running')
                    : t('orgPersonnel.lineMgmt.card.offline')}
                </Badge>
              </div>
              <div className='flex items-center gap-1.5 text-[10px] font-black tracking-[0.24em] text-muted-foreground/55 uppercase'>
                <Settings2 className='size-3 shrink-0 text-cyan-600/60' />
                <span className='truncate'>
                  {t('orgPersonnel.lineMgmt.card.topologyMgmt')}
                </span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='size-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              >
                <MoreVertical className='size-3.5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='end'
              className='rounded-[22px] border border-dashed border-muted/40 bg-background/95 p-1 shadow-2xl backdrop-blur-md'
            >
              <DropdownMenuItem
                onClick={() => {
                  setPendingAction('edit')
                  setIsAuthOpen(true)
                }}
                className='cursor-pointer gap-2 rounded-xl px-4 py-3 text-[11px] font-bold tracking-[0.2em] uppercase'
              >
                <Edit2 className='size-3.5 text-cyan-600' />{' '}
                {t('orgPersonnel.lineMgmt.card.editInfo')}
              </DropdownMenuItem>
              {line.segments?.length > 0 && (
                <DropdownMenuItem
                  onClick={handleSaveAsTemplate}
                  className='cursor-pointer gap-2 rounded-xl px-4 py-3 text-[11px] font-bold tracking-[0.2em] text-amber-600 uppercase focus:text-amber-600'
                >
                  <FileCode className='size-3.5' />{' '}
                  {t('orgPersonnel.lineMgmt.card.saveTemplate')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onToggleActive(line.id)}
                className='cursor-pointer gap-2 rounded-xl px-4 py-3 text-[11px] font-bold tracking-[0.2em] uppercase'
              >
                <div
                  className={`size-2 rounded-full ${line.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                />
                {line.isActive
                  ? t('orgPersonnel.lineMgmt.card.stop')
                  : t('orgPersonnel.lineMgmt.card.enable')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setPendingAction('delete')
                  setIsAuthOpen(true)
                }}
                className='cursor-pointer gap-2 rounded-xl px-4 py-3 text-[11px] font-bold tracking-[0.2em] text-rose-500 uppercase focus:text-rose-500'
              >
                <Trash2 className='size-3.5' />{' '}
                {t('orgPersonnel.lineMgmt.card.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <SecurityAuthDialog
          open={isAuthOpen}
          onOpenChange={setIsAuthOpen}
          onConfirm={handleAuthConfirm}
          title={authDialogTitle}
          description={authDialogDescription}
        />

        <div className='grid gap-2 rounded-2xl border border-dashed border-muted/30 bg-muted/20 p-2.5 px-3.5 md:grid-cols-2'>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-black tracking-[0.24em] text-muted-foreground/45 uppercase'>
              {t('orgPersonnel.lineMgmt.card.hierarchy')}
            </p>
            <p className='text-[12px] font-black tracking-tight text-foreground'>
              {t('orgPersonnel.lineMgmt.card.hierarchyStatsDynamic', {
                level1Count: segmentCount,
                level1Name,
                level2Count: jobCategoryCount,
                level2Name,
                level3Count: processCount,
                level3Name,
              })}
            </p>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-black tracking-[0.24em] text-muted-foreground/45 uppercase'>
              {t('orgPersonnel.lineMgmt.card.status')}
            </p>
            <div className='flex items-center gap-2'>
              <div
                className={`size-2.5 rounded-full ${line.isActive ? 'bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]' : 'bg-slate-400'}`}
              />
              <span className='text-[12px] font-black tracking-[0.18em] text-foreground/80 uppercase'>
                {line.isActive
                  ? t('orgPersonnel.lineMgmt.card.running')
                  : t('orgPersonnel.lineMgmt.card.offline')}
              </span>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className='animate-in space-y-3 duration-300 fade-in slide-in-from-top-2'>
            {line.segments?.length > 0 ? (
              <div className='space-y-3'>
                {(line.segments || []).map((segment) => (
                  <SegmentNode
                    key={segment.id}
                    segment={segment}
                    level1Name={level1Name}
                    level2Name={level2Name}
                    level3Name={level3Name}
                    level2Options={level2Options}
                    onUpdateName={handleUpdateSegment}
                    onRemove={handleRemoveSegment}
                    onAddJobCategory={handleAddJobCategory}
                    onUpdateJobCategoryName={handleUpdateJobCategory}
                    onRemoveJobCategory={handleRemoveJobCategory}
                  />
                ))}

                <HierarchyOptionDropdownButton
                  options={level1Options}
                  onSelect={handleAddSegment}
                  variant='outline'
                  size='sm'
                  className='h-9 w-full rounded-xl border-dashed border-cyan-500/20 bg-cyan-500/5 text-[10px] font-black tracking-[0.24em] text-cyan-700/70 uppercase transition-all hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-800'
                >
                  <Plus className='mr-2 size-3.5' />{' '}
                  {t('orgPersonnel.lineMgmt.card.defineHierarchyLevel', {
                    levelName: level1Name,
                  })}
                </HierarchyOptionDropdownButton>
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-cyan-500/15 bg-cyan-500/5 p-8 text-center'>
                <div className='rounded-full border border-cyan-500/15 bg-background p-3 shadow-sm'>
                  <FileCode className='size-6 text-cyan-600' />
                </div>
                <div className='space-y-1'>
                  <p className='text-sm font-black tracking-tight'>
                    {t('orgPersonnel.lineMgmt.card.initTopology')}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {t('orgPersonnel.lineMgmt.card.emptyTopologyDescDynamic', {
                      levelName: level1Name,
                    })}
                  </p>
                </div>
                {templates.length > 0 ? (
                  <div className='flex flex-wrap justify-center gap-2'>
                    {templates.map((t) => (
                      <Button
                        key={t.id}
                        variant='outline'
                        size='sm'
                        className='h-8 rounded-full border-cyan-500/15 bg-background/70 px-3 text-[10px] font-black tracking-[0.2em] text-cyan-700 uppercase hover:bg-cyan-500/5'
                        onClick={() => handleApplyTemplate(t)}
                      >
                        <Check className='mr-1.5 size-3.5' /> {t.name}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <HierarchyOptionDropdownButton
                    options={level1Options}
                    onSelect={handleAddSegment}
                    variant='ghost'
                    size='sm'
                    className='h-8 rounded-full text-xs font-black tracking-[0.2em] text-cyan-700 uppercase hover:bg-cyan-500/5'
                  >
                    <Plus className='mr-1.5 size-3.5' />{' '}
                    {t('orgPersonnel.lineMgmt.card.manualBuildHierarchyLevel', {
                      levelName: level1Name,
                    })}
                  </HierarchyOptionDropdownButton>
                )}
              </div>
            )}
          </div>
        )}

        {line.description && (
          <p className='line-clamp-2 text-[10px] leading-relaxed font-medium text-muted-foreground/60'>
            {line.description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
