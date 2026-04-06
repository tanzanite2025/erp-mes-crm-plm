import { ImageIcon, Layers, Package, Plus, Scissors, Settings2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import { type Unit } from '@/features/basic-settings/services/unit-service'
import { formatProductDisplayName } from '@/features/engineering/utils/product-utils'
import { type SalesOrderLine } from '../../data/schema'

interface OrderLinesEditorProps {
  lines: SalesOrderLine[]
  products: any[]
  dictEntries: any[]
  units: Unit[]
  drillingOptions: { label: string; value: string }[]
  labelingOptions: { label: string; value: string }[]
  currency?: string
  onAddLine: () => void
  onRemoveLine: (index: number) => void
  onLineChange: (
    index: number,
    field: keyof SalesOrderLine,
    value: any,
    extraData?: Partial<SalesOrderLine>
  ) => void
}

function getCurrencySymbol(currency?: string) {
  if (!currency) return 'CNY '
  switch (currency.toUpperCase()) {
    case 'CNY':
      return 'CNY '
    case 'USD':
      return '$'
    case 'EUR':
      return 'EUR '
    case 'GBP':
      return 'GBP '
    case 'JPY':
      return 'JPY '
    default:
      return `${currency} `
  }
}

export function OrderLinesEditor({
  lines,
  products,
  dictEntries,
  units,
  drillingOptions,
  labelingOptions,
  currency = 'CNY',
  onAddLine,
  onRemoveLine,
  onLineChange,
}: OrderLinesEditorProps) {
  const { t } = useLanguage()
  const symbol = getCurrencySymbol(currency)

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((item) => item.id === productId)
    if (!product) {
      onLineChange(index, 'productId', productId)
      return
    }

    onLineChange(index, 'productId', productId, {
      productModel: product.sku,
      productCode: product.sku,
      specification: formatProductDisplayName(product, dictEntries),
      uom: 'PCS',
    })
  }

  return (
    <section className='space-y-3'>
      <div className='flex items-center justify-between px-1'>
        <div className='flex items-center gap-2'>
          <Package className='size-4 text-primary' />
          <h4 className='text-[11px] font-black uppercase tracking-[0.2em] text-foreground italic'>
            {t('tradingSalesOrder.linesEditor.sectionTitle')}
          </h4>
        </div>
        <Button
          onClick={onAddLine}
          variant='outline'
          size='sm'
          className='h-8 rounded-full border-2 border-dashed px-4 text-[10px] font-black uppercase transition-all hover:bg-primary/5'
        >
          <Plus className='mr-1 size-3' />
          {t('tradingSalesOrder.linesEditor.addLine')}
        </Button>
      </div>

      <div className='hidden overflow-x-auto rounded-[24px] border bg-background/50 shadow-sm md:block'>
        <table className='min-w-[1000px] w-full border-collapse'>
          <thead className='border-b bg-muted/30'>
            <tr className='h-10 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60'>
              <th className='w-[60px] text-center'>{t('tradingSalesOrder.linesEditor.headers.no')}</th>
              <th className='w-[60px] text-center'>{t('tradingSalesOrder.linesEditor.headers.thumb')}</th>
              <th className='px-4 text-left'>{t('tradingSalesOrder.linesEditor.headers.skuModel')}</th>
              <th className='w-[120px] text-center'>{t('tradingSalesOrder.linesEditor.headers.drilling')}</th>
              <th className='w-[120px] text-center'>{t('tradingSalesOrder.linesEditor.headers.labeling')}</th>
              <th className='w-[80px] text-center'>{t('tradingSalesOrder.linesEditor.headers.holes')}</th>
              <th className='w-[100px] text-center'>{t('tradingSalesOrder.linesEditor.headers.qty')}</th>
              <th className='w-[110px] text-center'>{t('tradingSalesOrder.linesEditor.headers.price')}</th>
              <th className='w-[120px] text-center'>{t('tradingSalesOrder.linesEditor.headers.total')}</th>
              <th className='w-[100px] text-center'>{t('tradingSalesOrder.linesEditor.headers.unit')}</th>
              <th className='w-[60px]' />
            </tr>
          </thead>
          <tbody>
            {lines?.map((line, index) => (
              <tr key={index} className='group border-b transition-colors hover:bg-muted/5'>
                <td className='text-center font-mono text-[10px] text-muted-foreground/40'>{line.lineNo}</td>
                <td className='py-2'>
                  <div className='mx-auto flex size-10 items-center justify-center overflow-hidden rounded-lg border bg-muted/20'>
                    {(() => {
                      const product = products.find((item) => item.id === line.productId)
                      return product?.image ? (
                        <img src={product.image} className='size-full object-cover' />
                      ) : (
                        <ImageIcon className='size-4 text-muted-foreground/10' />
                      )
                    })()}
                  </div>
                </td>
                <td className='px-4'>
                  <select
                    className='w-full appearance-none truncate rounded-lg border bg-background/50 px-2 text-[12px] font-bold outline-none focus:ring-1 focus:ring-primary h-9'
                    value={line.productId || ''}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                  >
                    <option value=''>{t('tradingSalesOrder.linesEditor.selectDesktop')}</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {formatProductDisplayName(product, dictEntries)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className='px-2'>
                  <select
                    className='h-8 w-full appearance-none rounded-lg border bg-orange-500/5 px-2 text-center text-[10px] font-bold outline-none focus:ring-1 focus:ring-orange-500'
                    value={line.drillingPlanId || ''}
                    onChange={(e) => onLineChange(index, 'drillingPlanId', e.target.value)}
                  >
                    <option value=''>{t('tradingSalesOrder.linesEditor.drillingDefault')}</option>
                    {drillingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className='px-2'>
                  <select
                    className='h-8 w-full appearance-none rounded-lg border bg-blue-500/5 px-2 text-center text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-500'
                    value={line.labelingPlanId || ''}
                    onChange={(e) => onLineChange(index, 'labelingPlanId', e.target.value)}
                  >
                    <option value=''>{t('tradingSalesOrder.linesEditor.labelingDefault')}</option>
                    {labelingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className='px-2'>
                  <Input
                    type='number'
                    value={line.holeCount || ''}
                    onChange={(e) => onLineChange(index, 'holeCount', Number(e.target.value))}
                    className='h-8 text-center text-[11px] font-bold'
                  />
                </td>
                <td className='px-2'>
                  <Input
                    type='number'
                    value={line.qty}
                    onChange={(e) => onLineChange(index, 'qty', e.target.value)}
                    className='h-9 border-primary/20 text-center text-[12px] font-black'
                  />
                </td>
                <td className='px-2'>
                  <Input
                    type='number'
                    value={line.price}
                    onChange={(e) => onLineChange(index, 'price', e.target.value)}
                    className='h-9 border-amber-500/20 text-center text-[12px] font-black'
                  />
                </td>
                <td className='text-center text-xs font-black tabular-nums text-primary'>
                  {symbol}
                  {Number(line.amount).toLocaleString()}
                </td>
                <td className='px-2'>
                  <select
                    className='h-8 w-full rounded-lg border bg-background px-2 text-center text-[10px] font-bold'
                    value={line.uom}
                    onChange={(e) => onLineChange(index, 'uom', e.target.value)}
                  >
                    {units
                      .filter((unit) => unit.status === 'active')
                      .map((unit) => (
                        <option key={unit.id} value={unit.code}>
                          {unit.code}
                        </option>
                      ))}
                  </select>
                </td>
                <td className='text-center'>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => onRemoveLine(index)}
                    className='size-8 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100'
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className='space-y-4 md:hidden'>
        {lines?.map((line, index) => (
          <div key={index} className='relative rounded-[24px] border-2 border-dashed bg-muted/5 p-4 animate-in fade-in slide-in-from-bottom-2'>
            <div className='mb-4 flex items-start gap-4'>
              <div className='flex size-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-background'>
                {(() => {
                  const product = products.find((item) => item.id === line.productId)
                  return product?.image ? (
                    <img src={product.image} className='size-full object-cover' />
                  ) : (
                    <ImageIcon className='size-6 text-muted-foreground/10' />
                  )
                })()}
              </div>
              <div className='min-w-0 flex-1 space-y-1.5'>
                <span className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 italic leading-none'>
                  {t('tradingSalesOrder.linesEditor.lineItem')} #{line.lineNo}
                </span>
                <select
                  className='h-11 w-full appearance-none truncate rounded-xl border-none bg-background px-3 text-[13px] font-bold shadow-sm'
                  value={line.productId || ''}
                  onChange={(e) => handleProductChange(index, e.target.value)}
                >
                  <option value=''>{t('tradingSalesOrder.linesEditor.selectProduct')}</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {formatProductDisplayName(product, dictEntries)}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => onRemoveLine(index)}
                className='absolute -right-2 -top-2 size-8 rounded-full border bg-background text-destructive/40 shadow-sm hover:text-destructive'
              >
                <Trash2 className='size-4' />
              </Button>
            </div>

            <div className='mb-4 grid grid-cols-2 gap-3'>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 pl-1'>
                  <Scissors className='size-2.5 text-orange-500' />
                  <span className='text-[7px] font-black uppercase tracking-tighter text-muted-foreground italic'>
                    {t('tradingSalesOrder.linesEditor.drillingPlan')}
                  </span>
                </div>
                <select
                  className='h-10 w-full appearance-none rounded-xl border border-orange-200/50 bg-orange-50/50 px-3 text-[11px] font-bold'
                  value={line.drillingPlanId || ''}
                  onChange={(e) => onLineChange(index, 'drillingPlanId', e.target.value)}
                >
                  <option value=''>{t('tradingSalesOrder.linesEditor.defaultPlan')}</option>
                  {drillingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 pl-1'>
                  <Layers className='size-2.5 text-blue-500' />
                  <span className='text-[7px] font-black uppercase tracking-tighter text-muted-foreground italic'>
                    {t('tradingSalesOrder.linesEditor.labelingPlan')}
                  </span>
                </div>
                <select
                  className='h-10 w-full appearance-none rounded-xl border border-blue-200/50 bg-blue-50/50 px-3 text-[11px] font-bold'
                  value={line.labelingPlanId || ''}
                  onChange={(e) => onLineChange(index, 'labelingPlanId', e.target.value)}
                >
                  <option value=''>{t('tradingSalesOrder.linesEditor.defaultLabeling')}</option>
                  {labelingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 pl-1'>
                  <Settings2 className='size-2.5 text-slate-500' />
                  <span className='text-[7px] font-black uppercase tracking-tighter text-muted-foreground italic'>
                    {t('tradingSalesOrder.linesEditor.holeCount')}
                  </span>
                </div>
                <Input
                  type='number'
                  value={line.holeCount || ''}
                  onChange={(e) => onLineChange(index, 'holeCount', Number(e.target.value))}
                  className='h-10 rounded-xl text-center text-[12px] font-bold'
                  placeholder={t('tradingSalesOrder.linesEditor.holeCount')}
                />
              </div>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 pl-1'>
                  <Package className='size-2.5 text-slate-500' />
                  <span className='text-[7px] font-black uppercase tracking-tighter text-muted-foreground italic'>
                    {t('tradingSalesOrder.linesEditor.unit')}
                  </span>
                </div>
                <select
                  className='h-10 w-full appearance-none rounded-xl border bg-background px-3 text-[11px] font-bold'
                  value={line.uom}
                  onChange={(e) => onLineChange(index, 'uom', e.target.value)}
                >
                  {units
                    .filter((unit) => unit.status === 'active')
                    .map((unit) => (
                      <option key={unit.id} value={unit.code}>
                        {unit.code}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className='grid grid-cols-2 items-end gap-3 border-t border-dashed border-muted-foreground/10 pt-3'>
              <div className='grid grid-cols-2 gap-2'>
                <div className='space-y-1'>
                  <span className='pl-1 text-[7px] font-black text-muted-foreground/40'>
                    {t('tradingSalesOrder.linesEditor.quantity')}
                  </span>
                  <Input
                    type='number'
                    value={line.qty}
                    onChange={(e) => onLineChange(index, 'qty', e.target.value)}
                    className='h-11 rounded-xl border-primary/30 bg-primary/5 text-center text-[13px] font-black shadow-sm focus:ring-primary'
                  />
                </div>
                <div className='space-y-1'>
                  <span className='pl-1 text-[7px] font-black text-muted-foreground/40'>
                    {t('tradingSalesOrder.linesEditor.price')}
                  </span>
                  <Input
                    type='number'
                    value={line.price}
                    onChange={(e) => onLineChange(index, 'price', e.target.value)}
                    className='h-11 rounded-xl border-amber-500/30 bg-amber-500/5 text-center text-[13px] font-black'
                  />
                </div>
              </div>
              <div className='flex flex-col items-end pb-1.5'>
                <span className='mb-1 text-[7px] font-black uppercase tracking-widest text-primary/40 italic leading-none'>
                  {t('tradingSalesOrder.linesEditor.rowTotal')}
                </span>
                <div className='text-lg font-black italic tracking-tighter text-primary'>
                  <span className='mr-0.5 text-[10px]'>{symbol}</span>
                  {Number(line.amount).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}

        {(!lines || lines.length === 0) && (
          <div className='flex flex-col items-center gap-4 rounded-[32px] border-2 border-dashed bg-muted/5 py-20 text-center'>
            <Package className='size-8 text-muted-foreground/10' />
            <span className='text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 italic'>
              {t('tradingSalesOrder.linesEditor.noLines')}
            </span>
            <Button onClick={onAddLine} className='h-8 rounded-full px-6 text-[10px] font-black uppercase tracking-widest'>
              {t('tradingSalesOrder.linesEditor.addFirst')}
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
