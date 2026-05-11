import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { getCategoryIcon } from '../utils/stock-utils'
import { type InventoryView } from '../inventory'

interface StockMgmtCategorySectionProps {
    category: { code: string, name: string }
    items: InventoryView[]
    hideZero: boolean
    onHideZeroChange: (checked: boolean) => void
    materialTotalStock: Record<string, number>
    alertThresholds: Record<string, number>
    canConfigureThreshold?: boolean
    onConfigureThreshold: (item: InventoryView, current: number) => void
}

export function StockMgmtCategorySection({
    category,
    items,
    hideZero,
    onHideZeroChange,
    materialTotalStock,
    alertThresholds,
    canConfigureThreshold = true,
    onConfigureThreshold
}: StockMgmtCategorySectionProps) {
    const { t } = useLanguage()

    return (
        <AccordionItem value={category.code} className='bg-background rounded-2xl md:rounded-[24px] border-none shadow-sm overflow-hidden group transition-all hover:shadow-md'>
            <AccordionTrigger className='hover:no-underline py-4 px-4 md:px-6 transition-colors group-data-[state=open]:bg-primary/5'>
                <div className='flex items-center justify-between w-full pr-4 md:pr-8'>
                    <div className='flex items-center gap-3 md:gap-4 overflow-hidden'>
                        <div className='size-9 md:size-10 rounded-xl bg-muted/50 flex items-center justify-center border border-muted/80 shadow-inner group-hover:scale-105 transition-transform shrink-0'>
                            {getCategoryIcon(category.code)}
                        </div>
                        <div className='flex flex-col items-start space-y-0.5 overflow-hidden'>
                            <span className='font-black text-sm md:text-base tracking-tighter uppercase text-slate-800 italic truncate w-full text-left'>{category.name}</span>
                            <div className='flex items-center gap-2'>
                                <Badge variant='outline' className='text-[7px] md:text-[8px] font-black uppercase tracking-widest bg-primary/10 border-none text-primary/80 h-4 px-2 rounded-full whitespace-nowrap'>
                                    {t('warehouse.stock.nodesCount', { count: items.length })}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div
                        className='flex items-center gap-2 shrink-0'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className='flex items-center gap-1.5 md:gap-2 bg-muted/30 px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-dashed border-muted transition-colors hover:bg-muted/50'>
                            <Checkbox
                                id={`hide-zero-${category.code}`}
                                checked={hideZero}
                                onCheckedChange={(checked: boolean) => onHideZeroChange(checked === true)}
                                className='size-3.5 md:size-4 rounded-md border-primary/50 data-[state=checked]:bg-primary'
                            />
                            <Label
                                htmlFor={`hide-zero-${category.code}`}
                                className='text-[7px] md:text-[9px] text-muted-foreground/60 cursor-pointer font-black uppercase tracking-widest select-none hidden sm:block'
                            >
                                {t('warehouse.stock.hideZero')}
                            </Label>
                        </div>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className='p-0 border-t border-dashed border-muted/50'>
                <div className='overflow-x-auto scrollbar-hide'>
                    <Table className='min-w-[600px] md:min-w-0'>
                        <TableHeader className='bg-muted/30 h-12 md:h-14'>
                            <TableRow className='hover:bg-transparent border-b border-dashed'>
                                <TableHead className='w-[120px] md:w-[140px] pl-4 md:pl-8 font-black text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.stock.columns.identifier')}</TableHead>
                                <TableHead className='font-black text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.stock.columns.specDescription')}</TableHead>
                                <TableHead className='w-[140px] md:w-[180px] text-right font-black text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.stock.columns.stockLevel')}</TableHead>
                                <TableHead className='w-[80px] md:w-[100px] text-center pr-4 md:pr-8 font-black text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground/50'>{t('warehouse.stock.columns.action')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items
                                .filter((item) => !hideZero || item.quantity > 0)
                                .map((item) => {
                                    const total = materialTotalStock[item.materialId] || 0
                                    const min = alertThresholds[item.materialId] || 0
                                    const isAlert = min > 0 && total < min

                                    return (
                                        <TableRow key={item.id} className={cn(
                                            'group hover:bg-muted/30 transition-all border-b border-dashed border-muted/50',
                                            isAlert && 'bg-rose-500/3'
                                        )}>
                                            <TableCell className='font-mono text-[9px] md:text-[10px] pl-4 md:pl-8 text-muted-foreground/40 py-2.5 md:py-3 font-black truncate max-w-[100px]'>{item.materialCode}</TableCell>
                                            <TableCell className='py-2.5 md:py-3'>
                                                <div className='font-bold text-slate-700 text-[12px] md:text-[13px] uppercase tracking-tighter transition-transform group-hover:translate-x-1 duration-300 truncate max-w-[200px]'>{item.materialName}</div>
                                                <div className='text-[8px] md:text-[9px] font-black text-muted-foreground/50 mt-1 flex items-center gap-1.5 uppercase tracking-widest truncate max-w-[200px]'>
                                                    <ShieldCheck className='size-2.5 text-emerald-500/40 shrink-0' />
                                                    {item.materialSpec || t('warehouse.stock.noSpec')}
                                                </div>
                                            </TableCell>
                                            <TableCell className='text-right py-2.5 md:py-3'>
                                                <div className='flex flex-col items-end gap-0.5 md:gap-1'>
                                                    <div className={cn(
                                                        'text-sm md:text-base font-black font-mono tracking-tighter',
                                                        total === 0 ? 'text-muted-foreground/20' : isAlert ? 'text-rose-600' : 'text-slate-800'
                                                    )}>
                                                        {total.toLocaleString()} <span className='text-[8px] md:text-[9px] uppercase font-black text-muted-foreground/40 ml-1'>{item.uom}</span>
                                                    </div>
                                                    <div className='text-[8px] font-mono font-black text-primary/40 uppercase tracking-tighter animate-in fade-in slide-in-from-right-1 duration-500'>
                                                        @{item.averageUnitCost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </div>
                                                    {min > 0 ? (
                                                        <div className={cn(
                                                            'text-[7px] md:text-[8px] font-black uppercase tracking-widest flex items-center gap-1 px-1.5 py-0.5 rounded-full border',
                                                            isAlert ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-muted border-muted-foreground/10 text-muted-foreground/40'
                                                        )}>
                                                            {t('warehouse.stock.minLabel', { count: min })}
                                                            {isAlert && <div className='w-1 h-1 rounded-full bg-rose-500 animate-ping shrink-0' />}
                                                        </div>
                                                    ) : (
                                                        <div className='text-[7px] md:text-[8px] font-black uppercase tracking-widest text-muted-foreground/20'>{t('warehouse.stock.noAlarm')}</div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className='text-center pr-4 md:pr-8 py-2.5 md:py-3'>
                                                <Button
                                                    variant='ghost'
                                                    size='icon'
                                                    disabled={!canConfigureThreshold}
                                                    className='size-7 md:size-8 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all active:scale-90'
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
