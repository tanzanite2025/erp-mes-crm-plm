import { CalendarClock, Lock, WandSparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/context/language-provider'
import type { CuttingIssuanceOrder, CuttingIssuanceTemplate } from '../types'
import {
  APS_BADGE_CLASS,
  APS_INPUT_CLASS,
  APS_KICKER_CLASS,
  APS_PRIMARY_BUTTON_CLASS,
  APS_PRIMARY_SECTION_CLASS,
  APS_PRIMARY_SECTION_HEADER_CLASS,
  APS_PRIMARY_SECTION_MARKER_CLASS,
  APS_SECTION_HEADER_CLASS,
  APS_SECTION_MARKER_CLASS,
} from '../ui-classes'
import { formatDateLabel } from '../utils'

type PlanningSelectionSectionProps = {
  isLoading: boolean
  isSubmitting: boolean
  canCreateExecution: boolean
  orders: CuttingIssuanceOrder[]
  templates: CuttingIssuanceTemplate[]
  selectedOrder: CuttingIssuanceOrder | undefined
  orderId: string
  lineNo: string
  templateId: string
  templateMatchHint?: string
  onOrderIdChange: (value: string) => void
  onLineNoChange: (value: string) => void
  onCreateExecution: () => void
}

export function PlanningSelectionSection(props: PlanningSelectionSectionProps) {
  const { t, locale } = useLanguage()
  const {
    isLoading,
    isSubmitting,
    canCreateExecution,
    orders,
    templates,
    selectedOrder,
    orderId,
    lineNo,
    templateId,
    templateMatchHint,
    onOrderIdChange,
    onLineNoChange,
    onCreateExecution,
  } = props

  const selectedTemplate = templates.find((template) => template.id === templateId)

  return (
    <section className={`${APS_PRIMARY_SECTION_CLASS} p-3`}>
      <div
        className={`${APS_SECTION_HEADER_CLASS} ${APS_PRIMARY_SECTION_HEADER_CLASS} mb-3 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}
      >
        <div className='flex items-start gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'>
            <WandSparkles className='size-4' />
          </div>
          <div>
            <span className={`${APS_SECTION_MARKER_CLASS} ${APS_PRIMARY_SECTION_MARKER_CLASS}`}>
              {t('apsScheduling.cuttingIssuance.planning.kicker')}
            </span>
            <h3 className='mt-2 text-base font-black tracking-tight text-slate-950'>
              {t('apsScheduling.cuttingIssuance.planning.title')}
            </h3>
            <p className='mt-1 text-xs font-medium text-slate-600/85'>
              {t('apsScheduling.cuttingIssuance.header.description')}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <span className={APS_BADGE_CLASS}>
            <Lock className='size-3' />
            {t('apsScheduling.cuttingIssuance.planning.badge')}
          </span>
          <Button
            className={APS_PRIMARY_BUTTON_CLASS}
            onClick={onCreateExecution}
            disabled={!canCreateExecution || isSubmitting}
          >
            {isSubmitting
              ? t('apsScheduling.cuttingIssuance.planning.submitting')
              : t('apsScheduling.cuttingIssuance.planning.submit')}
          </Button>
        </div>
      </div>

      <div className='grid gap-1.5 md:grid-cols-2 xl:grid-cols-4'>
        <div className='space-y-0.5'>
          <p className={APS_KICKER_CLASS}>{t('apsScheduling.cuttingIssuance.planning.orderLabel')}</p>
          <Select value={orderId} onValueChange={onOrderIdChange} disabled={isLoading || !orders.length}>
            <SelectTrigger className={`${APS_INPUT_CLASS} w-full`}>
              <SelectValue placeholder={t('apsScheduling.cuttingIssuance.planning.orderPlaceholder')} />
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
          <p className={APS_KICKER_CLASS}>{t('apsScheduling.cuttingIssuance.planning.lineLabel')}</p>
          <Select value={lineNo} onValueChange={onLineNoChange} disabled={!selectedOrder}>
            <SelectTrigger className={`${APS_INPUT_CLASS} w-full`}>
              <SelectValue placeholder={t('apsScheduling.cuttingIssuance.planning.linePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {selectedOrder?.lines.map((line) => (
                <SelectItem key={line.lineNo} value={String(line.lineNo)}>
                  {t('apsScheduling.cuttingIssuance.planning.lineOption', {
                    lineNo: line.lineNo,
                    productModel: line.productModel,
                    holeCount: line.holeCount || '--',
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-0.5'>
          <p className={APS_KICKER_CLASS}>{t('apsScheduling.cuttingIssuance.planning.templateLabel')}</p>
          <div className={`${APS_INPUT_CLASS} flex items-center gap-2 px-3 text-sm`}>
            <Lock className='size-4 shrink-0 text-muted-foreground' />
            <span className='truncate font-semibold'>
              {selectedTemplate
                ? `${selectedTemplate.planName} (${selectedTemplate.version})`
                : t('apsScheduling.cuttingIssuance.planning.templateWaiting')}
            </span>
          </div>
        </div>

        <div className='space-y-0.5'>
          <p className={APS_KICKER_CLASS}>{t('apsScheduling.cuttingIssuance.planning.dueDateLabel')}</p>
          <div className={`${APS_INPUT_CLASS} flex items-center gap-2 px-3 text-sm`}>
            <CalendarClock className='size-4 text-muted-foreground' />
            <span>{formatDateLabel(selectedOrder?.deliveryDate, locale)}</span>
          </div>
        </div>
      </div>

      {templateMatchHint ? (
        <p className='mt-2 text-xs text-muted-foreground/70'>{templateMatchHint}</p>
      ) : null}
    </section>
  )
}
