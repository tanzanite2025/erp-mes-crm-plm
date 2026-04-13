import { ArrowRightLeft, FileDown, MessageCircleMore, Save } from 'lucide-react'
import { useMemo } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import type { QuoteDetail } from '@/features/quotes/data/quote-detail'

type QuoteWorkspaceDialogProps = {
  open: boolean
  mode: 'create' | 'detail'
  detail: QuoteDetail | null
  isLoading: boolean
  detailError: string | null
  createEditor?: React.ReactNode
  editedAmountLabel: string
  editedRequirements: string
  onOpenChange: (open: boolean) => void
  onAmountLabelChange: (value: string) => void
  onRequirementsChange: (value: string) => void
  onExportPdf: () => void
  onSave: () => void
  isSaving: boolean
  saveError: string | null
  onConvert: () => void
  isConverting: boolean
  convertError: string | null
}

export function QuoteWorkspaceDialog({
  open,
  mode,
  detail,
  isLoading,
  detailError,
  createEditor,
  editedAmountLabel,
  editedRequirements,
  onOpenChange,
  onAmountLabelChange,
  onRequirementsChange,
  onExportPdf,
  onSave,
  isSaving,
  saveError,
  onConvert,
  isConverting,
  convertError,
}: QuoteWorkspaceDialogProps) {
  const isCreateMode = mode === 'create'
  const transferAction = useMemo(() => {
    if (detail?.wechat) {
      return {
        label: '转发微信',
        helper: `客户微信：${detail.wechat}`,
        missing: false,
      }
    }

    if (detail?.whatsapp) {
      return {
        label: '转发 WhatsApp',
        helper: `客户 WhatsApp：${detail.whatsapp}`,
        missing: false,
      }
    }

    return {
      label: '转发客户',
      helper: '客户未留联系方式',
      missing: true,
    }
  }, [detail])

  const handleTransferClick = () => {
    if (transferAction.missing) {
      window.alert('客户未留联系方式')
      return
    }

    window.alert(`${transferAction.label}能力待接入，当前已读取真实联系方式：${transferAction.helper}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[92vh] w-[96vw] max-w-[96vw] sm:max-w-[96vw] xl:w-[1400px] xl:max-w-[1400px] overflow-hidden rounded-3xl border border-primary/20 p-0'>
        <DialogHeader className='border-b border-dashed border-border/60 px-6 py-5'>
          <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
            <div className='space-y-2'>
              <DialogTitle className='text-xl font-black italic tracking-tight'>报价工作台</DialogTitle>
              <DialogDescription>
                {isCreateMode
                  ? '在同一个工作台中完成报价新建，并在创建成功后继续转发、导出与转单。'
                  : '在一个弹窗里完成报价查看、局部编辑、导出 PDF、客户转发与转正式销售订单等现场高频动作。'}
              </DialogDescription>
            </div>
            {detail && !isCreateMode ? (
              <div className='flex flex-wrap gap-2'>
                <Badge variant='outline'>{detail.quoteNo}</Badge>
                <Badge variant='secondary'>{detail.status}</Badge>
                <Badge variant='outline'>{detail.type}</Badge>
              </div>
            ) : null}

            {!isLoading && !detail && !detailError && !isCreateMode ? (
              <div className='rounded-2xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground'>
                未加载到报价详情，请返回列表后重新打开该报价。
              </div>
            ) : null}
          </div>
        </DialogHeader>

        <div className={`min-h-0 max-h-[calc(92vh-150px)] overflow-hidden ${isCreateMode ? 'flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_320px]' : 'grid lg:grid-cols-[minmax(0,1.25fr)_360px]'}`}>
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

            {isCreateMode ? createEditor ?? null : null}

            {!isLoading && detail && !isCreateMode ? (
              <div className='space-y-5'>
                <section className='grid gap-4 rounded-2xl border border-dashed border-border/70 bg-background/80 p-5 md:grid-cols-2 xl:grid-cols-4'>
                  <div>
                    <p className='text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground'>客户</p>
                    <p className='mt-2 text-sm font-bold text-foreground'>{detail.customerName || '—'}</p>
                  </div>
                  <div>
                    <p className='text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground'>下单日期</p>
                    <p className='mt-2 text-sm font-bold text-foreground'>{detail.orderDate || '—'}</p>
                  </div>
                  <div>
                    <p className='text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground'>交期</p>
                    <p className='mt-2 text-sm font-bold text-foreground'>{detail.deliveryDate || '—'}</p>
                  </div>
                  <div>
                    <p className='text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground'>负责人</p>
                    <p className='mt-2 text-sm font-bold text-foreground'>{detail.ownerName || '—'}</p>
                  </div>
                </section>

                <section className='rounded-2xl border border-dashed border-border/70 bg-background/80 p-5'>
                  <div className='flex items-center justify-between'>
                    <p className='text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground'>金额与账期</p>
                    <Badge variant='outline'>{detail.currency || 'CNY'}</Badge>
                  </div>
                  <div className='mt-4 grid gap-4 md:grid-cols-3'>
                    <div>
                      <p className='text-xs text-muted-foreground'>报价金额</p>
                      <Input className='mt-2' value={editedAmountLabel} onChange={(event) => onAmountLabelChange(event.target.value)} />
                    </div>
                    <div>
                      <p className='text-xs text-muted-foreground'>数量汇总</p>
                      <p className='mt-3 text-sm font-bold text-foreground'>{detail.quantityLabel || '—'}</p>
                    </div>
                    <div>
                      <p className='text-xs text-muted-foreground'>付款方式 / 账期</p>
                      <p className='mt-3 text-sm font-bold text-foreground'>{detail.paymentMethodName || '—'} / {detail.paymentTermName || '—'}</p>
                    </div>
                  </div>
                </section>

                <section className='rounded-2xl border border-dashed border-border/70 bg-background/80 p-5'>
                  <p className='text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground'>需求说明</p>
                  <Input className='mt-4' value={editedRequirements} onChange={(event) => onRequirementsChange(event.target.value)} />
                </section>

                <section className='rounded-2xl border border-dashed border-border/70 bg-background/80 p-5'>
                  <p className='text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground'>明细摘要</p>
                  <div className='mt-4 space-y-3'>
                    {detail.lines.map((line) => (
                      <div key={line.id} className='rounded-2xl border border-dashed border-border/60 bg-muted/10 p-4'>
                        <div className='flex items-center justify-between gap-3'>
                          <div>
                            <p className='text-sm font-bold text-foreground'>{line.productModel || '未命名产品'} / {line.productCode || '—'}</p>
                            <p className='mt-1 text-xs text-muted-foreground'>{line.specification || '无规格说明'}</p>
                          </div>
                          <Badge variant='outline'>#{line.lineNo}</Badge>
                        </div>
                        <div className='mt-3 grid gap-3 text-sm text-foreground md:grid-cols-4'>
                          <p>数量：{line.qty}</p>
                          <p>单价：{line.price}</p>
                          <p>金额：{line.amount}</p>
                          <p>单位：{line.uom || '—'}</p>
                        </div>
                        <p className='mt-2 text-xs text-muted-foreground'>{line.note || '无备注'}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}
          </div>

          <div className={`bg-muted/10 px-6 py-5 ${isCreateMode ? 'border-t border-dashed border-border/60 xl:border-l xl:border-t-0' : 'border-t border-dashed border-border/60 lg:border-t-0 lg:border-l'}`}>
            <div className='space-y-4'>
              <Button className='w-full justify-start rounded-full' size='lg' onClick={onSave} disabled={isSaving || (!detail && !isCreateMode)}>
                <Save className='size-4' />
                {isSaving ? (isCreateMode ? '正在创建报价…' : '正在保存报价…') : isCreateMode ? '创建报价' : '保存当前报价'}
              </Button>
              <Button className='w-full justify-start rounded-full' size='lg' variant='outline' onClick={onExportPdf} disabled={isCreateMode || !detail}>
                <FileDown className='size-4' />
                一键保存 PDF
              </Button>
              <Button className='w-full justify-start rounded-full' size='lg' variant='outline' onClick={handleTransferClick} disabled={isCreateMode || !detail}>
                <MessageCircleMore className='size-4' />
                {transferAction.label}
              </Button>
              <p className='px-1 text-xs text-muted-foreground'>{transferAction.helper}</p>
              <Button className='w-full justify-start rounded-full' size='lg' variant='outline' onClick={onConvert} disabled={isConverting || isCreateMode || !detail}>
                <ArrowRightLeft className='size-4' />
                {isConverting ? '正在转正式销售订单…' : '转正式销售订单'}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className='border-t border-dashed border-border/60 px-6 py-4'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button onClick={onSave} disabled={isSaving || (!detail && !isCreateMode)}>
            {isSaving ? (isCreateMode ? '正在创建…' : '正在保存…') : isCreateMode ? '创建并继续处理' : '保存并继续处理'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
