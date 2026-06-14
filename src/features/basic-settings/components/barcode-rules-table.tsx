'use client'

import type { TranslationKey } from '@/locales'
import { Edit3, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { type AppearanceMapping } from '../data/appearance-mapping'
import { type BarcodeRuleSegment } from '../data/barcode-rule-segment'

interface BarcodeRulesTableProps {
  rules: BarcodeRuleSegment[]
  appearanceMapping: AppearanceMapping | null
  onEdit: (segment: BarcodeRuleSegment) => void
  translationPrefix?: 'basicSettings.linearBarcode'
  lengthLabel?: string
  readOnlySegmentIds?: readonly string[]
  segmentPreviewValues?: Record<string, string[]>
}

export function BarcodeRulesTable({
  rules,
  appearanceMapping,
  onEdit,
  translationPrefix = 'basicSettings.linearBarcode',
  lengthLabel = 'BIT',
  readOnlySegmentIds = ['appearance'],
  segmentPreviewValues,
}: BarcodeRulesTableProps) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-2'>
      {/* 模拟表头 - UDS 1.0 标签规范 */}
      <div className='grid grid-cols-[140px_1fr_1fr_100px] items-center px-6 py-2'>
        <span className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
          {t(`${translationPrefix}.table.headers.segment` as TranslationKey)}
        </span>
        <span className='text-center text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
          {t(
            `${translationPrefix}.table.headers.description` as TranslationKey
          )}
        </span>
        <span className='text-center text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
          {t(`${translationPrefix}.table.headers.example` as TranslationKey)}
        </span>
        <span className='text-right text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
          {t(`${translationPrefix}.table.headers.action` as TranslationKey)}
        </span>
      </div>

      {/* 卡片化列表 */}
      <div className='flex flex-col gap-2'>
        {rules.map((segment) => {
          const previewValues = segmentPreviewValues?.[segment.id]
          const examples =
            previewValues && previewValues.length > 0
              ? previewValues
              : segment.examples
          const isReadOnly = readOnlySegmentIds.includes(segment.id)

          return (
            <div
              key={segment.id}
              className={cn(
                'grid grid-cols-[140px_1fr_1fr_100px] items-center',
                'rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-2',
                'group transition-all duration-300 hover:border-blue-400/40 hover:bg-white hover:shadow-xl'
              )}
            >
              {/* 1. 字段标识 */}
              <div className='flex flex-col gap-0.5 pl-4'>
                <span className='font-mono text-[10px] font-black tracking-tighter text-rose-600/70'>
                  {segment.length} {lengthLabel} / {segment.id.toUpperCase()}
                </span>
                <span className='text-[10px] font-black tracking-tight text-slate-800 uppercase italic'>
                  {t(
                    `${translationPrefix}.table.segments.${segment.id}.name` as TranslationKey
                  ) || segment.name}
                </span>
              </div>

              {/* 2. 说明文本 */}
              <div className='px-4'>
                <p className='mx-auto max-w-[280px] text-center text-[10px] leading-relaxed font-black tracking-tight text-muted-foreground/60 uppercase'>
                  {t(
                    `${translationPrefix}.table.segments.${segment.id}.desc` as TranslationKey
                  ) || segment.description}
                </p>
              </div>

              {/* 3. 示例展示 */}
              <div className='flex flex-wrap justify-center gap-1'>
                {segment.id === 'appearance' && appearanceMapping
                  ? Object.entries(appearanceMapping)
                      .slice(0, 3)
                      .map(([key, item]) => (
                        <span
                          key={key}
                          className='rounded-md border border-muted-foreground/5 bg-muted/50 px-2 py-0.5 font-mono text-[9px] font-black text-muted-foreground/60'
                        >
                          {key}={item.label}
                        </span>
                      ))
                  : examples?.slice(0, 3).map((example, index) => (
                      <span
                        key={`${segment.id}-${index}`}
                        className='rounded-md border border-muted-foreground/5 bg-muted/50 px-2 py-0.5 font-mono text-[9px] font-black text-muted-foreground/60'
                      >
                        {example}
                      </span>
                    ))}
                {(examples?.length || 0) > 3 ? (
                  <span className='ml-1 self-center text-[9px] font-black text-muted-foreground/20'>
                    ...
                  </span>
                ) : null}
              </div>

              {/* 4. 操作区 */}
              <div className='pr-4 text-right'>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-8 rounded-full transition-all hover:bg-blue-600 hover:text-white'
                  onClick={() => onEdit(segment)}
                >
                  {isReadOnly ? (
                    <Eye className='size-3.5' />
                  ) : (
                    <Edit3 className='size-3.5' />
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
