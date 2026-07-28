import { useEffect, useState } from 'react'
import {
  ArrowLeftRight,
  Barcode,
  CalendarDays,
  Package2,
  PackageCheck,
  RotateCcw,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useSalesExchangeMutations } from '../hooks/use-sales-exchanges'
import type { SalesExchangeDraftRecord } from '../types/sales-exchange-types'
import {
  resolveSalesExchangeLineDisplaySubtitle,
  resolveSalesExchangeLineDisplayTitle,
} from '../utils/sales-exchange-line-display'

type SalesExchangeRecordSpotlightProps = {
  salesExchangeDraftRecord?: SalesExchangeDraftRecord
  isLoading: boolean
  onClearSelection: () => void
}

function getSalesExchangeStatusLabel(status: string) {
  switch (status) {
    case 'Draft':
      return '已创建'
    case 'OldItemPartiallyReceived':
      return '部分旧货已收'
    case 'OldItemReceived':
      return '旧货已收'
    case 'ReplacementPrepared':
      return '待补发'
    case 'ReplacementPartiallyShipped':
      return '部分补发'
    case 'ReplacementShipped':
      return '补发已出'
    case 'Closed':
      return '已关闭'
    case 'Canceled':
      return '已取消'
    default:
      return status || '--'
  }
}

