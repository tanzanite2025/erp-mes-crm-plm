import { useState } from 'react'
import { ArrowLeft, Plus, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProductionLine, Segment } from '../../types'
import { toast } from 'sonner'
import { SegmentNode } from './segment-node.tsx'
import { useLanguage } from '@/context/language-provider'

interface TopologyEditorProps {
  line: ProductionLine
  onBack: () => void
  onSave: (updatedLine: ProductionLine) => void
}

export function TopologyEditor({ line, onBack, onSave }: TopologyEditorProps) {
  const { t } = useLanguage()
  const [segments, setSegments] = useState<Segment[]>(line.segments || [])

  const handleAddSegment = () => {
    const newSegment: Segment = {
      id: crypto.randomUUID(),
      name: `${t('orgPersonnel.lineMgmt.editor.newSegmentName')} ${segments.length + 1}`,
      processes: [],
    }
    setSegments([...segments, newSegment])
  }

  const handleUpdateSegment = (updatedSegment: Segment) => {
    setSegments(segments.map(s => s.id === updatedSegment.id ? updatedSegment : s))
  }

  const handleRemoveSegment = (id: string) => {
    setSegments(segments.filter(s => s.id !== id))
  }

  const handleSave = () => {
    onSave({ ...line, segments })
    toast.success(t('orgPersonnel.lineMgmt.editor.saveSuccess'))
  }

  return (
    <div className='flex h-full flex-col bg-slate-50/50 dark:bg-white/[0.03]'>
      <div className='flex flex-col items-start justify-between gap-4 border-b bg-background px-4 py-4 dark:border-white/10 dark:bg-white/[0.03] sm:flex-row sm:items-center sm:px-6'>
        <div className='flex items-center gap-3 sm:gap-4'>
          <Button variant='ghost' size='icon' onClick={onBack} className='size-8 sm:size-10'>
            <ArrowLeft className='size-4' />
          </Button>
          <div className='min-w-0'>
            <h2 className='text-base sm:text-lg font-bold truncate'>{t('orgPersonnel.lineMgmt.editor.title')}</h2>
            <p className='text-[10px] sm:text-xs text-muted-foreground truncate'>
              {t('orgPersonnel.lineMgmt.editor.configuring')}: <span className='font-mono font-bold text-blue-600'>{line.name}</span>
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0'>
          <Button variant='outline' onClick={onBack} className='flex-1 sm:flex-none h-10 sm:h-9 text-xs'>{t('orgPersonnel.lineMgmt.dialog.cancel')}</Button>
          <Button onClick={handleSave} className='flex-[2] sm:flex-none h-10 sm:h-9 text-xs gap-2'>
            <Save className='size-4' /> {t('orgPersonnel.lineMgmt.editor.saveConfig')}
          </Button>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-4 sm:p-6 space-y-6'>
        <div className='flex items-center justify-between'>
          <h3 className='text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400'>
            {t('orgPersonnel.lineMgmt.editor.segmentsTitle')}
          </h3>
          <Button size='sm' variant='outline' onClick={handleAddSegment} className='h-8 gap-1.5'>
            <Plus className='size-3.5' /> {t('orgPersonnel.lineMgmt.editor.addSegment')}
          </Button>
        </div>

        {segments.length === 0 ? (
          <div className='flex flex-col items-center justify-center space-y-4 rounded-xl border-2 border-dashed bg-background/70 py-20 dark:border-white/10 dark:bg-white/[0.04]'>
            <div className='rounded-full bg-slate-100 p-4 dark:bg-white/[0.06]'>
              <Plus className='size-8 text-slate-400' />
            </div>
            <div className='text-center'>
              <p className='font-medium text-slate-600'>{t('orgPersonnel.lineMgmt.editor.emptyTitle')}</p>
              <p className='text-xs text-slate-400 mt-1'>{t('orgPersonnel.lineMgmt.editor.emptyDesc')}</p>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            {segments.map((segment, index) => (
              <SegmentNode 
                key={segment.id} 
                segment={segment} 
                index={index}
                onUpdate={handleUpdateSegment}
                onRemove={() => handleRemoveSegment(segment.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
