'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Palette, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  APPEARANCE_MAPPING_KEY,
  APPEARANCE_MAPPING_QUERY_KEY,
  DEFAULT_APPEARANCE_MAPPING,
  type AppearanceMapping,
} from '../data/appearance-mapping'
import { useAppearanceMapping } from '../hooks/use-appearance-mapping'

export type { AppearanceMapping } from '../data/appearance-mapping'

const logger = createLogger('AppearanceActionDialog')

interface AppearanceActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppearanceActionDialog({ open, onOpenChange }: AppearanceActionDialogProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data: savedMapping = DEFAULT_APPEARANCE_MAPPING } = useAppearanceMapping()
  const [mapping, setMapping] = useState<AppearanceMapping>(DEFAULT_APPEARANCE_MAPPING)

  useEffect(() => {
    if (!open) {
      return
    }

    try {
      setMapping(savedMapping)
    } catch (error) {
      logger.error('[FAIL_LOUDLY] AppearanceActionDialog.syncDraft', error)
      setMapping(DEFAULT_APPEARANCE_MAPPING)
    }
  }, [open, savedMapping])

  const handleSave = async () => {
    await StorageService.setItem(APPEARANCE_MAPPING_KEY, mapping)
    queryClient.setQueryData(APPEARANCE_MAPPING_QUERY_KEY, mapping)
    toast.success(t('basicSettings.appearanceMapping.toasts.saved'))
    onOpenChange(false)
  }

  const handleReset = () => {
    setMapping(DEFAULT_APPEARANCE_MAPPING)
    toast.info(t('basicSettings.appearanceMapping.toasts.reset'))
  }

  const updateItem = (key: string, field: 'label' | 'desc', value: string) => {
    setMapping((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600'>
              <Palette className='size-5' />
            </div>
            <div>
              <DialogTitle className='text-xl font-black uppercase tracking-tight'>
                {t('basicSettings.appearanceMapping.title')}
              </DialogTitle>
              <DialogDescription className='text-xs font-medium'>
                {t('basicSettings.appearanceMapping.description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className='grid max-h-[50vh] grid-cols-1 gap-4 overflow-y-auto py-4 pr-2 md:grid-cols-2'>
          {Object.keys(DEFAULT_APPEARANCE_MAPPING)
            .sort()
            .map((key) => (
              <div
                key={key}
                className='group relative space-y-3 rounded-xl border bg-muted/30 p-4 transition-all hover:border-blue-500/30 hover:bg-muted/50'
              >
                <div className='absolute right-3 top-3 flex size-6 items-center justify-center rounded bg-slate-900 text-xs font-black text-white'>
                  {key}
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-[10px] font-black uppercase text-slate-400'>
                    {t('basicSettings.appearanceMapping.fields.label')}
                  </Label>
                  <Input
                    value={mapping[key]?.label}
                    onChange={(event) => updateItem(key, 'label', event.target.value)}
                    className='h-8 font-mono font-black transition-all focus:ring-2 focus:ring-blue-500/20'
                    placeholder={t('basicSettings.appearanceMapping.placeholders.label')}
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-[10px] font-black uppercase text-slate-400'>
                    {t('basicSettings.appearanceMapping.fields.description')}
                  </Label>
                  <Input
                    value={mapping[key]?.desc}
                    onChange={(event) => updateItem(key, 'desc', event.target.value)}
                    className='h-8 text-[11px] font-medium transition-all'
                    placeholder={t('basicSettings.appearanceMapping.placeholders.description')}
                  />
                </div>
              </div>
            ))}
        </div>

        <DialogFooter className='flex items-center justify-between border-t pt-4 sm:justify-between'>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleReset}
            className='text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
          >
            <RotateCcw className='mr-2 size-3.5' /> {t('basicSettings.appearanceMapping.actions.reset')}
          </Button>
          <div className='flex gap-2'>
            <Button variant='outline' size='sm' onClick={() => onOpenChange(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              size='sm'
              onClick={handleSave}
              className='bg-blue-600 font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700'
            >
              <Save className='mr-2 size-3.5' /> {t('basicSettings.appearanceMapping.actions.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
