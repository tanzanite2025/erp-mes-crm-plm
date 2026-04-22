import type { TranslationKey } from '@/locales'
import { Edit3, Eye } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type AppearanceMapping } from '../data/appearance-mapping'
import { type DMRuleSegment } from '../data/dm-rules-config'

interface DMRulesTableProps {
  rules: DMRuleSegment[]
  appearanceMapping: AppearanceMapping | null
  onEdit: (segment: DMRuleSegment) => void
  translationPrefix?:
    | 'basicSettings.dmNumbering'
    | 'basicSettings.linearBarcode'
  lengthLabel?: string
  readOnlySegmentIds?: readonly string[]
  segmentPreviewValues?: Record<string, string[]>
}

export function DMRulesTable({
  rules,
  appearanceMapping,
  onEdit,
  translationPrefix = 'basicSettings.dmNumbering',
  lengthLabel = 'BIT',
  readOnlySegmentIds = ['appearance'],
  segmentPreviewValues,
}: DMRulesTableProps) {
  const { t } = useLanguage()

  return (
    <div className='overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-muted/5'>
      <Table>
        <TableHeader>
          <TableRow className='border-muted/50 hover:bg-transparent'>
            <TableHead className='h-14 w-[100px] pl-8 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
              {t(
                `${translationPrefix}.table.headers.segment` as TranslationKey
              )}
            </TableHead>
            <TableHead className='h-14 text-center text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
              {t(
                `${translationPrefix}.table.headers.description` as TranslationKey
              )}
            </TableHead>
            <TableHead className='h-14 text-center text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
              {t(
                `${translationPrefix}.table.headers.example` as TranslationKey
              )}
            </TableHead>
            <TableHead className='h-14 w-[100px] pr-8 text-right text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
              {t(`${translationPrefix}.table.headers.action` as TranslationKey)}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((segment) => {
            const previewValues = segmentPreviewValues?.[segment.id]
            const examples =
              previewValues && previewValues.length > 0
                ? previewValues
                : segment.examples
            const isReadOnly = readOnlySegmentIds.includes(segment.id)

            return (
              <TableRow
                key={segment.id}
                className='group border-muted/30 transition-colors hover:bg-muted/30'
              >
                <TableCell className='py-5 pl-8'>
                  <div className='flex flex-col gap-1'>
                    <span className='font-mono text-[11px] font-black tracking-tighter text-rose-600/80'>
                      {segment.length} {lengthLabel} /{' '}
                      {segment.id.toUpperCase()}
                    </span>
                    <span className='text-[10px] font-black text-slate-800 italic dark:text-muted-foreground/80'>
                      {t(
                        `${translationPrefix}.table.segments.${segment.id}.name` as TranslationKey
                      ) || segment.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className='py-5'>
                  <p className='mx-auto max-w-[300px] text-center text-[10px] leading-relaxed font-medium text-muted-foreground opacity-80'>
                    {t(
                      `${translationPrefix}.table.segments.${segment.id}.desc` as TranslationKey
                    ) || segment.description}
                  </p>
                </TableCell>
                <TableCell className='py-5'>
                  <div className='flex flex-wrap justify-center gap-1.5'>
                    {segment.id === 'appearance' && appearanceMapping
                      ? Object.entries(appearanceMapping)
                          .slice(0, 3)
                          .map(([key, item]) => (
                            <span
                              key={key}
                              className='rounded-md border border-muted-foreground/5 bg-muted px-2 py-0.5 font-mono text-[9px] font-black text-muted-foreground/60'
                            >
                              {key}={item.label}
                            </span>
                          ))
                      : examples?.slice(0, 3).map((ex, idx) => (
                          <span
                            key={idx}
                            className='rounded-md border border-muted-foreground/5 bg-muted px-2 py-0.5 font-mono text-[9px] font-black text-muted-foreground/60'
                          >
                            {ex}
                          </span>
                        ))}
                    {(examples?.length || 0) > 3 && (
                      <span className='ml-1 self-center text-[9px] font-black text-muted-foreground/30'>
                        ...
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className='py-5 pr-8 text-right'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-8 rounded-full hover:bg-rose-500/10 hover:text-rose-600'
                    onClick={() => onEdit(segment)}
                  >
                    {isReadOnly ? (
                      <Eye className='size-3.5' />
                    ) : (
                      <Edit3 className='size-3.5' />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