export function SalesExchangeRecordSpotlight({
  salesExchangeDraftRecord,
  isLoading,
  onClearSelection,
}: SalesExchangeRecordSpotlightProps) {
  const { patchOldItemLogisticsMutation, voidReplacementShipmentMutation } =
    useSalesExchangeMutations()
  const [oldItemTrackingNo, setOldItemTrackingNo] = useState(
    salesExchangeDraftRecord?.receivedOldItemTrackingNo ?? ''
  )
  const [voidShipmentId, setVoidShipmentId] = useState<string | null>(null)
  const [voidReason, setVoidReason] = useState('')
  useEffect(() => {
    setOldItemTrackingNo(
      salesExchangeDraftRecord?.receivedOldItemTrackingNo ?? ''
    )
  }, [
    salesExchangeDraftRecord?.id,
    salesExchangeDraftRecord?.receivedOldItemTrackingNo,
  ])

  if (isLoading) {
    return (
      <Card className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 shadow-none'>
        <CardContent className='px-5 py-8 text-center text-sm font-bold text-muted-foreground'>
          加载换货记录中...
        </CardContent>
      </Card>
    )
  }

  if (!salesExchangeDraftRecord) {
    return (
      <Card className='rounded-2xl border border-dashed border-border/70 bg-background/60 shadow-none'>
        <CardContent className='px-5 py-8 text-center'>
          <p className='text-sm font-black text-foreground'>尚未选择换货记录</p>
          <p className='mt-2 text-xs leading-6 font-bold text-muted-foreground'>
            选择订单行的换货记录后，这里会集中展示条码、入库和补发流水。
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 shadow-none'>
      <CardHeader className='flex flex-row items-start justify-between gap-4 px-5 py-4'>
        <div>
          <CardTitle className='text-sm font-black tracking-tight text-foreground'>
            换货记录详情
          </CardTitle>
          <p className='mt-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
            {salesExchangeDraftRecord.exchangeNo}
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onClearSelection}
          className='rounded-full text-[10px] font-black tracking-widest uppercase'
        >
          关闭
        </Button>
      </CardHeader>
      <CardContent className='space-y-4 px-5 pb-5'>
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              <ArrowLeftRight className='size-3.5' />
              来源订单
            </div>
            <p className='text-xs font-black text-foreground'>
              {salesExchangeDraftRecord.sourceSalesOrderNo}
            </p>
          </div>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              <CalendarDays className='size-3.5' />
              预计补发
            </div>
            <p className='text-xs font-black text-foreground'>
              {salesExchangeDraftRecord.expectedReplacementDate || '--'}
            </p>
          </div>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              <Package2 className='size-3.5' />
              旧货物流
            </div>
            <p className='text-xs font-black text-foreground'>
              {salesExchangeDraftRecord.receivedOldItemTrackingNo || '--'}
            </p>
          </div>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              <Package2 className='size-3.5' />
              补发物流
            </div>
            <p className='text-xs font-black text-foreground'>
              {salesExchangeDraftRecord.replacementTrackingNo || '--'}
            </p>
          </div>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              <PackageCheck className='size-3.5' />
              状态
            </div>
            <p className='text-xs font-black text-foreground'>
              {getSalesExchangeStatusLabel(salesExchangeDraftRecord.status)}
            </p>
          </div>
        </div>

        <div className='rounded-[20px] border border-dashed border-border/70 bg-background/70 p-4'>
          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            换货原因
          </p>
          <p className='mt-2 text-xs leading-6 font-bold text-foreground'>
            {salesExchangeDraftRecord.exchangeReason || '--'}
          </p>
        </div>

        <div className='rounded-[20px] border border-dashed border-border/70 bg-background/80 p-4'>
          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            补录旧货运单号
          </p>
          <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
            <Input
              value={oldItemTrackingNo}
              onChange={(event) => setOldItemTrackingNo(event.target.value)}
              placeholder='客户寄回后可补录'
              className='h-10 rounded-full bg-background font-bold'
            />
            <Button
              type='button'
              size='sm'
              className='h-10 shrink-0 rounded-full px-4 text-[10px] font-black tracking-widest uppercase'
              disabled={patchOldItemLogisticsMutation.isPending}
              onClick={() =>
                patchOldItemLogisticsMutation.mutate({
                  salesExchangeId: salesExchangeDraftRecord.id,
                  payload: {
                    receivedOldItemTrackingNo:
                      oldItemTrackingNo.trim() || undefined,
                  },
                })
              }
            >
              {patchOldItemLogisticsMutation.isPending ? '保存中' : '保存'}
            </Button>
          </div>
        </div>

        <div className='space-y-3'>
          {salesExchangeDraftRecord.lines.map((lineDraft) => (
            <div
              key={lineDraft.lineDraftId}
              className='rounded-[20px] border border-dashed border-border/70 bg-background/80 p-4'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-black text-foreground'>
                    行 {lineDraft.lineNo} /{' '}
                    {resolveSalesExchangeLineDisplayTitle(lineDraft)}
                  </p>
                  <p className='mt-1 truncate text-xs font-bold text-muted-foreground'>
                    {resolveSalesExchangeLineDisplaySubtitle(lineDraft)}
                  </p>
                </div>
                <span className='rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-600 uppercase'>
                  {lineDraft.exchangeQuantity.toLocaleString()} {lineDraft.uom}
                </span>
              </div>

              <div className='mt-3 grid gap-2 text-[10px] font-bold text-muted-foreground sm:grid-cols-3'>
                <span>
                  旧货已收 {lineDraft.oldItemReceivedQuantity.toLocaleString()}{' '}
                  {lineDraft.uom}
                </span>
                <span>
                  补发已出{' '}
                  {lineDraft.replacementShippedQuantity.toLocaleString()}{' '}
                  {lineDraft.uom}
                </span>
                <span className='text-foreground'>
                  状态 {getSalesExchangeStatusLabel(lineDraft.status)}
                </span>
              </div>

              <div className='mt-3 flex flex-wrap gap-2'>
                {lineDraft.recognizedLabelCodes.length === 0 ? (
                  <span className='inline-flex items-center rounded-full border border-dashed border-muted/50 px-2.5 py-1 text-[10px] font-black text-muted-foreground'>
                    暂无标签码
                  </span>
                ) : (
                  lineDraft.recognizedLabelCodes.map((labelCode) => {
                    const isReplacement = labelCode.side === 'REPLACEMENT_ITEM'
                    return (
                      <span
                        key={`${labelCode.normalizedLabelCode}-${labelCode.side ?? 'OLD_ITEM'}`}
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black ${
                          isReplacement
                            ? 'border-sky-500/20 bg-sky-500/10 text-sky-700'
                            : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
                        }`}
                      >
                        <Barcode className='mr-1 size-3' />
                        {isReplacement ? '补发' : '旧货'} /{' '}
                        {labelCode.normalizedLabelCode}
                      </span>
                    )
                  })
                )}
              </div>
            </div>
          ))}
        </div>

        {salesExchangeDraftRecord.unmatchedLabelCodes.length > 0 ? (
          <div className='rounded-[20px] border border-dashed border-amber-500/30 bg-amber-500/8 p-4'>
            <p className='text-xs font-black text-amber-700'>
              未自动匹配标签码
            </p>
            <div className='mt-3 flex flex-wrap gap-2'>
              {salesExchangeDraftRecord.unmatchedLabelCodes.map((labelCode) => (
                <span
                  key={labelCode.normalizedLabelCode}
                  className='rounded-full border border-amber-500/20 bg-background/80 px-2.5 py-1 text-[10px] font-black text-amber-700'
                >
                  {labelCode.normalizedLabelCode}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className='rounded-[20px] border border-dashed border-border/70 bg-background/80 p-4'>
          <div className='flex items-center gap-2 text-xs font-black text-foreground'>
            <Truck className='size-4 text-sky-700' />
            执行流水
          </div>
          <div className='mt-3 space-y-2'>
            {salesExchangeDraftRecord.inboundRecords.map((record) => (
              <div
                key={`inbound-${record.id}`}
                className='flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-500/5 px-3 py-2 text-[10px] font-bold'
              >
                <span className='text-emerald-700'>
                  旧货入库 {record.quantity.toLocaleString()}
                </span>
                <span className='text-muted-foreground'>
                  {record.batchNo || '--'} / {record.inboundDate.slice(0, 10)}
                </span>
              </div>
            ))}
            {salesExchangeDraftRecord.shipmentRecords.map((record) => (
              <div
                key={`shipment-${record.id}`}
                className='flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sky-500/5 px-3 py-2 text-[10px] font-bold'
              >
                <div className='min-w-0'>
                  <p
                    className={
                      record.status === 'VOID'
                        ? 'text-muted-foreground line-through'
                        : 'text-sky-700'
                    }
                  >
                    补发出库 {record.quantity.toLocaleString()} /{' '}
                    {record.materialCode || '--'}
                  </p>
                  <p className='mt-1 text-muted-foreground'>
                    {record.batchNo || '--'} / {record.trackingNo || '无运单号'}{' '}
                    / {record.shipmentDate.slice(0, 10)} / {record.status}
                  </p>
                </div>
                {record.status === 'COMMITTED' ? (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-8 rounded-full border-red-500/20 px-3 text-[10px] font-black text-red-600'
                    disabled={voidReplacementShipmentMutation.isPending}
                    onClick={() => {
                      setVoidShipmentId(record.id)
                      setVoidReason('')
                    }}
                  >
                    <RotateCcw className='mr-1 size-3.5' />
                    冲销
                  </Button>
                ) : null}
              </div>
            ))}
            {salesExchangeDraftRecord.inboundRecords.length === 0 &&
            salesExchangeDraftRecord.shipmentRecords.length === 0 ? (
              <p className='text-[10px] font-bold text-muted-foreground'>
                暂无入库或补发流水
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
      <ConfirmDialog
        open={Boolean(voidShipmentId)}
        onOpenChange={(open) => {
          if (!open && !voidReplacementShipmentMutation.isPending) {
            setVoidShipmentId(null)
            setVoidReason('')
          }
        }}
        title='确认冲销这笔换货补发？'
        desc='系统会将原补发流水标记为 VOID，回滚对应库存，并重新计算换货行状态；不会回退销售订单已交付数量。'
        confirmText={
          voidReplacementShipmentMutation.isPending ? '处理中' : '确认冲销'
        }
        destructive
        disabled={!voidReason.trim() || !voidShipmentId}
        isLoading={voidReplacementShipmentMutation.isPending}
        handleConfirm={() => {
          if (!voidShipmentId || !salesExchangeDraftRecord) return
          voidReplacementShipmentMutation.mutate(
            {
              salesExchangeId: salesExchangeDraftRecord.id,
              shipmentId: voidShipmentId,
              payload: { reason: voidReason.trim() },
            },
            {
              onSuccess: () => {
                setVoidShipmentId(null)
                setVoidReason('')
              },
            }
          )
        }}
      >
        <Input
          value={voidReason}
          onChange={(event) => setVoidReason(event.target.value)}
          placeholder='请输入冲销原因'
          className='h-11 rounded-full font-bold'
        />
      </ConfirmDialog>
    </Card>
  )
}
