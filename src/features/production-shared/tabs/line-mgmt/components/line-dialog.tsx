import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProductionLine } from '../types'
import { useLanguage } from '@/context/language-provider'

interface LineDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  editingLine: ProductionLine | null
  lines: ProductionLine[]
  onConfirm: (data: Partial<ProductionLine>) => void
}

const KEYWORD_MAP: Record<string, string> = {
  碳纤维: 'carbon',
  车圈: 'rim',
  前叉: 'fork',
  组装: 'assembly',
  成型: 'forming',
  产线: 'line',
  自动化: 'auto',
  手动: 'manual',
}

export function LineDialog({ isOpen, onOpenChange, editingLine, lines, onConfirm }: LineDialogProps) {
  const { t } = useLanguage()
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')

  useEffect(() => {
    if (editingLine) {
      setFormCode(editingLine.code)
      setFormName(editingLine.name)
      setFormDesc(editingLine.description)
    } else {
      setFormCode('')
      setFormName('')
      setFormDesc('')
    }
  }, [editingLine, isOpen])

  const generateLineCode = (name: string) => {
    // 提取英文前缀
    let prefix = ''
    Object.entries(KEYWORD_MAP).forEach(([cn, en]) => {
      if (name.includes(cn)) {
        prefix += en
      }
    })

    if (!prefix) prefix = 'line'
    if (!prefix.endsWith('line')) prefix += 'line'

    // 计算下一个三位流水号
    const nextIndex = lines.length + 1
    const suffix = nextIndex.toString().padStart(3, '0')

    return `${prefix.toLowerCase()}-${suffix}`
  }

  const handleNameChange = (val: string) => {
    setFormName(val)
    // 仅在新增模式且用户未手动深度干预编号时自动生成
    if (!editingLine && val.trim()) {
      setFormCode(generateLineCode(val))
    }
  }

  const handleConfirm = () => {
    onConfirm({
      code: formCode,
      name: formName,
      description: formDesc,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='rounded-[32px] border-none shadow-2xl max-w-lg overflow-hidden'>
        <DialogHeader className='space-y-4'>
          <div className='flex items-center gap-2 text-primary'>
            <DialogTitle className='text-lg font-black italic uppercase tracking-tighter'>{editingLine ? t('orgPersonnel.lineMgmt.dialog.editTitle') : t('orgPersonnel.lineMgmt.dialog.createTitle')}</DialogTitle>
          </div>
          <DialogDescription className='text-[9px] font-black uppercase tracking-widest opacity-60'>
            {t('orgPersonnel.lineMgmt.dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-5 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='line-name' className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic ml-1'>{t('orgPersonnel.lineMgmt.dialog.nameLabel')}</Label>
            <Input
              id='line-name'
              placeholder={t('orgPersonnel.lineMgmt.dialog.namePlaceholder')}
              className='h-12 rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all font-medium'
              value={formName}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='line-code' className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic ml-1'>{t('orgPersonnel.lineMgmt.dialog.codeLabel')}</Label>
            <div className='relative'>
              <Input
                id='line-code'
                placeholder={t('orgPersonnel.lineMgmt.dialog.codePlaceholder')}
                value={formCode}
                readOnly
                className='h-12 rounded-2xl border-none bg-background/50 border-dashed border-muted/50 font-mono pr-20 cursor-not-allowed text-primary font-black tracking-tighter shadow-inner'
              />
              {!editingLine && (
                <div className='absolute right-4 top-1/2 -translate-y-1/2'>
                   <span className='text-[8px] text-primary font-black bg-primary/10 px-2 py-1 rounded-full border border-primary/20'>
                     {t('orgPersonnel.lineMgmt.dialog.autoGen')}
                   </span>
                </div>
              )}
            </div>
            <p className='text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest italic ml-1'>
              {t('orgPersonnel.lineMgmt.dialog.codeHint')}
            </p>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='line-desc' className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic ml-1'>{t('orgPersonnel.lineMgmt.dialog.descLabel')}</Label>
            <Input
              id='line-desc'
              placeholder={t('orgPersonnel.lineMgmt.dialog.descPlaceholder')}
              className='h-12 rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all font-medium'
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className='gap-2 pt-4'>
          <Button 
            variant='outline' 
            onClick={() => onOpenChange(false)}
            className='rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest border-muted'
          >
            {t('orgPersonnel.lineMgmt.dialog.cancel')}
          </Button>
          <Button 
            onClick={handleConfirm}
            className='rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all'
          >
            {editingLine ? t('orgPersonnel.lineMgmt.dialog.save') : t('orgPersonnel.lineMgmt.dialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
