import { useState } from 'react'
import { MoreVertical, Edit2, Trash2, Settings2, ChevronDown, ChevronRight, Plus, FileCode, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ProductionLine, TopologyTemplate } from '../types'
import { useTopologyTemplates } from '../hooks/use-topology-templates'
import { useLineTopology } from '../hooks/use-line-topology'
import { SegmentNode } from './topology/segment-node'
import { SecurityAuthDialog } from './topology/security-auth-dialog'
import { useLanguage } from '@/context/language-provider'

interface LineCardProps {
  line: ProductionLine
  onEdit: (line: ProductionLine, authCode?: string) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string) => void
  onUpdate: (updatedLine: ProductionLine, authCode?: string) => void
}

export function LineCard({ line, onEdit, onDelete, onToggleActive, onUpdate }: LineCardProps) {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'edit' | 'delete' | 'topology' | null>(null)
  const [pendingTopologyLine, setPendingTopologyLine] = useState<ProductionLine | null>(null)
  const { templates, addTemplate } = useTopologyTemplates()
  const handleTopologyUpdate = (updatedLine: ProductionLine) => {
    const requiresAuth = Boolean(updatedLine.id && !updatedLine.id.startsWith('temp-'))

    if (!requiresAuth) {
      onUpdate(updatedLine)
      return
    }

    setPendingTopologyLine(updatedLine)
    setPendingAction('topology')
    setIsAuthOpen(true)
  }
  const {
    handleApplyTemplate,
    handleAddSegment,
    handleAddProcess,
    handleUpdateSegment,
    handleUpdateProcess,
    handleRemoveSegment,
    handleRemoveProcess
  } = useLineTopology(line, handleTopologyUpdate)

  const handleAuthConfirm = (password: string) => {
    if (pendingAction === 'edit') {
        onEdit(line, password)
    } else if (pendingAction === 'delete') {
        onDelete(line.id)
    } else if (pendingAction === 'topology' && pendingTopologyLine) {
        onUpdate(pendingTopologyLine, password)
    }
    setPendingTopologyLine(null)
    setPendingAction(null)
  }

  const handleSaveAsTemplate = () => {
    const newTemplate: TopologyTemplate = {
      id: crypto.randomUUID(),
      name: `${line.name} ${t('orgPersonnel.lineMgmt.card.templateBackup')}`,
      description: t('orgPersonnel.lineMgmt.card.saveTemplateFrom', { name: line.name }),
      segments: JSON.parse(JSON.stringify(line.segments)),
      createdAt: new Date().toISOString()
    }
    addTemplate(newTemplate)
    alert(t('orgPersonnel.lineMgmt.card.templateSuccess'))
  }

  return (
    <Card
      className={`group/card transition-all hover:shadow-md rounded-[24px] border-dashed bg-muted/5 border-muted/50 h-fit min-h-0 w-full ${!line.isActive ? 'opacity-50 grayscale' : 'border-l-4 border-l-primary shadow-sm'
        }`}
    >
      <CardContent className='p-2.5 space-y-2 h-fit min-h-0'>
        <div className='flex items-start justify-between'>
          <div className='flex items-start gap-1 sm:gap-3 flex-1 min-w-0'>
            <Button
              variant='ghost'
              size='icon'
              className='size-7 sm:size-8 mt-1 text-muted-foreground shrink-0'
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronDown className='size-4 sm:size-5' /> : <ChevronRight className='size-4 sm:size-5' />}
            </Button>
            <div className='space-y-1 min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <h4 className='truncate text-sm font-black italic uppercase tracking-tighter text-slate-800 dark:text-slate-100 sm:text-base'>{line.name}</h4>
                <Badge variant='outline' className='text-[7px] sm:text-[8px] font-mono rounded-full border-muted/50 bg-background/50'>
                  {line.code}
                </Badge>
              </div>
              <div className='flex items-center gap-2 text-[8px] sm:text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest italic'>
                <Settings2 className='size-3 shrink-0' />
                <span className='truncate'>{t('orgPersonnel.lineMgmt.card.topologyMgmt')}</span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='size-8 shrink-0'>
                <MoreVertical className='size-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='rounded-[24px] border border-border/50 bg-background/95 p-1 shadow-2xl backdrop-blur-md dark:bg-popover/95'>
              <DropdownMenuItem 
                onClick={() => { setPendingAction('edit'); setIsAuthOpen(true); }} 
                className='gap-2 text-[11px] font-bold uppercase tracking-widest rounded-xl px-4 py-3 cursor-pointer'
              >
                <Edit2 className='size-3.5 text-blue-500' /> {t('orgPersonnel.lineMgmt.card.editInfo')}
              </DropdownMenuItem>
              {line.segments?.length > 0 && (
                <DropdownMenuItem onClick={handleSaveAsTemplate} className='gap-2 text-orange-600 focus:text-orange-600 text-[11px] font-bold uppercase tracking-widest rounded-xl px-4 py-3 cursor-pointer'>
                  <FileCode className='size-3.5' /> {t('orgPersonnel.lineMgmt.card.saveTemplate')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onToggleActive(line.id)} className='gap-2 text-[11px] font-bold uppercase tracking-widest rounded-xl px-4 py-3 cursor-pointer'>
                <div className={`size-2 rounded-full ${line.isActive ? 'bg-slate-400' : 'bg-green-500'}`} />
                {line.isActive ? t('orgPersonnel.lineMgmt.card.stop') : t('orgPersonnel.lineMgmt.card.enable')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => { setPendingAction('delete'); setIsAuthOpen(true); }} 
                className='gap-2 text-rose-500 focus:text-rose-500 text-[11px] font-bold uppercase tracking-widest rounded-xl px-4 py-3 cursor-pointer'
              >
                <Trash2 className='size-3.5' /> {t('orgPersonnel.lineMgmt.card.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <SecurityAuthDialog 
            open={isAuthOpen}
            onOpenChange={setIsAuthOpen}
            onConfirm={handleAuthConfirm}
            title={pendingAction === 'edit' ? t('orgPersonnel.lineMgmt.auth.editTitle') : t('orgPersonnel.lineMgmt.auth.deleteTitle')}
            description={pendingAction === 'edit' ? t('orgPersonnel.lineMgmt.auth.editDesc') : t('orgPersonnel.lineMgmt.auth.deleteDesc')}
        />

        <div className='grid grid-cols-2 gap-4 py-3 border-y border-dashed border-muted/50'>
          <div className='space-y-1'>
            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic'>
              {t('orgPersonnel.lineMgmt.card.hierarchy')}
            </p>
            <div className='flex items-center gap-1.5'>
              <span className='text-[11px] font-black font-mono text-slate-600 dark:text-slate-300'>
                {t('orgPersonnel.lineMgmt.card.hierarchyStats', { 
                  segments: line.segments?.length || 0, 
                  jobs: line.segments?.flatMap(s => s.processes || []).length || 0 
                })}
              </span>
            </div>
          </div>
          <div className='space-y-1'>
            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic'>
              {t('orgPersonnel.lineMgmt.card.status')}
            </p>
            <div className='flex items-center gap-1.5'>
              <div
                className={`size-2 rounded-full ${line.isActive ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-300'
                  }`}
              />
              <span className='text-[11px] font-black uppercase tracking-tighter text-slate-600 dark:text-slate-300'>
                {line.isActive ? t('orgPersonnel.lineMgmt.card.running') : t('orgPersonnel.lineMgmt.card.offline')}
              </span>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className='pt-1 pb-1 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300 flex flex-col items-start w-full h-auto min-h-0'>
            {line.segments?.length > 0 ? (
              <div className='space-y-1 w-full flex flex-col items-start h-auto min-h-0'>
                {(line.segments || []).map((segment) => (
                    <SegmentNode
                      key={segment.id}
                      segment={segment}
                      onUpdateName={handleUpdateSegment}
                      onRemove={handleRemoveSegment}
                      onAddProcess={handleAddProcess}
                      onUpdateProcessName={handleUpdateProcess}
                      onRemoveProcess={handleRemoveProcess}
                    />
                ))}

                <Button
                  variant='outline'
                  size='sm'
                  className='h-10 w-full rounded-[20px] border-dashed border-slate-300 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 transition-all hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600 active:scale-95 dark:border-white/10 dark:hover:bg-blue-500/10'
                  onClick={() => handleAddSegment()}
                >
                  <Plus className='size-4 mr-2' /> {t('orgPersonnel.lineMgmt.card.defineSegment')}
                </Button>
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed bg-slate-50/50 p-8 text-center dark:border-white/10 dark:bg-white/[0.03]'>
                <div className='rounded-full border border-slate-100 bg-background p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.05]'>
                  <FileCode className='size-6 text-orange-500' />
                </div>
                <div className='space-y-1'>
                  <p className='text-sm font-bold'>{t('orgPersonnel.lineMgmt.card.initTopology')}</p>
                  <p className='text-xs text-muted-foreground'>{t('orgPersonnel.lineMgmt.card.emptyTopologyDesc')}</p>
                </div>
                {templates.length > 0 ? (
                  <div className='flex flex-wrap gap-2 justify-center max-w-sm'>
                    {templates.map(t => (
                      <Button
                        key={t.id}
                        variant='outline'
                        size='sm'
                        className='h-7 text-[10px] gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50 transition-colors'
                        onClick={() => handleApplyTemplate(t)}
                      >
                        <Check className='size-3' /> {t.name}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 text-xs gap-1.5'
                    onClick={() => handleAddSegment()}
                  >
                    <Plus className='size-3.5' /> {t('orgPersonnel.lineMgmt.card.manualBuild')}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}



        {line.description && (
          <p className='text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest italic line-clamp-2 mt-2'>
            "{line.description}"
          </p>
        )}
      </CardContent>
    </Card>
  )
}
