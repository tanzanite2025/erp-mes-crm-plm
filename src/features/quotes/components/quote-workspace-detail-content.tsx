import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { QuoteDetail } from '@/features/quotes/data/quote-detail'

type QuoteWorkspaceDetailContentProps = {
  detail: QuoteDetail | null
  isLoading: boolean
  detailError: string | null
  saveError: string | null
  convertError: string | null
  editedAmountLabel: string
  editedRequirements: string
  onAmountLabelChange: (value: string) => void
  onRequirementsChange: (value: string) => void
}

export function QuoteWorkspaceDetailContent({
  detail,
  isLoading,
  detailError,
  saveError,
  convertError,
  editedAmountLabel,
  editedRequirements,
  onAmountLabelChange,
  onRequirementsChange,
}: QuoteWorkspaceDetailContentProps) {
  return (
    <div className='min-w-0 overflow-y-auto px-6 py-5'>
      {isLoading ? (
        <div className='rounded-2xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground'>
          正在加载报价详情…
        </div>
      ) : null}

      {!isLoading && detailError ? (
        <Alert>
          <AlertDescription>{detailError}</AlertDescription>
        </Alert>
      ) : null}

      {saveError ? (
        <Alert>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      ) : null}

      {convertError ? (
        <Alert>
          <AlertDescription>{convertError}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && detail ? (
        <div className='space-y-5'>
          <section className='grid gap-4 rounded-2xl border border-dashed border-border/70 bg-background/80 p-5 md:grid-cols-2 xl:grid-cols-4'>
            <div>
              <p className='text-[11px] font-black tracking-[0.18em] text-muted-foreground uppercase'>
                客户
              </p>
              <p className='mt-2 text-sm font-bold text-foreground'>
                {detail.customerName || '—'}
              </p>
            </div>
            <div>
              <p className='text-[11px] font-black tracking-[0.18em] text-muted-foreground uppercase'>
                下单日期
              </p>
              <p className='mt-2 text-sm font-bold text-foreground'>
                {detail.orderDate || '—'}
              </p>
            </div>
            <div>
              <p className='text-[11px] font-black tracking-[0.18em] text-muted-foreground uppercase'>
                交期
              </p>
              <p className='mt-2 text-sm font-bold text-foreground'>
                {detail.deliveryDate || '—'}
              </p>
            </div>
            <div>
              <p className='text-[11px] font-black tracking-[0.18em] text-muted-foreground uppercase'>
                负责人
              </p>
              <p className='mt-2 text-sm font-bold text-foreground'>
                {detail.ownerName || '—'}
              </p>
            </div>
          </section>

          <section className='rounded-2xl border border-dashed border-border/70 bg-background/80 p-5'>
            <div className='flex items-center justify-between'>
              <p className='text-[11px] font-black tracking-[0.18em] text-muted-foreground uppercase'>
                金额与账期
              </p>
              <Badge variant='outline'>{detail.currency || 'CNY'}</Badge>
            </div>
            <div className='mt-4 grid gap-4 md:grid-cols-3'>
              <div>
                <p className='text-xs text-muted-foreground'>报价金额</p>
                <Input
                  className='mt-2'
                  value={editedAmountLabel}
                  onChange={(event) => onAmountLabelChange(event.target.value)}
                />
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>数量汇总</p>
                <p className='mt-3 text-sm font-bold text-foreground'>
                  {detail.quantityLabel || '—'}
                </p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>付款方式 / 账期</p>
                <p className='mt-3 text-sm font-bold text-foreground'>
                  {detail.paymentMethodName || '—'} /{' '}
                  {detail.paymentTermName || '—'}
                </p>
              </div>
            </div>
          </section>

          <section className='rounded-2xl border border-dashed border-border/70 bg-background/80 p-5'>
            <p className='text-[11px] font-black tracking-[0.18em] text-muted-foreground uppercase'>
              需求说明
            </p>
            <Input
              className='mt-4'
              value={editedRequirements}
              onChange={(event) => onRequirementsChange(event.target.value)}
            />
          </section>

          <section className='rounded-2xl border border-dashed border-border/70 bg-background/80 p-5'>
            <p className='text-[11px] font-black tracking-[0.18em] text-muted-foreground uppercase'>
              明细摘要
            </p>
            <div className='mt-4 space-y-3'>
              {detail.lines.map((line) => (
                <div
                  key={line.id}
                  className='rounded-2xl border border-dashed border-border/60 bg-muted/10 p-4'
                >
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm font-bold text-foreground'>
                        {line.productModel || '未命名产品'} /{' '}
                        {line.productCode || '—'}
                      </p>
                      <p className='mt-1 text-xs text-muted-foreground'>
                        {line.specification || '无规格说明'}
                      </p>
                    </div>
                    <Badge variant='outline'>#{line.lineNo}</Badge>
                  </div>
                  <div className='mt-3 grid gap-3 text-sm text-foreground md:grid-cols-4'>
                    <p>数量：{line.qty}</p>
                    <p>单价：{line.price}</p>
                    <p>金额：{line.amount}</p>
                    <p>单位：{line.uom || '—'}</p>
                  </div>
                  <p className='mt-2 text-xs text-muted-foreground'>
                    {line.note || '无备注'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
