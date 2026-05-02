import { Link } from '@tanstack/react-router'
import { AlertTriangle, Barcode, CheckCircle2, FileText, Hash, Loader2, Printer, Settings2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LinearBarcodePreviewLineCard } from '@/features/code-center/components/linear-barcode-preview-line-card'
import { LinearBarcodePrintResultPanel } from '@/features/code-center/components/linear-barcode-print-result-panel'
import { useLinearBarcodePrintMgmtModel } from '@/features/code-center/hooks/use-linear-barcode-print-mgmt-model'
import { getLinearBarcodeInlineFeedbackClassName } from '@/features/code-center/utils/linear-barcode-print-feedback'
import { useLanguage } from '@/context/language-provider'

export function LinearBarcodePrintMgmt() {
  const { t } = useLanguage()
  const {
    selectedOrderId,
    setSelectedOrderId,
    issuedSerialByLine,
    printingKeys,
    isIssuingNumbers,
    isBatchPrinting,
    retryingKeys,
    isRetryingFailedOnly,
    issueFeedback,
    batchPrintResult,
    filteredResultItems,
    resultFilter,
    setResultFilter,
    ordersQuery,
    detailQuery,
    protocolQuery,
    orderOptions,
    selectedOrder,
    selectedOrderStatusLabel,
    previewLines,
    readyCount,
    blockedCount,
    allReadyLinesNumbered,
    printableCount,
    handleIssueRealNumbers,
    handlePrintLine,
    handleBatchPrint,
    handleRetryItem,
    handleRetryFailedOnly,
    statusBadgeLabel,
  } = useLinearBarcodePrintMgmtModel()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
        <div className='flex flex-col gap-5'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div className='flex items-start gap-3 text-primary'>
              <div className='flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10'>
                <Printer className='size-5' />
              </div>
              <div>
                <div className='text-lg font-black tracking-tight italic'>
                  {t('codeCenter.linearBarcode.print.page.title')}
                </div>
                <div className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>
                  {t('codeCenter.linearBarcode.print.page.subtitle')}
                </div>
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge className='border-none bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-primary/70'>
                <Printer className='mr-2 size-3.5' />
                {statusBadgeLabel}
              </Badge>
              <Badge className='border-none bg-emerald-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700'>
                <Hash className='mr-2 size-3.5' />
                {t('codeCenter.linearBarcode.print.page.badges.protocolLinked')}
              </Badge>
            </div>
          </div>
          <div className='rounded-[24px] border border-dashed border-primary/15 bg-primary/5 px-4 py-3 text-[11px] text-muted-foreground'>
            {t('codeCenter.linearBarcode.print.page.notice')}
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <Button className='rounded-full px-6 text-[10px] font-black uppercase shadow-lg shadow-primary/20' asChild>
              <Link to='/code-center/linear-barcode/protocol'>
                <Settings2 className='mr-2 size-4' />
                {t('codeCenter.linearBarcode.print.actions.gotoProtocol')}
              </Link>
            </Button>
            <Button variant='ghost' className='rounded-full px-6 text-[10px] font-black uppercase' asChild>
              <Link to='/code-center/shared-code-source/numbering-engine'>
                <Hash className='mr-2 size-4' />
                {t('codeCenter.linearBarcode.print.actions.gotoNumberingEngine')}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        <Card className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 shadow-none'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight italic'>
              <FileText className='size-4 text-primary' />
              {t('codeCenter.linearBarcode.print.sections.templates.title')}
            </CardTitle>
            <CardDescription className='text-[11px] leading-6'>
              {t('codeCenter.linearBarcode.print.sections.templates.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4 rounded-[20px] border border-dashed border-muted/50 bg-background/60 p-5 text-[11px] leading-6 text-muted-foreground'>
              {ordersQuery.isLoading ? (
                <div className='flex items-center gap-2'>
                  <Loader2 className='size-4 animate-spin text-primary' />
                  <span>{t('codeCenter.linearBarcode.print.sections.templates.states.loadingOrders')}</span>
                </div>
              ) : orderOptions.length === 0 ? (
                <div>{t('codeCenter.linearBarcode.print.sections.templates.states.emptyOrders')}</div>
              ) : (
                <div className='space-y-3'>
                  <div className='space-y-1'>
                    <div className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60'>
                      {t('codeCenter.linearBarcode.print.sections.templates.selectLabel')}
                    </div>
                    <select
                      className='h-11 w-full appearance-none rounded-xl border border-muted/30 bg-background px-4 text-[12px] font-bold text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/20'
                      value={selectedOrderId}
                      onChange={(event) => setSelectedOrderId(event.target.value)}
                    >
                      <option value=''>{t('codeCenter.linearBarcode.print.sections.templates.selectPlaceholder')}</option>
                      {orderOptions.map((order) => (
                        <option key={order.id} value={order.id}>
                          {order.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!selectedOrderId ? (
                    <div className='rounded-xl border border-dashed bg-muted/10 px-3 py-3'>
                      {t('codeCenter.linearBarcode.print.sections.templates.states.awaitingSelection')}
                    </div>
                  ) : detailQuery.isLoading ? (
                    <div className='flex items-center gap-2 rounded-xl border border-dashed bg-muted/10 px-3 py-3'>
                      <Loader2 className='size-4 animate-spin text-primary' />
                      <span>{t('codeCenter.linearBarcode.print.sections.templates.states.loadingOrderDetail')}</span>
                    </div>
                  ) : detailQuery.error ? (
                    <div className='rounded-xl border border-dashed border-rose-300/50 bg-rose-50/40 px-3 py-3 text-rose-700'>
                      {t('codeCenter.linearBarcode.print.sections.templates.states.orderDetailFailed')}
                    </div>
                  ) : selectedOrder ? (
                    <div className='grid gap-2 rounded-xl border border-dashed bg-muted/10 px-3 py-3'>
                      <div className='flex items-center justify-between gap-3'>
                        <span className='font-black text-muted-foreground/60'>
                          {t('codeCenter.linearBarcode.print.sections.templates.summary.orderNo')}
                        </span>
                        <span className='font-mono font-bold text-foreground'>{selectedOrder.orderNo}</span>
                      </div>
                      <div className='flex items-center justify-between gap-3'>
                        <span className='font-black text-muted-foreground/60'>
                          {t('codeCenter.linearBarcode.print.sections.templates.summary.customer')}
                        </span>
                        <span className='truncate font-bold text-foreground'>{selectedOrder.customerName}</span>
                      </div>
                      <div className='flex items-center justify-between gap-3'>
                        <span className='font-black text-muted-foreground/60'>
                          {t('codeCenter.linearBarcode.print.sections.templates.summary.status')}
                        </span>
                        <span className='font-bold text-foreground'>{selectedOrderStatusLabel}</span>
                      </div>
                      <div className='flex items-center justify-between gap-3'>
                        <span className='font-black text-muted-foreground/60'>
                          {t('codeCenter.linearBarcode.print.sections.templates.summary.lines')}
                        </span>
                        <span className='font-bold text-foreground'>{selectedOrder.lines.length}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 shadow-none'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight italic'>
              <Barcode className='size-4 text-primary' />
              {t('codeCenter.linearBarcode.print.sections.parameters.title')}
            </CardTitle>
            <CardDescription className='text-[11px] leading-6'>
              {t('codeCenter.linearBarcode.print.sections.parameters.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4 rounded-[20px] border border-dashed border-muted/50 bg-background/60 p-5 text-[11px] leading-6 text-muted-foreground'>
              {protocolQuery.isLoading ? (
                <div className='flex items-center gap-2'>
                  <Loader2 className='size-4 animate-spin text-primary' />
                  <span>{t('codeCenter.linearBarcode.print.sections.parameters.states.loadingProtocol')}</span>
                </div>
              ) : protocolQuery.error ? (
                <div className='rounded-xl border border-dashed border-rose-300/50 bg-rose-50/40 px-3 py-3 text-rose-700'>
                  {t('codeCenter.linearBarcode.print.sections.parameters.states.protocolLoadFailed')}
                </div>
              ) : (
                <>
                  <div className='grid gap-2 rounded-xl border border-dashed bg-muted/10 px-3 py-3'>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='font-black text-muted-foreground/60'>
                        {t('codeCenter.linearBarcode.print.sections.parameters.summary.protocolVersion')}
                      </span>
                      <span className='font-mono font-bold text-foreground'>{protocolQuery.data?.version || '--'}</span>
                    </div>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='font-black text-muted-foreground/60'>
                        {t('codeCenter.linearBarcode.print.sections.parameters.summary.sequenceRuleKey')}
                      </span>
                      <span className='font-mono font-bold text-foreground'>{protocolQuery.data?.sequenceRuleKey || '--'}</span>
                    </div>
                  </div>
                  <div className='rounded-xl border border-dashed bg-muted/10 px-3 py-3'>
                    <div className='mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60'>
                      {t('codeCenter.linearBarcode.print.sections.parameters.ruleTitle')}
                    </div>
                    <div className='grid gap-1'>
                      <div>{t('codeCenter.linearBarcode.print.sections.parameters.rules.modelCode')}</div>
                      <div>{t('codeCenter.linearBarcode.print.sections.parameters.rules.holePrefix')}</div>
                      <div>{t('codeCenter.linearBarcode.print.sections.parameters.rules.appearanceCode')}</div>
                      <div>{t('codeCenter.linearBarcode.print.sections.parameters.rules.holeCount')}</div>
                      <div>{t('codeCenter.linearBarcode.print.sections.parameters.rules.quantity')}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 shadow-none'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight italic'>
              <Printer className='size-4 text-primary' />
              {t('codeCenter.linearBarcode.print.sections.preview.title')}
            </CardTitle>
            <CardDescription className='text-[11px] leading-6'>
              {t('codeCenter.linearBarcode.print.sections.preview.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4 rounded-[20px] border border-dashed border-muted/50 bg-background/60 p-5 text-[11px] leading-6 text-muted-foreground'>
              {!selectedOrderId ? (
                <div>{t('codeCenter.linearBarcode.print.sections.preview.states.awaitingSelection')}</div>
              ) : detailQuery.isLoading ? (
                <div className='flex items-center gap-2'>
                  <Loader2 className='size-4 animate-spin text-primary' />
                  <span>{t('codeCenter.linearBarcode.print.sections.preview.states.loading')}</span>
                </div>
              ) : previewLines.length === 0 ? (
                <div>{t('codeCenter.linearBarcode.print.sections.preview.states.noLines')}</div>
              ) : (
                <>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge className='border-none bg-emerald-500/10 text-emerald-700'>
                      <CheckCircle2 className='mr-1 size-3.5' />
                      {t('codeCenter.linearBarcode.print.sections.preview.summary.ready', { count: readyCount })}
                    </Badge>
                    <Badge className='border-none bg-amber-500/10 text-amber-700'>
                      <AlertTriangle className='mr-1 size-3.5' />
                      {t('codeCenter.linearBarcode.print.sections.preview.summary.blocked', { count: blockedCount })}
                    </Badge>
                    <Button
                      type='button'
                      size='sm'
                      onClick={() => void handleIssueRealNumbers()}
                      disabled={isIssuingNumbers || readyCount === 0 || allReadyLinesNumbered}
                      className='h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.18em]'
                    >
                      {isIssuingNumbers
                        ? t('codeCenter.linearBarcode.print.sections.preview.actions.issuingNumbers')
                        : allReadyLinesNumbered
                          ? t('codeCenter.linearBarcode.print.sections.preview.actions.numbersReady')
                          : t('codeCenter.linearBarcode.print.sections.preview.actions.issueRealNumbers')}
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      onClick={() => void handleBatchPrint()}
                      disabled={isBatchPrinting || printableCount === 0}
                      className='h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.18em]'
                    >
                      {isBatchPrinting
                        ? t('codeCenter.linearBarcode.print.sections.preview.actions.batchPrinting')
                        : t('codeCenter.linearBarcode.print.sections.preview.actions.batchPrintAll')}
                    </Button>
                  </div>
                  {issueFeedback && (
                    <div className={getLinearBarcodeInlineFeedbackClassName(issueFeedback)}>
                      {issueFeedback.message}
                    </div>
                  )}
                  {batchPrintResult && (
                    <LinearBarcodePrintResultPanel
                      batchPrintResult={batchPrintResult}
                      filteredResultItems={filteredResultItems}
                      resultFilter={resultFilter}
                      retryingKeys={retryingKeys}
                      isRetryingFailedOnly={isRetryingFailedOnly}
                      onRetryFailedOnly={() => void handleRetryFailedOnly()}
                      onRetryItem={(itemKey) => void handleRetryItem(itemKey)}
                      onResultFilterChange={setResultFilter}
                    />
                  )}
                  <div className='space-y-3'>
                    {previewLines.map((line) => {
                      const hasRealNumber = Boolean(issuedSerialByLine[line.key])

                      return (
                        <LinearBarcodePreviewLineCard
                          key={line.key}
                          line={line}
                          hasRealNumber={hasRealNumber}
                          isPrinting={Boolean(printingKeys[line.key])}
                          onPrint={() => void handlePrintLine(line.key)}
                        />
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
