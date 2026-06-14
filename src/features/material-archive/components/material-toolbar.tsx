import { useRef, type ChangeEvent } from 'react'
import { Plus, Search, Download, Upload } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface MaterialToolbarProps {
  currentCategoryLabel: string
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onExport: () => void
  onImport: (e: ChangeEvent<HTMLInputElement>) => void
  onAdd: () => void
}

export function MaterialToolbar({
  currentCategoryLabel,
  searchTerm,
  onSearchTermChange,
  onExport,
  onImport,
  onAdd,
}: MaterialToolbarProps) {
  const { t } = useLanguage()
  const importInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className='flex flex-col items-center justify-between gap-4 lg:flex-row'>
      <div className='relative w-full lg:max-w-sm'>
        <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
        <Input
          id='material-toolbar-search-input'
          placeholder={t('materialArchive.toolbar.searchPlaceholder', {
            category: currentCategoryLabel,
          })}
          className='h-12 w-full rounded-2xl border-none bg-muted/50 pl-10 text-sm font-medium shadow-inner transition-all focus-visible:ring-1 focus-visible:ring-primary/20'
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
        />
      </div>
      <div className='flex w-full flex-wrap items-center justify-center gap-2 md:gap-3 lg:w-auto'>
        <div className='flex items-center gap-2 rounded-full border border-dashed border-muted-foreground/10 bg-muted/20 p-1'>
          <Button
            id='material-toolbar-export-button'
            variant='ghost'
            size='sm'
            onClick={onExport}
            className='h-9 rounded-full px-4 text-[9px] font-black tracking-widest whitespace-nowrap uppercase opacity-60 transition-opacity hover:opacity-100 md:h-11 md:px-6 md:text-[10px]'
          >
            <Download className='mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4' />
            {t('materialArchive.toolbar.export')}
          </Button>
          <div className='h-4 w-px bg-muted-foreground/10' />
          <Button
            variant='ghost'
            size='sm'
            onClick={() => importInputRef.current?.click()}
            className='h-9 rounded-full px-4 text-[9px] font-black tracking-widest whitespace-nowrap text-orange-600/60 uppercase transition-all hover:bg-orange-500/5 hover:text-orange-600 md:h-11 md:px-6 md:text-[10px]'
          >
            <Upload className='mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4' />
            {t('materialArchive.toolbar.import')}
          </Button>
        </div>
        <input
          ref={importInputRef}
          type='file'
          className='hidden'
          accept='.xlsx, .xls'
          onChange={onImport}
        />
        <Button
          id='material-toolbar-add-button'
          size='sm'
          onClick={onAdd}
          className='h-10 w-full rounded-full bg-primary px-6 text-[10px] font-black tracking-widest text-primary-foreground uppercase shadow-xl shadow-primary/20 transition-all active:scale-95 sm:w-auto md:h-11 md:px-8'
        >
          <Plus className='mr-2 h-4 w-4' />
          {t('materialArchive.toolbar.register')}
        </Button>
      </div>
    </div>
  )
}
