'use client'

import { useRef } from 'react'
import { Plus, Download, Upload, Filter } from 'lucide-react'
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
  const showOwnerFilter = Boolean(
    ownerOptions && ownerOptions.length > 0 && onOwnerChange
  )

  return (
    <div className='flex flex-col gap-3 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4'>
      {showOwnerFilter ? (
        <div className='flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:shrink-0'>
          <div className='flex min-w-0 items-center gap-2'>
            <Filter className='size-3.5 shrink-0 text-indigo-500' />
            <span className='shrink-0 text-[11px] font-medium text-muted-foreground'>
              {t('engineering.bomArchive.filter.ownerLabel')}
            </span>
            <Select
              value={selectedOwnerValue ?? '__ALL__'}
              onValueChange={(next) => onOwnerChange?.(next)}
            >
              <SelectTrigger
                aria-label={t('engineering.bomArchive.filter.ownerLabel')}
                className='min-h-9 w-full min-w-0 rounded-xl border-dashed border-indigo-200 bg-indigo-50/40 px-3 text-[11px] font-bold whitespace-normal text-indigo-700 shadow-sm hover:bg-indigo-50 data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:text-left *:data-[slot=select-value]:break-all sm:min-w-[180px] lg:w-[210px]'
              >
                <SelectValue
                  placeholder={t(
                    'engineering.bomArchive.filter.ownerPlaceholder'
                  )}
                />
              </SelectTrigger>
              <SelectContent className='max-w-[min(28rem,var(--radix-select-content-available-width))]'>
                {ownerOptions!.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className='text-[11px] font-medium whitespace-normal *:[span]:last:break-all'
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
      <div className='grid w-full grid-cols-3 gap-2 lg:ml-auto lg:w-auto lg:min-w-[372px] lg:gap-3'>
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
          className='h-11 w-full min-w-0 rounded-[18px] border-dashed border-blue-200 bg-blue-50/20 px-1.5 shadow-sm transition-all hover:bg-blue-100 active:scale-95 lg:min-w-[116px] lg:px-3'
        >
          <div className='flex items-center justify-center gap-1 whitespace-nowrap'>
            <Download className='size-3 text-blue-600' />
            <span className='text-[9px] font-black tracking-tight sm:text-[10px]'>
              {t('engineering.bomToolbar.downloadTemplate')}
            </span>
          </div>
        </Button>
        <Button
          variant='outline'
          onClick={() => fileInputRef.current?.click()}
          className='h-11 w-full min-w-0 rounded-[18px] border-dashed border-muted px-1.5 shadow-sm transition-all hover:bg-muted active:scale-95 lg:min-w-[116px] lg:px-3'
        >
          <div className='flex items-center justify-center gap-1 whitespace-nowrap'>
            <Upload className='size-3 text-blue-600' />
            <span className='text-[9px] font-black tracking-tight sm:text-[10px]'>
              {t('engineering.bomToolbar.importFormula')}
            </span>
          </div>
        </Button>
        <Button
          onClick={onAddBOM}
          className='h-11 w-full min-w-0 rounded-[18px] bg-blue-600 px-1.5 text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95 lg:min-w-[116px] lg:px-3'
        >
          <div className='flex items-center justify-center gap-1 whitespace-nowrap'>
            <Plus className='size-3 text-white' />
            <span className='text-[9px] font-black tracking-tight sm:text-[10px]'>
              {t('engineering.bomToolbar.createBom')}
            </span>
          </div>
        </Button>
      </div>
    </div>
  )
}
