import * as React from 'react'
import { Inbox, MoveHorizontal, Plus, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { LevelConfig, Standard, StandardItem } from '../data/schema'

interface StandardPreviewMatrixTableProps {
  standard: Standard
  primaryActionLabel: string
  onPrimaryAction: () => void
  showPrimaryAction?: boolean
}

export function StandardPreviewMatrixTable({
  standard,
  primaryActionLabel,
  onPrimaryAction,
  showPrimaryAction = true,
}: StandardPreviewMatrixTableProps) {
  const { t } = useLanguage()
  const hasItems = standard.items && standard.items.length > 0

  return (
    <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/5'>
      {hasItems ? (
        <>
          <div className='pointer-events-none absolute right-6 bottom-6 z-40 animate-bounce rounded-full border border-primary/50 bg-primary/40 p-2.5 shadow-2xl backdrop-blur-md transition-opacity lg:opacity-0 group-hover:lg:opacity-100'>
            <MoveHorizontal className='size-4 text-white' />
          </div>

          <div className='scrollbar-thin flex-1 overflow-auto p-4 lg:p-6 lg:pt-4'>
            <Table className='min-w-[1650px] border-separate border-spacing-0'>
              <TableHeader className='sticky top-0 z-30 bg-background/95 backdrop-blur-xl'>
                <TableRow className='hover:bg-transparent'>
                  <TableHead className='sticky left-0 z-40 h-12 w-[180px] border border-white/10 bg-muted/40 text-center text-[9px] font-black tracking-widest whitespace-nowrap uppercase shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)] backdrop-blur-xl lg:h-14 lg:text-[10px]'>
                    {t('quality.standards.dialog.detail.table.item')}
                    <div className='absolute right-0 bottom-0 h-full w-px bg-white/10' />
                  </TableHead>
                  <TableHead className='w-[80px] border border-l-0 border-white/10 bg-muted/40 text-center text-[9px] font-black tracking-widest whitespace-nowrap uppercase lg:text-[10px]'>
                    {t('quality.standards.dialog.detail.table.order')}
                  </TableHead>
                  <TableHead className='w-[100px] border border-l-0 border-white/10 bg-muted/40 text-center text-[9px] font-black tracking-widest whitespace-nowrap uppercase lg:text-[10px]'>
                    {t('quality.standards.dialog.detail.table.centerValue')}
                  </TableHead>
                  <TableHead className='w-[90px] border border-l-0 border-white/10 bg-primary/5 text-center text-[9px] font-black tracking-widest whitespace-nowrap text-primary uppercase lg:text-[10px]'>
                    {t('quality.standards.dialog.detail.table.level')}
                  </TableHead>
                  <TableHead className='w-[110px] border border-l-0 border-white/10 bg-primary/5 text-center text-[9px] font-black tracking-widest whitespace-nowrap text-primary uppercase lg:text-[10px]'>
                    {t('quality.standards.dialog.detail.table.tolerance')}
                  </TableHead>
                  <TableHead className='w-[110px] border border-l-0 border-white/10 bg-primary/5 text-center text-[9px] font-black tracking-widest whitespace-nowrap text-primary uppercase lg:text-[10px]'>
                    {t('quality.standards.dialog.detail.table.min')}
                  </TableHead>
                  <TableHead className='w-[110px] border border-l-0 border-white/10 bg-primary/5 text-center text-[9px] font-black tracking-widest whitespace-nowrap text-primary uppercase lg:text-[10px]'>
                    {t('quality.standards.dialog.detail.table.max')}
                  </TableHead>
                  <TableHead className='w-[130px] border border-l-0 border-white/10 bg-red-500/5 text-center text-[9px] font-black tracking-widest whitespace-nowrap text-red-500 uppercase lg:text-[10px]'>
                    {t('quality.standards.dialog.detail.table.errorCodeLower')}
                  </TableHead>
                  <TableHead className='w-[130px] border border-l-0 border-white/10 bg-red-500/5 text-center text-[9px] font-black tracking-widest whitespace-nowrap text-red-500 uppercase lg:text-[10px]'>
                    {t('quality.standards.dialog.detail.table.errorCodeUpper')}
                  </TableHead>
                  <TableHead className='w-[80px] border border-l-0 border-white/10 bg-muted/40 text-center text-[9px] font-black tracking-widest whitespace-nowrap uppercase lg:text-[10px]'>
                    {t('quality.standards.dialog.detail.table.unit')}
                  </TableHead>
                  <TableHead className='w-[90px] border border-l-0 border-white/10 bg-muted/40 text-center text-[9px] font-black tracking-widest whitespace-nowrap uppercase lg:text-[10px]'>
                    {t('quality.standards.dialog.detail.table.required')}
                  </TableHead>
                  <TableHead className='border border-l-0 border-white/10 bg-muted/40 text-center text-[9px] font-black tracking-[0.2em] whitespace-nowrap uppercase lg:text-[10px]'>
                    {t('quality.standards.dialog.detail.table.remarks')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standard.items.map((item: StandardItem) => (
                  <React.Fragment key={item.id}>
                    <TableRow className='group h-14 transition-colors'>
                      <TableCell
                        rowSpan={item.levels.length}
                        className='sticky left-0 z-20 border border-t-0 border-white/10 bg-muted/10 px-4 text-center text-[11px] font-black whitespace-nowrap shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)] backdrop-blur group-hover:bg-muted/20 lg:text-xs'
                      >
                        {item.name}
                        <div className='absolute right-0 bottom-0 h-full w-px bg-white/20 shadow-[2px_0_8px_rgba(0,0,0,0.2)]' />
                      </TableCell>
                      <TableCell
                        rowSpan={item.levels.length}
                        className='border border-t-0 border-l-0 border-white/10 text-center font-mono text-[9px] whitespace-nowrap opacity-40 lg:text-[10px]'
                      >
                        {item.order}
                      </TableCell>
                      <TableCell
                        rowSpan={item.levels.length}
                        className='border border-t-0 border-l-0 border-white/10 bg-muted/5 text-center text-[11px] font-black whitespace-nowrap lg:text-xs'
                      >
                        {item.centerValue?.toFixed(2)}
                      </TableCell>
                      <LevelRow
                        level={item.levels[0]}
                        remarks={item.remarks}
                        unit={item.unit}
                        isRequired={item.isRequired}
                        rowSpan={item.levels.length}
                      />
                    </TableRow>
                    {item.levels.slice(1).map((level: LevelConfig) => (
                      <TableRow
                        key={`${item.id}-${level.level}`}
                        className='group h-10 transition-colors'
                      >
                        <LevelCells level={level} />
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className='flex flex-1 animate-in flex-col items-center justify-center p-10 text-center duration-500 zoom-in-95 fade-in'>
          <div className='group relative mb-6 rounded-[2.5rem] border border-dashed border-white/10 bg-background/50 p-6 shadow-2xl'>
            <Inbox className='size-16 text-muted-foreground/10 transition-colors duration-500 group-hover:text-primary/10 lg:size-24' />
            <ShieldCheck className='absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-primary/20 lg:size-10' />
          </div>
          <h3 className='mb-2 text-base font-black tracking-tight uppercase lg:text-xl'>
            {t('quality.standards.dialog.detail.emptyTitle')}
          </h3>
          <p className='max-w-xs text-[10px] leading-relaxed font-medium text-muted-foreground opacity-50 lg:text-xs'>
            {t('quality.standards.dialog.detail.emptyDescription', {
              code: standard.code,
            })}
          </p>
          {showPrimaryAction ? (
            <div className='mt-8'>
              <Button
                className='h-9 rounded-xl bg-primary/10 px-6 text-[10px] font-black text-primary uppercase shadow-xl transition-all hover:bg-primary hover:text-primary-foreground'
                onClick={onPrimaryAction}
              >
                <Plus className='mr-2 size-3.5' />
                {primaryActionLabel}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function LevelRow({
  level,
  remarks,
  unit,
  isRequired,
  rowSpan,
}: {
  level: LevelConfig
  remarks?: string
  unit?: string
  isRequired?: boolean
  rowSpan: number
}) {
  const { t } = useLanguage()

  return (
    <>
      <LevelCells level={level} />
      <TableCell
        rowSpan={rowSpan}
        className='border border-t-0 border-l-0 border-white/10 px-1 text-center text-[9px] font-black whitespace-nowrap opacity-50 lg:text-[10px]'
      >
        {unit}
      </TableCell>
      <TableCell
        rowSpan={rowSpan}
        className='border border-t-0 border-l-0 border-white/10 text-center whitespace-nowrap'
      >
        <Badge
          variant={isRequired ? 'default' : 'outline'}
          className='rounded-md px-1.5 py-0 text-[8px] font-black lg:text-[9px]'
        >
          {isRequired
            ? t('quality.standards.dialog.detail.yes')
            : t('quality.standards.dialog.detail.no')}
        </Badge>
      </TableCell>
      <TableCell
        rowSpan={rowSpan}
        className='border border-t-0 border-l-0 border-white/10 p-3 text-[9px] leading-relaxed font-medium whitespace-nowrap text-muted-foreground italic opacity-70 lg:text-[10px]'
      >
        {remarks || t('quality.standards.dialog.detail.noRemarks')}
      </TableCell>
    </>
  )
}

function LevelCells({ level }: { level: LevelConfig }) {
  return (
    <>
      <TableCell
        className={cn(
          'border border-t-0 border-l-0 border-white/10 px-2 text-center text-[10px] font-black whitespace-nowrap lg:text-[11px]',
          level.level === 'B' && 'border-primary/30 bg-primary/20 text-primary'
        )}
      >
        {level.level}
      </TableCell>
      <TableCell
        className={cn(
          'border border-t-0 border-l-0 border-white/10 text-center text-[10px] font-bold whitespace-nowrap lg:text-[11px]',
          level.level === 'B' && 'bg-primary/5'
        )}
      >
        {level.tolerance?.toFixed(3)}
      </TableCell>
      <TableCell className='border border-t-0 border-l-0 border-white/10 text-center text-[10px] font-black whitespace-nowrap lg:text-[11px]'>
        {level.min?.toFixed(3)}
      </TableCell>
      <TableCell className='border border-t-0 border-l-0 border-white/10 text-center text-[10px] font-black whitespace-nowrap lg:text-[11px]'>
        {level.max?.toFixed(3)}
      </TableCell>
      <TableCell className='border border-t-0 border-l-0 border-white/10 px-1 text-center text-[9px] font-black whitespace-nowrap text-red-500/80'>
        {level.errorCodeLower || '-'}
      </TableCell>
      <TableCell className='border border-t-0 border-l-0 border-white/10 px-1 text-center text-[9px] font-black whitespace-nowrap text-red-500/80'>
        {level.errorCodeUpper || '-'}
      </TableCell>
    </>
  )
}
