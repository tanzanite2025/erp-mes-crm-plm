import { useState } from 'react'
import { MoreVertical, Edit2, Trash2, ChevronDown, ChevronRight, Layout, Plus, X, Copy } from 'lucide-react'
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
    AlertDialogTrigger 
} from "@/components/ui/alert-dialog"
import type { ProcessStep, TopologyTemplate } from '../../line-mgmt/types'
import { useLanguage } from '@/context/language-provider'

interface TemplateCardProps {
  template: TopologyTemplate
  onEdit: (template: TopologyTemplate) => void
  onDelete: (id: string) => void
  onUpdate: (updatedTemplate: TopologyTemplate) => void
}

export function TemplateCard({ template, onEdit, onDelete, onUpdate }: TemplateCardProps) {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)

  // --- 增删改逻辑 (复用 LineCard 的交互模式) ---
  const handleAddSegment = () => {
    const newSegment = {
      id: crypto.randomUUID(),
      name: t('orgPersonnel.topologyTemplateMgmt.card.defaultSegment', { index: template.segments?.length + 1 || 1 }),
      processes: []
    }
    onUpdate({ ...template, segments: [...(template.segments || []), newSegment] })
  }

  const handleAddProcess = (segmentId: string) => {
    const updatedSegments = template.segments?.map(s => {
      if (s.id === segmentId) {
        return {
          ...s,
          processes: [
            ...s.processes,
            { id: crypto.randomUUID(), name: t('orgPersonnel.topologyTemplateMgmt.card.defaultProcess', { index: s.processes.length + 1 }) } as ProcessStep
          ]
        }
      }
      return s
    })
    onUpdate({ ...template, segments: updatedSegments })
  }


  const handleRemoveProcess = (segmentId: string, processId: string) => {
    const updatedSegments = template.segments?.map(s => {
        if (s.id === segmentId) {
            return { ...s, processes: s.processes.filter(process => process.id !== processId) }
        }
        return s
    })
    onUpdate({ ...template, segments: updatedSegments })
  }

  const handleRemoveSegment = (segmentId: string) => {
    onUpdate({ ...template, segments: template.segments?.filter(s => s.id !== segmentId) })
  }

  const handleUpdateSegment = (segmentId: string, name: string) => {
    const updatedSegments = template.segments?.map(s => s.id === segmentId ? { ...s, name } : s)
    onUpdate({ ...template, segments: updatedSegments })
  }

  const handleUpdateProcess = (segmentId: string, processId: string, name: string) => {
    const updatedSegments = template.segments?.map(s => {
      if (s.id === segmentId) {
        return {
          ...s,
          processes: s.processes.map(process => process.id === processId ? { ...process, name } : process)
        }
      }
      return s
    })
    onUpdate({ ...template, segments: updatedSegments })
  }

  return (
    <Card className='group/card transition-all hover:shadow-md border-l-4 border-l-orange-500 rounded-[32px] h-fit min-h-0 overflow-hidden shadow-sm'>
      <CardContent className='p-3 space-y-3 h-fit min-h-0'>
        <div className='flex items-start justify-between'>
          <div className='flex items-start gap-3 flex-1'>
            <Button 
                variant='ghost' 
                size='icon' 
                className='size-8 mt-1 text-muted-foreground'
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? <ChevronDown className='size-5' /> : <ChevronRight className='size-5' />}
            </Button>
            <div className='space-y-1'>
              <div className='flex items-center gap-2'>
                <h4 className='font-bold text-base'>{template.name}</h4>
                <div className='flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded font-medium border border-orange-100'>
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
            <div className='pt-1 pb-1 space-y-1 animate-in fade-in slide-in-from-top-2 duration-300 flex flex-col items-start w-full h-auto min-h-0'>
                {template.segments?.map((segment) => (
                    <div key={segment.id} className='group/segment flex flex-col gap-4 bg-muted/10 rounded-[32px] border-2 border-dashed border-muted/30 p-3 transition-all hover:bg-muted/15 hover:border-orange-400/30 w-full h-auto min-h-0'>
                        {/* L1: 标准工段 */}
                        <div className='flex items-center gap-3 text-lg font-black italic tracking-tighter uppercase text-slate-900 pl-2 w-full'>
                            <Layout className='size-5 text-orange-600 shrink-0' />
                            <div className='flex items-center gap-3 flex-1 min-w-0'>
                                <span className='shrink-0 text-orange-600/30 font-bold text-[10px] tracking-[0.2em]'>[{t('orgPersonnel.topologyTemplateMgmt.card.segment')}]</span>
                                <Input 
                                    value={segment.name}
                                    onChange={(e) => handleUpdateSegment(segment.id, e.target.value)}
                                    className='h-9 text-lg border-transparent hover:border-slate-200 focus:border-orange-400 bg-transparent transition-all px-2 flex-1 min-w-0 font-black italic tracking-tighter'
                                />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button 
                                            variant='ghost' 
                                            size='icon' 
                                            className='size-8 text-rose-300 opacity-0 group-hover/segment:opacity-100 transition-opacity hover:text-rose-500 flex items-center justify-center shrink-0'
                                        >
                                            <X className='size-5' />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className='rounded-[32px] border-none shadow-2xl bg-white/95 backdrop-blur-xl'>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className='text-lg font-black italic tracking-tighter text-slate-900'>{t('orgPersonnel.topologyTemplateMgmt.card.deleteSegmentTitle')}</AlertDialogTitle>
                                            <AlertDialogDescription className='text-[11px] font-medium text-slate-500 leading-relaxed uppercase tracking-wider px-1'>
                                                {t('orgPersonnel.topologyTemplateMgmt.card.deleteSegmentDesc', { name: segment.name })}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className='gap-2'>
                                            <AlertDialogCancel className='rounded-full h-10 font-bold text-[10px] uppercase tracking-widest border-none bg-slate-100'>{t('orgPersonnel.lineMgmt.dialog.cancel')}</AlertDialogCancel>
                                            <AlertDialogAction 
                                                onClick={() => handleRemoveSegment(segment.id)}
                                                className='rounded-full h-10 font-bold text-[10px] uppercase tracking-widest bg-rose-500'
                                            >
                                                {t('orgPersonnel.lineMgmt.topology.authVerify')}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>

                        {/* L2: 标准工序列表 */}
                        <div className='pl-4 sm:pl-8 flex flex-col gap-4 w-full h-auto min-h-0'>
                            {(segment.processes || []).map((process) => (
                                <div key={process.id} className='group/job relative w-full flex flex-col items-start h-auto min-h-0 bg-background/80 backdrop-blur-sm rounded-[24px] border border-muted/30 shadow-sm transition-all hover:shadow-md hover:border-orange-400/20'>
                                    <div className='w-full flex flex-col justify-start h-auto min-h-0 p-2'>
                                        <div className='flex flex-col items-start justify-start w-full' style={{ height: 'fit-content', padding: '0', gap: '0' }}>
                                            <div className='flex items-center gap-2 text-sm font-black italic tracking-tighter uppercase text-slate-800 w-full mb-1' style={{ height: '28px' }}>
                                                <span className='shrink-0 text-orange-600/40 font-bold text-[9px] tracking-widest pl-1'>[{t('orgPersonnel.topologyTemplateMgmt.card.process')}]</span>
                                                <Input 
                                                    value={process.name}
                                                    onChange={(e) => handleUpdateProcess(segment.id, process.id, e.target.value)}
                                                    className='h-7 text-xs border-transparent hover:border-slate-200 focus:border-orange-400 bg-transparent transition-all px-1.5 flex-1 min-w-0 font-black italic tracking-tight'
                                                />
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <button 
                                                            type='button'
                                                            className='size-7 text-rose-300 opacity-0 group-hover/job:opacity-100 transition-opacity hover:text-rose-500 flex items-center justify-center shrink-0'
                                                        >
                                                            <X className='size-4' />
                                                        </button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className='rounded-[32px] border-none shadow-2xl bg-white/95 backdrop-blur-xl'>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className='text-lg font-black italic tracking-tighter text-slate-900'>{t('orgPersonnel.topologyTemplateMgmt.card.deleteProcessTitle')}</AlertDialogTitle>
                                                            <AlertDialogDescription className='text-[11px] font-medium text-slate-500 leading-relaxed uppercase tracking-wider px-1'>
                                                                {t('orgPersonnel.topologyTemplateMgmt.card.deleteProcessDesc', { name: process.name })}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className='gap-2'>
                                                            <AlertDialogCancel className='rounded-full h-10 font-bold text-[10px] uppercase tracking-widest border-none bg-slate-100'>{t('orgPersonnel.lineMgmt.dialog.cancel')}</AlertDialogCancel>
                                                            <AlertDialogAction 
                                                                onClick={() => handleRemoveProcess(segment.id, process.id)}
                                                                className='rounded-full h-10 font-bold text-[10px] uppercase tracking-widest bg-rose-500'
                                                            >
                                                                {t('orgPersonnel.lineMgmt.topology.authVerify')}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Button 
                                variant='ghost' 
                                size='sm' 
                                className='h-9 text-[10px] gap-2 text-orange-600/50 hover:text-orange-600 hover:bg-white rounded-[24px] border border-dashed border-orange-200 active:scale-95 transition-all font-black uppercase tracking-[0.2em] bg-white/30 shadow-sm'
                                onClick={() => handleAddProcess(segment.id)}
                            >
                                <Plus className='size-3.5' /> {t('orgPersonnel.topologyTemplateMgmt.card.addProcess')}
                            </Button>
                        </div>
                    </div>
                ))}
                
                <Button 
                    variant='outline' 
                    size='sm' 
                    className='w-full h-11 text-[11px] font-black uppercase tracking-[0.2em] border-dashed border-slate-300 text-muted-foreground/60 rounded-[28px] hover:text-orange-600 hover:border-orange-400 hover:bg-orange-50/50 transition-all active:scale-95 shadow-sm mt-2'
                    onClick={handleAddSegment}
                >
                    <Plus className='size-4 mr-2' /> {t('orgPersonnel.topologyTemplateMgmt.card.addSegment')}
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  )
}
