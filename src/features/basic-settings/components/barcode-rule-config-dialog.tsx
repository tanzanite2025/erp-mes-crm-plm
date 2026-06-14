'use client'

import { useState } from 'react'
import type { TranslationKey } from '@/locales'
import { Settings2, Plus, Trash2, Info } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { BarcodeRuleSegment } from '../data/barcode-rule-segment'

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
    <DialogContent className='max-w-4xl overflow-hidden rounded-[32px] border-border bg-background p-0 shadow-2xl'>
      <DialogHeader className='border-b bg-muted/10 p-4'>
        <div className='flex items-center gap-4'>
          <div className='flex size-10 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10'>
            <Settings2 className='size-5 text-blue-500' />
          </div>
          <div className='text-start'>
            {/* UDS 1.0 标题规范 */}
            <DialogTitle className='text-lg font-black tracking-tighter text-slate-800 uppercase italic'>
              {t(`${translationPrefix}.dialog.editTitle` as TranslationKey, {
                name:
                  t(
                    `${translationPrefix}.table.segments.${segment.id}.name` as TranslationKey
                  ) || segment.name,
              })}
            </DialogTitle>
            {/* UDS 1.0 描述规范 */}
            <DialogDescription className='mt-0.5 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
              {t(`${translationPrefix}.dialog.segmentLabel` as TranslationKey)}:{' '}
              <span className='font-mono text-blue-500'>{segment.range}</span> |{' '}
              {t(`${translationPrefix}.dialog.modeLabel` as TranslationKey)}:{' '}
              <span className='uppercase'>{segment.type}</span>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className='space-y-4 p-4'>
        {/* 极致压缩帮助卡片 */}
        <div className='flex items-start gap-3 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-2'>
          <Info className='mt-0.5 size-3.5 text-blue-500' />
          <p className='text-[10px] leading-relaxed font-black tracking-tight text-blue-400/70 uppercase'>
            {t(`${translationPrefix}.dialog.helperText` as TranslationKey)}
          </p>
        </div>

        {segment.type === 'mapping' ? (
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <h4 className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t(
                  `${translationPrefix}.dialog.mappingMatrix` as TranslationKey
                )}
              </h4>
              <Button
                onClick={handleAddMapping}
                variant='ghost'
                size='sm'
                className='h-7 rounded-lg text-[10px] font-black tracking-widest text-blue-600 uppercase hover:bg-blue-500/10'
              >
                <Plus className='mr-1 size-3' />{' '}
                {t(`${translationPrefix}.dialog.addMapping` as TranslationKey)}
              </Button>
            </div>

            <div className='custom-scrollbar max-h-[400px] overflow-hidden overflow-y-auto rounded-2xl border border-dashed border-muted/50 bg-muted/5'>
              <Table>
                <TableHeader className='bg-muted/10'>
                  <TableRow className='border-muted/30 hover:bg-transparent'>
                    <TableHead className='py-2 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                      {t(
                        `${translationPrefix}.dialog.originalValue` as TranslationKey
                      )}
                    </TableHead>
                    <TableHead className='py-2 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                      {t(
                        `${translationPrefix}.dialog.convertedValue` as TranslationKey
                      )}
                    </TableHead>
                    <TableHead className='w-12' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping, index) => (
                    <TableRow
                      key={`${mapping.key}-${index}`}
                      className='border-muted/20 hover:bg-muted/5'
                    >
                      <TableCell className='p-1.5 pl-4'>
                        <Input
                          value={mapping.key}
                          onChange={(event) =>
                            handleUpdateMapping(
                              index,
                              'key',
                              event.target.value
                            )
                          }
                          placeholder={t(
                            `${translationPrefix}.dialog.placeholderKey` as TranslationKey
                          )}
                          className='h-8 rounded-xl border-muted/30 bg-background text-[11px] font-black focus-visible:ring-blue-500/30'
                        />
                      </TableCell>
                      <TableCell className='p-1.5'>
                        <Input
                          value={mapping.value}
                          onChange={(event) =>
                            handleUpdateMapping(
                              index,
                              'value',
                              event.target.value
                            )
                          }
                          placeholder={t(
                            `${translationPrefix}.dialog.placeholderValue` as TranslationKey
                          )}
                          className='h-8 rounded-xl border-muted/30 bg-muted/30 font-mono text-[11px] font-black text-blue-600 uppercase focus-visible:ring-blue-500/30'
                        />
                      </TableCell>
                      <TableCell className='p-1.5 pr-4'>
                        <Button
                          onClick={() => handleRemoveMapping(index)}
                          variant='ghost'
                          size='icon'
                          className='size-7 rounded-lg text-rose-500/30 transition-colors hover:bg-rose-500/10 hover:text-rose-500'
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
            <h4 className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
              {t(`${translationPrefix}.dialog.autoRules` as TranslationKey)}
            </h4>
            <div className='space-y-3 rounded-2xl border border-dashed border-muted/50 bg-muted/10 p-3'>
              <div className='space-y-1'>
                <label className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                  {t(
                    `${translationPrefix}.dialog.logicDescription` as TranslationKey
                  )}
                </label>
                <Input
                  value={autoLogic}
                  onChange={(event) => setAutoLogic(event.target.value)}
                  placeholder={t(
                    `${translationPrefix}.dialog.autoDescriptionPlaceholder` as TranslationKey
                  )}
                  className='h-10 rounded-xl border-muted/30 bg-background text-[11px] font-black focus-visible:ring-blue-500/30'
                />
              </div>
              <div className='flex gap-2'>
                <Badge
                  variant='outline'
                  className='border-blue-500/10 bg-blue-500/5 px-3 py-0.5 text-[9px] font-black tracking-widest text-blue-600 uppercase'
                >
                  {t(`${translationPrefix}.dialog.step` as TranslationKey)}
                </Badge>
                <Badge
                  variant='outline'
                  className='border-blue-500/10 bg-blue-500/5 px-3 py-0.5 text-[9px] font-black tracking-widest text-blue-600 uppercase'
                >
                  {t(`${translationPrefix}.dialog.period` as TranslationKey)}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className='flex flex-row items-center justify-between border-t bg-muted/10 p-4 sm:justify-between'>
        <div className='flex flex-col text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
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
            className='h-9 rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
          >
            {t('common.actions.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className='h-9 rounded-full bg-blue-600 px-10 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95'
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
