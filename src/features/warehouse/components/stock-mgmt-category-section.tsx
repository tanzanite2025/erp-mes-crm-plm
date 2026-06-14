import { ShieldCheck, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type InventoryView } from '../inventory'
import { getCategoryIcon } from '../utils/stock-utils'

interface StockMgmtCategorySectionProps {
  category: { code: string; name: string }
  items: InventoryView[]
  hideZero: boolean
  onHideZeroChange: (checked: boolean) => void
  materialTotalStock: Record<string, number>
  materialThresholdMap: Record<string, number>
  canConfigureThreshold?: boolean
  onConfigureThreshold: (item: InventoryView, current: number) => void
}

export function StockMgmtCategorySection({
  category,
  items,
  hideZero,
  onHideZeroChange,
  materialTotalStock,
  materialThresholdMap,
  canConfigureThreshold = true,
  onConfigureThreshold,
}: StockMgmtCategorySectionProps) {
  const { t } = useLanguage()

  return (
    <AccordionItem
      value={category.code}
      className='group overflow-hidden rounded-2xl border-none bg-background shadow-sm transition-all hover:shadow-md md:rounded-[24px]'
    >
      <AccordionTrigger className='px-3 py-2 transition-colors group-data-[state=open]:bg-primary/5 hover:no-underline md:px-5'>
        <div className='flex w-full items-center justify-between pr-4 md:pr-8'>
          <div className='flex items-center gap-2 overflow-hidden md:gap-3'>
            <div className='flex size-8 shrink-0 items-center justify-center rounded-xl border border-muted/80 bg-muted/50 shadow-inner transition-transform group-hover:scale-105 md:size-9'>
              {getCategoryIcon(category.code)}
            </div>
            <div className='flex flex-row items-center gap-2 overflow-hidden'>
              <span className='truncate text-left text-xs font-black tracking-tighter text-slate-800 uppercase italic md:text-sm'>
                {category.name}
              </span>
              <Badge
                variant='outline'
                className='h-4 shrink-0 rounded-full border-none bg-primary/10 px-2 text-[7px] font-black tracking-widest whitespace-nowrap text-primary/80 uppercase md:text-[8px]'
              >
                {t('warehouse.stock.nodesCount', { count: items.length })}
              </Badge>
            </div>
          </div>

          <div
            className='flex shrink-0 items-center gap-2'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center gap-1.5 rounded-full border border-dashed border-muted bg-muted/30 px-2 py-0.5 transition-colors hover:bg-muted/50 md:gap-2 md:px-3 md:py-1'>
              <Checkbox
                id={`hide-zero-${category.code}`}
                checked={hideZero}
                onCheckedChange={(checked: boolean) =>
                  onHideZeroChange(checked === true)
                }
                className='size-3.5 rounded-md border-primary/50 data-[state=checked]:bg-primary md:size-4'
              />
              <Label
                htmlFor={`hide-zero-${category.code}`}
                className='hidden cursor-pointer text-[7px] font-black tracking-widest text-muted-foreground/60 uppercase select-none sm:block md:text-[9px]'
              >
                {t('warehouse.stock.hideZero')}
              </Label>
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className='border-t border-dashed border-muted/50 p-0'>
        <div className='scrollbar-hide overflow-x-auto'>
          <Table className='min-w-[600px] md:min-w-0'>
            <TableHeader className='h-12 bg-muted/30 md:h-14'>
              <TableRow className='border-b border-dashed hover:bg-transparent'>
                <TableHead className='w-[120px] pl-4 text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:w-[140px] md:pl-8 md:text-[10px]'>
                  {t('warehouse.stock.columns.identifier')}
                </TableHead>
                <TableHead className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[10px]'>
                  {t('warehouse.stock.columns.specDescription')}
                </TableHead>
                <TableHead className='w-[140px] text-right text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:w-[180px] md:text-[10px]'>
                  {t('warehouse.stock.columns.stockLevel')}
                </TableHead>
                <TableHead className='w-[80px] pr-4 text-center text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:w-[100px] md:pr-8 md:text-[10px]'>
                  {t('warehouse.stock.columns.action')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items
                .filter((item) => !hideZero || item.quantity > 0)
                .map((item) => {
                  const total = materialTotalStock[item.materialId] || 0
                  const min = materialThresholdMap[item.materialId] || 0
                  const isAlert = min > 0 && total < min

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        'group border-b border-dashed border-muted/50 transition-all hover:bg-muted/30',
                        isAlert && 'bg-rose-500/3'
                      )}
                    >
                      <TableCell className='max-w-[100px] truncate py-2.5 pl-4 font-mono text-[9px] font-black text-muted-foreground/40 md:py-3 md:pl-8 md:text-[10px]'>
                        {item.materialCode}
                      </TableCell>
                      <TableCell className='py-2.5 md:py-3'>
                        <div className='max-w-[200px] truncate text-[12px] font-bold tracking-tighter text-slate-700 uppercase transition-transform duration-300 group-hover:translate-x-1 md:text-[13px]'>
                          {item.materialName}
                        </div>
                        <div className='mt-1 flex max-w-[200px] items-center gap-1.5 truncate text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[9px]'>
                          <ShieldCheck className='size-2.5 shrink-0 text-emerald-500/40' />
                          {item.materialSpec || t('warehouse.stock.noSpec')}
                        </div>
                      </TableCell>
                      <TableCell className='py-2.5 text-right md:py-3'>
                        <div className='flex flex-col items-end gap-0.5 md:gap-1'>
                          <div
                            className={cn(
                              'font-mono text-sm font-black tracking-tighter md:text-base',
                              total === 0
                                ? 'text-muted-foreground/20'
                                : isAlert
                                  ? 'text-rose-600'
                                  : 'text-slate-800'
                            )}
                          >
                            {total.toLocaleString()}{' '}
                            <span className='ml-1 text-[8px] font-black text-muted-foreground/40 uppercase md:text-[9px]'>
                              {item.uom}
                            </span>
                          </div>
                          <div className='animate-in font-mono text-[8px] font-black tracking-tighter text-primary/40 uppercase duration-500 fade-in slide-in-from-right-1'>
                            @
                            {item.averageUnitCost?.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                          {min > 0 ? (
                            <div
                              className={cn(
                                'flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[7px] font-black tracking-widest uppercase md:text-[8px]',
                                isAlert
                                  ? 'border-rose-500/20 bg-rose-500/10 text-rose-500'
                                  : 'border-muted-foreground/10 bg-muted text-muted-foreground/40'
                              )}
                            >
                              {t('warehouse.stock.minLabel', { count: min })}
                              {isAlert && (
                                <div className='h-1 w-1 shrink-0 animate-ping rounded-full bg-rose-500' />
                              )}
                            </div>
                          ) : (
                            <div className='text-[7px] font-black tracking-widest text-muted-foreground/20 uppercase md:text-[8px]'>
                              {t('warehouse.stock.noAlarm')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className='py-2.5 pr-4 text-center md:py-3 md:pr-8'>
                        <Button
                          variant='ghost'
                          size='icon'
                          disabled={!canConfigureThreshold}
                          className='size-7 rounded-lg text-muted-foreground/40 transition-all hover:bg-primary/10 hover:text-primary active:scale-90 md:size-8'
                          onClick={() => onConfigureThreshold(item, min)}
                        >
                          <Settings2 className='size-4 md:size-5' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
