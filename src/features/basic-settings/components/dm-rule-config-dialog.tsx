'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { TranslationKey } from '@/locales'
import type { DMRuleSegment } from '../data/dm-rules-config'
import { Settings2, Plus, Trash2, Info } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

type MappingItem = { key: string; value: string }
type TranslationPrefix = 'basicSettings.dmNumbering' | 'basicSettings.linearBarcode'

interface DMRuleConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment: DMRuleSegment | null
  onSave: (segmentId: string, newData: unknown) => void
  translationPrefix?: TranslationPrefix
  configRevision?: string
  protocolLabel?: string
}

function createInitialMappings(segment: DMRuleSegment): MappingItem[] {
  return segment.examples.map((example) => ({
    key: example.split('=')[0] || example,
    value: example.split('=')[1] || 'EXAMPLE',
  }))
}

function DialogBody({
  segment,
  onOpenChange,
  onSave,
  translationPrefix,
  configRevision,
  protocolLabel,
}: Required<Omit<DMRuleConfigDialogProps, 'open' | 'segment'>> & { segment: DMRuleSegment }) {
  const { t } = useLanguage()
  const [mappings, setMappings] = useState<MappingItem[]>(() =>
    segment.type === 'mapping' ? createInitialMappings(segment) : [],
  )
  const [autoLogic, setAutoLogic] = useState(segment.type === 'mapping' ? '' : segment.description)

  const handleAddMapping = () => {
    setMappings((prev) => [...prev, { key: '', value: '' }])
  }

  const handleRemoveMapping = (index: number) => {
    setMappings((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleUpdateMapping = (index: number, field: keyof MappingItem, value: string) => {
    setMappings((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    )
  }

  const handleSave = () => {
    onSave(segment.id, segment.type === 'mapping' ? mappings : autoLogic)
    onOpenChange(false)
  }

  return (
    <DialogContent className='max-w-2xl bg-background border-border p-0 rounded-[2rem] overflow-hidden shadow-2xl'>
      <DialogHeader className='p-6 border-b bg-muted/10'>
        <div className='flex items-center gap-4'>
          <div className='size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20'>
            <Settings2 className='size-6 text-blue-500' />
          </div>
          <div className='text-start'>
            <DialogTitle className='text-xl font-bold tracking-tight'>
              {t(`${translationPrefix}.dialog.editTitle` as TranslationKey, {
                name: t(`${translationPrefix}.table.segments.${segment.id}.name` as TranslationKey) || segment.name,
              })}
            </DialogTitle>
            <DialogDescription className='text-xs mt-0.5 font-medium text-muted-foreground'>
              {t(`${translationPrefix}.dialog.segmentLabel` as TranslationKey)}:{' '}
              <span className='text-blue-500 font-mono'>{segment.range}</span> |{' '}
              {t(`${translationPrefix}.dialog.modeLabel` as TranslationKey)}:{' '}
              <span className='uppercase'>{segment.type}</span>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className='p-6 space-y-6'>
        <div className='p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3'>
          <Info className='size-4 text-blue-500 mt-0.5' />
          <p className='text-[11px] leading-relaxed text-blue-400/70 font-medium'>
            {t(`${translationPrefix}.dialog.helperText` as TranslationKey)}
          </p>
        </div>

        {segment.type === 'mapping' ? (
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h4 className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                {t(`${translationPrefix}.dialog.mappingMatrix` as TranslationKey)}
              </h4>
              <Button
                onClick={handleAddMapping}
                variant='ghost'
                size='sm'
                className='h-8 rounded-lg text-blue-500 hover:bg-blue-500/10 font-bold'
              >
                <Plus className='size-3.5 mr-1' /> {t(`${translationPrefix}.dialog.addMapping` as TranslationKey)}
              </Button>
            </div>

            <div className='rounded-xl border border-border overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar bg-muted/5'>
              <Table>
                <TableHeader className='bg-muted/10'>
                  <TableRow className='border-border hover:bg-transparent'>
                    <TableHead className='text-[10px] font-black uppercase py-4'>
                      {t(`${translationPrefix}.dialog.originalValue` as TranslationKey)}
                    </TableHead>
                    <TableHead className='text-[10px] font-black uppercase py-4'>
                      {t(`${translationPrefix}.dialog.convertedValue` as TranslationKey)}
                    </TableHead>
                    <TableHead className='w-12' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping, index) => (
                    <TableRow key={`${mapping.key}-${index}`} className='border-border hover:bg-muted/5'>
                      <TableCell className='p-2 pl-4'>
                        <Input
                          value={mapping.key}
                          onChange={(event) => handleUpdateMapping(index, 'key', event.target.value)}
                          placeholder={t(`${translationPrefix}.dialog.placeholderKey` as TranslationKey)}
                          className='bg-background border-border h-9 rounded-lg text-xs font-bold focus-visible:ring-blue-500/50'
                        />
                      </TableCell>
                      <TableCell className='p-2'>
                        <Input
                          value={mapping.value}
                          onChange={(event) => handleUpdateMapping(index, 'value', event.target.value)}
                          placeholder={t(`${translationPrefix}.dialog.placeholderValue` as TranslationKey)}
                          className='bg-muted/30 border-border h-9 rounded-lg font-mono text-blue-500 text-xs font-black uppercase focus-visible:ring-blue-500/50'
                        />
                      </TableCell>
                      <TableCell className='p-2 pr-4'>
                        <Button
                          onClick={() => handleRemoveMapping(index)}
                          variant='ghost'
                          size='icon'
                          className='size-8 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors'
                        >
                          <Trash2 className='size-3.5' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            <h4 className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
              {t(`${translationPrefix}.dialog.autoRules` as TranslationKey)}
            </h4>
            <div className='p-5 rounded-xl bg-muted/10 border border-border space-y-4'>
              <div className='space-y-1.5'>
                <label className='text-[10px] font-black uppercase text-muted-foreground/60'>
                  {t(`${translationPrefix}.dialog.logicDescription` as TranslationKey)}
                </label>
                <Input
                  value={autoLogic}
                  onChange={(event) => setAutoLogic(event.target.value)}
                  placeholder={t(`${translationPrefix}.dialog.autoDescriptionPlaceholder` as TranslationKey)}
                  className='bg-background border-border h-11 rounded-lg text-sm font-bold focus-visible:ring-blue-500/50'
                />
              </div>
              <div className='flex gap-4'>
                <Badge variant='outline' className='bg-blue-500/5 border-blue-500/20 text-blue-500 py-1 font-bold'>
                  {t(`${translationPrefix}.dialog.step` as TranslationKey)}
                </Badge>
                <Badge variant='outline' className='bg-blue-500/5 border-blue-500/20 text-blue-500 py-1 font-bold'>
                  {t(`${translationPrefix}.dialog.period` as TranslationKey)}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className='p-6 border-t bg-muted/10 flex flex-row items-center justify-between sm:justify-between'>
        <div className='flex flex-col text-[9px] text-muted-foreground uppercase tracking-tighter opacity-50 font-bold'>
          <span>{t(`${translationPrefix}.dialog.configRevision` as TranslationKey, { value: configRevision })}</span>
          <span>{t(`${translationPrefix}.dialog.protocol` as TranslationKey, { value: protocolLabel })}</span>
        </div>
        <div className='flex items-center gap-3'>
          <Button variant='ghost' onClick={() => onOpenChange(false)} className='rounded-xl font-bold text-xs uppercase h-10 px-6'>
            {t('common.actions.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className='rounded-xl bg-blue-600 hover:bg-blue-500 px-8 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 h-10 transition-all active:scale-95'
          >
            {t(`${translationPrefix}.dialog.save` as TranslationKey)}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  )
}

export function DMRuleConfigDialog({
  open,
  onOpenChange,
  segment,
  onSave,
  translationPrefix = 'basicSettings.dmNumbering',
  configRevision = '2025.10.01',
  protocolLabel = 'DM-ECC200-STABLE',
}: DMRuleConfigDialogProps) {
  if (!segment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogBody
        key={`${segment.id}-${open ? 'open' : 'closed'}`}
        segment={segment}
        onOpenChange={onOpenChange}
        onSave={onSave}
        translationPrefix={translationPrefix}
        configRevision={configRevision}
        protocolLabel={protocolLabel}
      />
    </Dialog>
  )
}
