import { useMemo, useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, LayoutGrid, GitCommit } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import { useProductionLinesQuery } from '@/features/production-shared/hooks/use-production-resources'
import { useHierarchyLevelLabels } from '@/features/production-shared/tabs/hierarchy-config/hooks/use-hierarchy-level-labels'

interface ProductionSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: { type: 'line' | 'segment', id: string, name: string }[]
  onSave: (items: { type: 'line' | 'segment', id: string, name: string }[]) => void
}

export function ProductionSelector({ open, onOpenChange, selectedItems, onSave }: ProductionSelectorProps) {
  const { t } = useLanguage()
  const { level1Name } = useHierarchyLevelLabels()
  const [searchTerm, setSearchTerm] = useState('')
  const [localSelected, setLocalSelected] = useState<string[]>(selectedItems.map(i => i.id))
  const { data: lines } = useProductionLinesQuery({ enabled: open })
  const availableLines = useMemo(() => lines ?? [], [lines])

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setLocalSelected(selectedItems.map(i => i.id))
    }

    onOpenChange(nextOpen)
  }

  const toggleSelection = (id: string) => {
    setLocalSelected(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSave = () => {
    const newSelection: { type: 'line' | 'segment', id: string, name: string }[] = []
    
    availableLines.forEach(line => {
      if (localSelected.includes(line.id)) {
        newSelection.push({ type: 'line', id: line.id, name: line.name })
      }
      line.segments?.forEach(seg => {
        if (localSelected.includes(seg.id)) {
          newSelection.push({ type: 'segment', id: seg.id, name: seg.name })
        }
      })
    })

    onSave(newSelection)
    handleDialogOpenChange(false)
  }

  const filteredLines = availableLines.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.segments?.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className='max-w-md rounded-[32px] border-none shadow-2xl overflow-hidden p-0'>
        <DialogHeader className='p-8 bg-muted/10 border-b border-dashed border-muted/50'>
          <DialogTitle className='text-lg font-black tracking-tighter italic uppercase'>{t('orgPersonnel.org.productionSelector.title')}</DialogTitle>
          <DialogDescription className='text-[10px] font-black uppercase tracking-widest opacity-60'>
            {t('orgPersonnel.org.productionSelector.descDynamic', { levelName: level1Name })}
          </DialogDescription>
        </DialogHeader>

        <div className='relative mx-8 my-4'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
          <Input 
            placeholder={t('orgPersonnel.org.productionSelector.searchPlaceholder')} 
            className='pl-9 h-11 rounded-2xl bg-muted/50 border-none font-bold text-xs' 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <ScrollArea className='h-[400px] pr-4'>
          <div className='space-y-4 py-2'>
            {filteredLines.map(line => (
              <div key={line.id} className='space-y-2'>
                <div className='flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 transition-colors'>
                  <Checkbox 
                    id={line.id} 
                    checked={localSelected.includes(line.id)}
                    onCheckedChange={() => toggleSelection(line.id)}
                  />
                  <label htmlFor={line.id} className='flex items-center gap-2 text-sm font-semibold cursor-pointer flex-1'>
                    <LayoutGrid className='size-4 text-blue-600' />
                    {line.name}
                  </label>
                </div>
                
                <div className='ml-6 space-y-1 border-l pl-4'>
                  {line.segments?.map(seg => (
                    <div key={seg.id} className='flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 transition-colors'>
                      <Checkbox 
                        id={seg.id} 
                        checked={localSelected.includes(seg.id)}
                        onCheckedChange={() => toggleSelection(seg.id)}
                      />
                      <label htmlFor={seg.id} className='flex items-center gap-2 text-sm cursor-pointer flex-1'>
                        <GitCommit className='size-3.5 text-slate-400' />
                        {seg.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className='p-6 bg-muted/5 border-t border-dashed border-muted/50'>
          <Button variant='outline' onClick={() => handleDialogOpenChange(false)} className='rounded-full h-11 px-6 font-black text-[10px] uppercase tracking-widest border-dashed'>{t('common.actions.cancel')}</Button>
          <Button onClick={handleSave} className='rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20'>{t('orgPersonnel.org.productionSelector.submit')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
