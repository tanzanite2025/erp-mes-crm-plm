import { useState } from 'react'
import { Plus, Search, Factory } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LineCard } from './line-card'
import { LineDialog } from './line-dialog'
import type { ProductionLine } from '../types'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { buildFlattenDelta } from '@/lib/delta/flatten-delta'
import { type DeltaSet } from '@/lib/delta/types'
import { useHierarchyLevelLabels } from '../../hierarchy-config/hooks/use-hierarchy-level-labels'

interface LineListProps {
  lines: ProductionLine[]
  onUpdate: (payload: { type: 'CREATE'; data: ProductionLine } | { type: 'UPDATE'; id: string; delta: DeltaSet; version: number }, authCode?: string) => void
  onDelete: (id: string) => void
}

export function LineList({ lines, onUpdate, onDelete }: LineListProps) {
  const { t } = useLanguage()
  const { level1Name, level2Name } = useHierarchyLevelLabels()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null)
  const [pendingEditAuthCode, setPendingEditAuthCode] = useState<string | undefined>(undefined)

  const handleAdd = () => {
    setEditingLine(null)
    setPendingEditAuthCode(undefined)
    setIsDialogOpen(true)
  }

  const handleEdit = (line: ProductionLine, authCode?: string) => {
    setEditingLine(line)
    setPendingEditAuthCode(authCode)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('orgPersonnel.lineMgmt.list.deleteConfirm'))) {
      onDelete(id)
      toast.info(t('orgPersonnel.lineMgmt.list.requestSent'))
    }
  }

  const handleToggleActive = (id: string) => {
    const line = lines.find((l) => l.id === id)
    if (line) {
        const delta = buildFlattenDelta(line.isActive, !line.isActive, { basePath: 'isActive' })
        onUpdate({ 
          type: 'UPDATE', 
          id, 
          delta, 
          version: line.version 
        })
    }
  }

  const handleUpdateLine = (payload: { type: 'CREATE'; data: ProductionLine } | { type: 'UPDATE'; id: string; delta: DeltaSet; version: number }, authCode?: string) => {
    onUpdate(payload, authCode)
  }

  const handleDialogConfirm = (payload: { type: 'CREATE'; data: ProductionLine } | { type: 'UPDATE'; id: string; delta: DeltaSet; version: number }) => {
    onUpdate(payload, pendingEditAuthCode)
    setPendingEditAuthCode(undefined)
    setIsDialogOpen(false)
  }

  const filteredLines = lines.filter(
    (l) =>
      l.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className='flex h-fit min-h-0 w-full flex-col gap-4 pb-8'>
      <div className='flex flex-col gap-3 rounded-[24px] border border-dashed border-muted/35 bg-muted/5 p-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:p-3 sm:px-4'>
        <div className='relative w-full sm:max-w-sm'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            placeholder={t('orgPersonnel.lineMgmt.list.searchPlaceholder')}
            className='h-10 rounded-full border border-cyan-500/10 bg-background/80 pl-10 text-sm font-medium shadow-none focus-visible:ring-2 focus-visible:ring-cyan-200'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          onClick={handleAdd}
          className='h-10 w-full rounded-full px-6 text-[10px] font-black uppercase tracking-[0.24em] shadow-none transition-all active:scale-95 sm:w-auto'
        >
          <Plus className='mr-2 size-4' /> {t('orgPersonnel.lineMgmt.list.addButton')}
        </Button>
      </div>

      {filteredLines.length === 0 ? (
        <Card className='rounded-[28px] border border-dashed border-cyan-500/15 bg-background/90 shadow-none'>
          <CardContent className='flex flex-col items-center justify-center space-y-4 py-24 text-center'>
            <div className='flex size-14 items-center justify-center rounded-full border border-cyan-500/15 bg-cyan-500/5'>
              <Factory className='size-7 text-cyan-600/35' />
            </div>
            <div className='space-y-2'>
              <p className='text-base font-black uppercase tracking-[0.22em] text-foreground/80'>
                {t('orgPersonnel.lineMgmt.list.emptyTitle')}
              </p>
              <p className='max-w-[320px] text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/45'>
                {t('orgPersonnel.lineMgmt.list.emptyDescDynamic', { level1Name, level2Name })}
              </p>
            </div>
            <Button
              variant='outline'
              onClick={handleAdd}
              className='h-11 rounded-full border-dashed border-cyan-500/15 bg-cyan-500/5 px-6 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700 hover:bg-cyan-500/10 hover:text-cyan-800'
            >
              <Plus className='mr-2 size-4' /> {t('orgPersonnel.lineMgmt.list.initButton')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='flex w-full flex-col gap-4'>
          {filteredLines.map((line) => (
            <LineCard
              key={line.id}
              line={line}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onUpdate={handleUpdateLine}
            />
          ))}
        </div>
      )}

      <LineDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingLine={editingLine}
        lines={lines}
        onConfirm={handleDialogConfirm}
      />
    </div>
  )
}
