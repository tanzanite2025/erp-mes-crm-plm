'use client'

import { useRef } from 'react'
import { Plus, Download, Upload, Layers, Filter } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface BOMOwnerFilterOption {
  label: string
  value: string
}

interface BOMToolbarProps {
  onDownloadTemplate: () => void
  onUploadExcel: (file: File) => void
  onAddBOM: () => void
  ownerOptions?: BOMOwnerFilterOption[]
  selectedOwnerValue?: string
  onOwnerChange?: (value: string) => void
}

export function BOMToolbar({
  onDownloadTemplate,
  onUploadExcel,
  onAddBOM,
  ownerOptions,
  selectedOwnerValue,
  onOwnerChange,
}: BOMToolbarProps) {
  const { t } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const showOwnerFilter = Boolean(ownerOptions && ownerOptions.length > 0 && onOwnerChange)

  return (
    <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-muted/5 p-4 sm:p-6 rounded-[24px] border border-dashed border-muted/50'>
      <div className='flex flex-col sm:flex-row items-start sm:items-center gap-3'>
        <div className='flex items-center gap-2'>
          <Layers className='size-5 text-blue-600 stroke-[3] -rotate-12' />
          <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
            {t('engineering.bomToolbar.quickAccess')}
          </span>
        </div>
        {showOwnerFilter ? (
          <div className='flex items-center gap-2'>
            <Filter className='size-3.5 text-indigo-500' />
            <Select
              value={selectedOwnerValue ?? '__ALL__'}
              onValueChange={(next) => onOwnerChange?.(next)}
            >
              <SelectTrigger
                aria-label={t('engineering.bomArchive.filter.ownerLabel')}
                className='h-9 min-w-[160px] rounded-xl border-dashed border-indigo-200 bg-indigo-50/40 px-3 text-[11px] font-bold text-indigo-700 shadow-sm hover:bg-indigo-50'
              >
                <SelectValue placeholder={t('engineering.bomArchive.filter.ownerPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {ownerOptions!.map((option) => (
                  <SelectItem key={option.value} value={option.value} className='text-[11px] font-medium'>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3'>
        <input
          type='file'
          accept='.xlsx,.xls'
          className='hidden'
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              onUploadExcel(file)
              e.target.value = ''
            }
          }}
        />
        <Button
          variant='outline'
          onClick={onDownloadTemplate}
          className='w-[105px] h-12 rounded-[18px] flex flex-col items-center justify-center gap-0.5 border-dashed border-blue-200 bg-blue-50/20 hover:bg-blue-100 shadow-sm active:scale-95 transition-all p-0'
        >
          <div className='flex items-center gap-1'>
            <Download className='size-3 text-blue-600' />
            <span className='text-[10px] font-black tracking-tighter'>
              {t('engineering.bomToolbar.downloadTemplate')}
            </span>
          </div>
          <span className='text-[7px] font-mono opacity-40 uppercase tracking-widest'>TEMPLATE</span>
        </Button>
        <Button
          variant='outline'
          onClick={() => fileInputRef.current?.click()}
          className='w-[105px] h-12 rounded-[18px] flex flex-col items-center justify-center gap-0.5 border-dashed border-muted shadow-sm hover:bg-muted active:scale-95 transition-all p-0'
        >
          <div className='flex items-center gap-1'>
            <Upload className='size-3 text-blue-600' />
            <span className='text-[10px] font-black tracking-tighter'>
              {t('engineering.bomToolbar.importFormula')}
            </span>
          </div>
          <span className='text-[7px] font-mono opacity-40 uppercase tracking-widest'>IMPORT_XLS</span>
        </Button>
        <Button
          onClick={onAddBOM}
          className='w-[105px] h-12 rounded-[18px] flex flex-col items-center justify-center gap-0.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all p-0'
        >
          <div className='flex items-center gap-1'>
            <Plus className='size-3 text-white' />
            <span className='text-[10px] font-black tracking-tighter'>
              {t('engineering.bomToolbar.createBom')}
            </span>
          </div>
          <span className='text-[7px] font-mono opacity-50 uppercase tracking-widest text-white/80'>
            CREATE_NEW
          </span>
        </Button>
      </div>
    </div>
  )
}
