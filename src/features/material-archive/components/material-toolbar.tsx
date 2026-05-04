import { useRef, type ChangeEvent } from 'react'
import { Plus, Search, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'

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
    <div className='flex flex-col lg:flex-row items-center justify-between gap-4'>
      <div className='relative w-full lg:max-w-sm'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
        <Input
          id='material-toolbar-search-input'
          placeholder={t('materialArchive.toolbar.searchPlaceholder', { category: currentCategoryLabel })}
          className='pl-10 h-12 rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 text-sm font-medium transition-all shadow-inner w-full'
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
        />
      </div>
      <div className='flex flex-wrap items-center justify-center gap-2 md:gap-3 w-full lg:w-auto'>
        <div className='flex items-center gap-2 bg-muted/20 p-1 rounded-full border border-dashed border-muted-foreground/10'>
          <Button
            id='material-toolbar-export-button'
            variant='ghost'
            size='sm'
            onClick={onExport}
            className='h-9 md:h-11 px-4 md:px-6 rounded-full font-black text-[9px] md:text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap'
          >
            <Download className='h-3.5 md:h-4 w-3.5 md:w-4 mr-1.5' />
            {t('materialArchive.toolbar.export')}
          </Button>
          <div className='w-px h-4 bg-muted-foreground/10' />
          <Button
            variant='ghost'
            size='sm'
            onClick={() => importInputRef.current?.click()}
            className='h-9 md:h-11 px-4 md:px-6 rounded-full font-black text-[9px] md:text-[10px] uppercase tracking-widest text-orange-600/60 hover:text-orange-600 hover:bg-orange-500/5 transition-all whitespace-nowrap'
          >
            <Upload className='h-3.5 md:h-4 w-3.5 md:w-4 mr-1.5' />
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
          className='h-10 md:h-11 px-6 md:px-8 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 bg-primary text-primary-foreground w-full sm:w-auto'
        >
          <Plus className='h-4 w-4 mr-2' />
          {t('materialArchive.toolbar.register')}
        </Button>
      </div>
    </div>
  )
}
