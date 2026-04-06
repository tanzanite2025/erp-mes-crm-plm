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

interface LineListProps {
  lines: ProductionLine[]
  onUpdate: (line: ProductionLine, authCode?: string) => void
  onDelete: (id: string) => void
}

export function LineList({ lines, onUpdate, onDelete }: LineListProps) {
  const { t } = useLanguage()
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
        onUpdate({ ...line, isActive: !line.isActive })
    }
  }

  const handleUpdateLine = (updatedLine: ProductionLine, authCode?: string) => {
    onUpdate(updatedLine, authCode)
  }

  const handleDialogConfirm = (data: Partial<ProductionLine>) => {
    if (editingLine) {
      onUpdate({ ...editingLine, ...data }, pendingEditAuthCode)
      toast.success(t('orgPersonnel.lineMgmt.list.updateSuccess'))
    } else {
      const newLine: Partial<ProductionLine> = {
        code: data.code || '',
        name: data.name || '',
        description: data.description || '',
        isActive: true,
        segments: [], // 初始为空拓扑
      }
      onUpdate(newLine as ProductionLine)
      toast.success(t('orgPersonnel.lineMgmt.list.addSuccess'))
    }
    setPendingEditAuthCode(undefined)
    setIsDialogOpen(false)
  }

  const filteredLines = lines.filter(
    (l) =>
      l.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className='flex flex-col items-start gap-8 h-fit min-h-0 pb-10 w-full'>
      {/* 顶部 UDS 风格页眉 */}
      <div className='flex flex-col gap-1 bg-muted/5 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-dashed border-muted/50 w-full'>
          <div className='flex items-center gap-2 text-primary'>
              <Factory className='size-4' />
              <h3 className='text-base sm:text-lg font-black tracking-tighter italic uppercase'>{t('orgPersonnel.lineMgmt.header.title')}</h3>
          </div>
          <p className='text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
              {t('orgPersonnel.lineMgmt.header.subtitle')}
          </p>
      </div>

      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 px-1 w-full'>
        <div className='relative w-full sm:max-w-sm'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
          <Input
            placeholder={t('orgPersonnel.lineMgmt.list.searchPlaceholder')}
            className='pl-10 h-12 rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 text-sm font-medium transition-all'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button 
          onClick={handleAdd}
          className='rounded-full h-11 px-6 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all w-full sm:w-auto'
        >
          <Plus className='size-4 mr-2' /> {t('orgPersonnel.lineMgmt.list.addButton')}
        </Button>
      </div>

      {filteredLines.length === 0 ? (
        <Card className='rounded-[24px] border-dashed bg-muted/5 border-muted/50'>
          <CardContent className='flex flex-col items-center justify-center py-24 space-y-4 text-center'>
            <Factory className='size-12 text-muted-foreground/20' />
            <div className='space-y-2'>
              <p className='text-base font-black italic uppercase tracking-tighter text-muted-foreground/60'>
                {t('orgPersonnel.lineMgmt.list.emptyTitle')}
              </p>
              <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 max-w-[300px]'>
                {t('orgPersonnel.lineMgmt.list.emptyDesc')}
              </p>
            </div>
            <Button 
              variant='outline' 
              onClick={handleAdd}
              className='rounded-full h-11 px-6 font-black text-[10px] uppercase tracking-widest border-dashed hover:bg-muted/5'
            >
              <Plus className='size-4 mr-2' /> {t('orgPersonnel.lineMgmt.list.initButton')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='flex flex-col gap-4 w-full'>
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
        lines={lines} // 传入现有列表以计算流水号
        onConfirm={handleDialogConfirm}
      />
    </div>
  )
}
