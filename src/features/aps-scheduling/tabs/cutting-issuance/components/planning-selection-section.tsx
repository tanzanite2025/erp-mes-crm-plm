import { CalendarClock, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CuttingIssuanceOrder, CuttingIssuanceTemplate } from '../types'
import {
  APS_BADGE_CLASS,
  APS_CARD_SHELL_CLASS,
  APS_INPUT_CLASS,
  APS_KICKER_CLASS,
} from '../ui-classes'
import { formatDateLabel } from '../utils'

type PlanningSelectionSectionProps = {
  isLoading: boolean
  orders: CuttingIssuanceOrder[]
  templates: CuttingIssuanceTemplate[]
  selectedOrder: CuttingIssuanceOrder | undefined
  orderId: string
  lineNo: string
  templateId: string
  preferredBatchSizeInput: string
  templateMatchHint?: string
  onOrderIdChange: (value: string) => void
  onLineNoChange: (value: string) => void
  onPreferredBatchSizeInputChange: (value: string) => void
}

export function PlanningSelectionSection(props: PlanningSelectionSectionProps) {
  const {
    isLoading,
    orders,
    templates,
    selectedOrder,
    orderId,
    lineNo,
    templateId,
    preferredBatchSizeInput,
    templateMatchHint,
    onOrderIdChange,
    onLineNoChange,
    onPreferredBatchSizeInputChange,
  } = props

  const selectedTemplate = templates.find((template) => template.id === templateId)

  return (
    <section className={`${APS_CARD_SHELL_CLASS} p-3`}>
      <div className='mb-1 flex items-center justify-between gap-3'>
        <div>
          <p className={APS_KICKER_CLASS}>Planning Inputs</p>
          <h3 className='mt-1 text-sm font-black tracking-tight text-foreground'>订单与模板自动匹配</h3>
        </div>
        <span className={APS_BADGE_CLASS}>
          <Lock className='size-3' />
          自动匹配
        </span>
      </div>

      <div className='grid gap-1.5 md:grid-cols-2 xl:grid-cols-5'>
        <div className='space-y-0.5'>
          <p className={APS_KICKER_CLASS}>销售订单</p>
          <Select value={orderId} onValueChange={onOrderIdChange} disabled={isLoading || !orders.length}>
            <SelectTrigger className={`${APS_INPUT_CLASS} w-full`}>
              <SelectValue placeholder='选择订单' />
            </SelectTrigger>
            <SelectContent>
              {orders.map((order) => (
                <SelectItem key={order.id} value={order.id}>
                  {order.orderNo} | {order.customerName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-0.5'>
          <p className={APS_KICKER_CLASS}>订单行</p>
          <Select value={lineNo} onValueChange={onLineNoChange} disabled={!selectedOrder}>
            <SelectTrigger className={`${APS_INPUT_CLASS} w-full`}>
              <SelectValue placeholder='选择订单行' />
            </SelectTrigger>
            <SelectContent>
              {selectedOrder?.lines.map((line) => (
                <SelectItem key={line.lineNo} value={String(line.lineNo)}>
                  第{line.lineNo}行 | {line.productModel} | {line.holeCount || '--'}孔 | {line.quantity}圈
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-0.5'>
          <p className={APS_KICKER_CLASS}>裁纱模板（只读）</p>
          <div className={`${APS_INPUT_CLASS} flex items-center gap-2 px-3 text-sm`}>
            <Lock className='size-4 shrink-0 text-muted-foreground' />
            <span className='truncate font-semibold'>
              {selectedTemplate ? `${selectedTemplate.planName} (${selectedTemplate.version})` : '等待自动匹配'}
            </span>
          </div>
        </div>

        <div className='space-y-0.5'>
          <p className={APS_KICKER_CLASS}>建议每批圈数</p>
          <Input
            type='number'
            min={1}
            className={APS_INPUT_CLASS}
            value={preferredBatchSizeInput}
            onChange={(event) => onPreferredBatchSizeInputChange(event.target.value)}
          />
        </div>

        <div className='space-y-0.5'>
          <p className={APS_KICKER_CLASS}>交期（自动带出）</p>
          <div className={`${APS_INPUT_CLASS} flex items-center gap-2 px-3 text-sm`}>
            <CalendarClock className='size-4 text-muted-foreground' />
            <span>{formatDateLabel(selectedOrder?.deliveryDate)}</span>
          </div>
        </div>
      </div>
      {templateMatchHint ? (
        <p className='mt-1 text-xs text-muted-foreground/70'>{templateMatchHint}</p>
      ) : null}
    </section>
  )
}
