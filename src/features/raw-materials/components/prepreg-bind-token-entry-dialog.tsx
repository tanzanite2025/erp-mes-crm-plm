import { useState } from 'react'
import { ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'

type PrepregBindTokenEntryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (value: string) => void
}

export function PrepregBindTokenEntryDialog({
  open,
  onOpenChange,
  onSubmit,
}: PrepregBindTokenEntryDialogProps) {
  const { t } = useLanguage()
  const [value, setValue] = useState('')

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setValue('')
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='gap-4 rounded-[32px] border-none p-6 sm:max-w-xl'>
        <DialogHeader className='space-y-2'>
          <DialogTitle className='flex items-center gap-2 text-lg font-black italic uppercase tracking-tighter'>
            <ScanLine className='size-5 text-primary' />
            {t('rawMaterials.catalog.scanBinding.title')}
          </DialogTitle>
          <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
            {t('rawMaterials.catalog.scanBinding.description')}
          </p>
        </DialogHeader>

        <div className='grid gap-3'>
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onSubmit(value)
              }
            }}
            placeholder={t('rawMaterials.catalog.scanBinding.placeholder')}
            className='h-12 rounded-2xl border-none bg-muted/50 text-[10px] font-black tracking-[0.14em] placeholder:text-muted-foreground/45'
            autoFocus
          />
          <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
            {t('rawMaterials.catalog.scanBinding.hint')}
          </p>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-widest'
          >
            {t('rawMaterials.catalog.actions.cancel')}
          </Button>
          <Button
            type='button'
            onClick={() => onSubmit(value)}
            className='h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-widest'
          >
            <ScanLine className='size-4' />
            {t('rawMaterials.catalog.actions.scanBind')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
