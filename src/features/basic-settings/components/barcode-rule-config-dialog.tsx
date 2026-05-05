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
import type { BarcodeRuleSegment } from '../data/barcode-rule-segment'
import { Settings2, Plus, Trash2, Info } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

type MappingItem = { key: string; value: string }
type TranslationPrefix = 'basicSettings.linearBarcode'

interface BarcodeRuleConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment: BarcodeRuleSegment | null
  onSave: (segmentId: string, newData: unknown) => void
  translationPrefix?: TranslationPrefix
  configRevision?: string
  protocolLabel?: string
}

function createInitialMappings(segment: BarcodeRuleSegment): MappingItem[] {
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
}: Required<Omit<BarcodeRuleConfigDialogProps, 'open' | 'segment'>> & {
  segment: BarcodeRuleSegment
}) {
  const { t } = useLanguage()
  const [mappings, setMappings] = useState<MappingItem[]>(() =>
    segment.type === 'mapping' ? createInitialMappings(segment) : []
  )
  const [autoLogic, setAutoLogic] = useState(
    segment.type === 'mapping' ? '' : segment.description
  )

  const handleAddMapping = () => {
    setMappings((prev) => [...prev, { key: '', value: '' }])
  }

  const handleRemoveMapping = (index: number) => {
    setMappings((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleUpdateMapping = (
    index: number,
    field: keyof MappingItem,
    value: string
  ) => {
    setMappings((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    )
  }

  const handleSave = () => {
    onSave(segment.id, segment.type === 'mapping' ? mappings : autoLogic)
    onOpenChange(false)
  }

  return (
    <DialogContent className='max-w-4xl bg-background border-border p-0 rounded-[32px] overflow-hidden shadow-2xl'>
      <DialogHeader className='p-4 border-b bg-muted/10'>
        <div className='flex items-center gap-4'>
          <div className='size-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20'>
            <Settings2 className='size-5 text-blue-500' />
          </div>
          <div className='text-start'>
            {/* UDS 1.0 标题规范 */}
            <DialogTitle className='text-lg font-black tracking-tighter italic uppercase text-slate-800'>
              {t(`${translationPrefix}.dialog.editTitle` as TranslationKey, {
                name:
                  t(
                    `${translationPrefix}.table.segments.${segment.id}.name` as TranslationKey
                  ) || segment.name,
              })}
            </DialogTitle>
            {/* UDS 1.0 描述规范 */}
            <DialogDescription className='text-[10px] mt-0.5 font-black uppercase tracking-widest text-muted-foreground/50'>
              {t(`${translationPrefix}.dialog.segmentLabel` as TranslationKey)}:{' '}
              <span className='text-blue-500 font-mono'>{segment.range}</span> |{' '}
              {t(`${translationPrefix}.dialog.modeLabel` as TranslationKey)}:{' '}
              <span className='uppercase'>{segment.type}</span>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className='p-4 space-y-4'>
        {/* 极致压缩帮助卡片 */}
        <div className='p-2 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3'>
          <Info className='size-3.5 text-blue-500 mt-0.5' />
          <p className='text-[10px] leading-relaxed text-blue-400/70 font-black uppercase tracking-tight'>
            {t(`${translationPrefix}.dialog.helperText` as TranslationKey)}
          </p>
        </div>

        {segment.type === 'mapping' ? (
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <h4 className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                {t(`${translationPrefix}.dialog.mappingMatrix` as TranslationKey)}
              </h4>
              <Button
                onClick={handleAddMapping}
                variant='ghost'
                size='sm'
                className='h-7 rounded-lg text-blue-600 hover:bg-blue-500/10 font-black text-[10px] uppercase tracking-widest'
              >
                <Plus className='size-3 mr-1' />{' '}
                {t(`${translationPrefix}.dialog.addMapping` as TranslationKey)}
              </Button>
            </div>

            <div className='rounded-2xl border border-dashed border-muted/50 overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar bg-muted/5'>
              <Table>
                <TableHeader className='bg-muted/10'>
                  <TableRow className='border-muted/30 hover:bg-transparent'>
                    <TableHead className='text-[10px] font-black uppercase py-2 tracking-widest text-muted-foreground/40'>
                      {t(`${translationPrefix}.dialog.originalValue` as TranslationKey)}
                    </TableHead>
                    <TableHead className='text-[10px] font-black uppercase py-2 tracking-widest text-muted-foreground/40'>
                      {t(`${translationPrefix}.dialog.convertedValue` as TranslationKey)}
                    </TableHead>
                    <TableHead className='w-12' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping, index) => (
                    <TableRow key={`${mapping.key}-${index}`} className='border-muted/20 hover:bg-muted/5'>
                      <TableCell className='p-1.5 pl-4'>
                        <Input
                          value={mapping.key}
                          onChange={(event) =>
                            handleUpdateMapping(index, 'key', event.target.value)
                          }
                          placeholder={t(`${translationPrefix}.dialog.placeholderKey` as TranslationKey)}
                          className='bg-background border-muted/30 h-8 rounded-xl text-[11px] font-black focus-visible:ring-blue-500/30'
                        />
                      </TableCell>
                      <TableCell className='p-1.5'>
                        <Input
                          value={mapping.value}
                          onChange={(event) =>
                            handleUpdateMapping(index, 'value', event.target.value)
                          }
                          placeholder={t(`${translationPrefix}.dialog.placeholderValue` as TranslationKey)}
                          className='bg-muted/30 border-muted/30 h-8 rounded-xl font-mono text-blue-600 text-[11px] font-black uppercase focus-visible:ring-blue-500/30'
                        />
                      </TableCell>
                      <TableCell className='p-1.5 pr-4'>
                        <Button
                          onClick={() => handleRemoveMapping(index)}
                          variant='ghost'
                          size='icon'
                          className='size-7 text-rose-500/30 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors'
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
          <div className='space-y-3'>
            <h4 className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
              {t(`${translationPrefix}.dialog.autoRules` as TranslationKey)}
            </h4>
            <div className='p-3 rounded-2xl bg-muted/10 border border-dashed border-muted/50 space-y-3'>
              <div className='space-y-1'>
                <label className='text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest'>
                  {t(`${translationPrefix}.dialog.logicDescription` as TranslationKey)}
                </label>
                <Input
                  value={autoLogic}
                  onChange={(event) => setAutoLogic(event.target.value)}
                  placeholder={t(`${translationPrefix}.dialog.autoDescriptionPlaceholder` as TranslationKey)}
                  className='bg-background border-muted/30 h-10 rounded-xl text-[11px] font-black focus-visible:ring-blue-500/30'
                />
              </div>
              <div className='flex gap-2'>
                <Badge variant='outline' className='bg-blue-500/5 border-blue-500/10 text-blue-600 py-0.5 px-3 font-black uppercase text-[9px] tracking-widest'>
                  {t(`${translationPrefix}.dialog.step` as TranslationKey)}
                </Badge>
                <Badge variant='outline' className='bg-blue-500/5 border-blue-500/10 text-blue-600 py-0.5 px-3 font-black uppercase text-[9px] tracking-widest'>
                  {t(`${translationPrefix}.dialog.period` as TranslationKey)}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className='p-4 border-t bg-muted/10 flex flex-row items-center justify-between sm:justify-between'>
        <div className='flex flex-col text-[8px] text-muted-foreground/40 uppercase tracking-widest font-black'>
          <span>
            {t(`${translationPrefix}.dialog.configRevision` as TranslationKey, {
              value: configRevision,
            })}
          </span>
          <span>
            {t(`${translationPrefix}.dialog.protocol` as TranslationKey, {
              value: protocolLabel,
            })}
          </span>
        </div>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            onClick={() => onOpenChange(false)}
            className='rounded-full font-black text-[10px] uppercase tracking-widest h-9 px-6'
          >
            {t('common.actions.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className='rounded-full bg-blue-600 hover:bg-blue-700 px-10 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 h-9 transition-all active:scale-95'
          >
            {t(`${translationPrefix}.dialog.save` as TranslationKey)}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  )
}

export function BarcodeRuleConfigDialog({
  open,
  onOpenChange,
  segment,
  onSave,
  translationPrefix = 'basicSettings.linearBarcode',
  configRevision = '2025.10.01',
  protocolLabel = 'LINEAR-CODE128-STABLE',
}: BarcodeRuleConfigDialogProps) {
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
