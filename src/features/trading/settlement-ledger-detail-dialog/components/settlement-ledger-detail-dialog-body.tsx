import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { getTradingLedgerStatusOptions } from '@/features/trading/utils/ledger-display'
import { SettlementRecordEvidencePanel } from '../../settlement-evidences/components/settlement-record-evidence-panel'
import type {
  SettlementAllocationMode,
  SettlementLedgerDetailDialogViewModel,
} from '../types'
import { SettlementAllocationHistorySection } from './settlement-allocation-history-section'
import { SettlementLedgerSummarySection } from './settlement-ledger-summary-section'
import { SettlementRecordFormSection } from './settlement-record-form-section'
import { SettlementRecordsTableSection } from './settlement-records-table-section'

interface SettlementLedgerDetailDialogBodyConfig {
  actionLabel: string
  partnerLabel: string
  amountLabel: string
  recordType: 'payment' | 'receipt'
  allocationMode?: SettlementAllocationMode
  uploadPath: string
}

interface SettlementLedgerDetailDialogBodyProps {
  vm: SettlementLedgerDetailDialogViewModel
  config: SettlementLedgerDetailDialogBodyConfig
  showDetailedFields: boolean
  isCurrencyLoading: boolean
  financeResourceStatus: 'loading' | 'error' | 'ready'
  financeResourceErrorMessage?: string
  onRetryFinanceResources?: () => void
  allocationHistoryCount: number
}

export function SettlementLedgerDetailDialogBody({
  vm,
  config,
  showDetailedFields,
  isCurrencyLoading,
  financeResourceStatus,
  financeResourceErrorMessage,
  onRetryFinanceResources,
  allocationHistoryCount,
}: SettlementLedgerDetailDialogBodyProps) {
  const { t } = useLanguage()
  const allocationMode = config.allocationMode ?? 'multi-ledger'
  const isSingleLedgerMode = allocationMode === 'single-ledger'

  return (
    <div className='grid gap-3'>
      {financeResourceStatus !== 'ready' ? (
        <div
          className={`flex items-center justify-between gap-3 rounded-[22px] border border-dashed px-4 py-3 ${financeResourceStatus === 'loading' ? 'border-amber-500/30 bg-amber-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}
        >
          <div className='space-y-1'>
            <p
              className={`text-[10px] font-black tracking-widest uppercase ${financeResourceStatus === 'loading' ? 'text-amber-700' : 'text-rose-700'}`}
            >
              {financeResourceStatus === 'loading'
                ? '财务字典加载中'
                : '财务字典加载失败'}
            </p>
            <p
              className={`text-[9px] font-bold ${financeResourceStatus === 'loading' ? 'text-amber-700/80' : 'text-rose-700/80'}`}
            >
              {financeResourceStatus === 'loading'
                ? '币种与支付方式暂不可用。'
                : financeResourceErrorMessage || '请重试后再登记结算记录。'}
            </p>
          </div>
          {financeResourceStatus === 'error' && onRetryFinanceResources ? (
            <Button
              type='button'
              variant='outline'
              className='h-9 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest uppercase'
              onClick={onRetryFinanceResources}
            >
              重试
            </Button>
          ) : null}
        </div>
      ) : null}
      <SettlementLedgerSummarySection items={vm.summaryItems} />

      <SettlementRecordFormSection
        title={`登记${config.actionLabel}`}
        allocationMode={allocationMode}
        showDetailedFields={showDetailedFields}
        paymentMethodFieldId={`${vm.fieldPrefix}-payment-method`}
        paymentMethodLabel={`${config.actionLabel}方式`}
        paymentMethod={vm.paymentMethod}
        onPaymentMethodChange={vm.setPaymentMethod}
        paymentMethodOptions={vm.paymentMethodOptions}
        paymentMethodPlaceholder={`选择${config.actionLabel}方式`}
        paymentMethodLoadingLabel='支付方式加载中...'
        paymentMethodUnavailableLabel='支付方式加载失败，请稍后重试'
        isPaymentMethodLoading={
          showDetailedFields && financeResourceStatus === 'loading'
        }
        isPaymentMethodOptionsUnavailable={
          showDetailedFields && financeResourceStatus === 'error'
        }
        dateFieldId={`${vm.fieldPrefix}-date`}
        dateLabel={`${config.actionLabel}日期`}
        recordDate={vm.recordDate}
        onRecordDateChange={vm.setRecordDate}
        receiptAccountFieldId={`${vm.fieldPrefix}-account`}
        receiptAccountLabel={`${config.actionLabel}账号`}
        receiptAccount={vm.receiptAccount}
        onReceiptAccountChange={vm.setReceiptAccount}
        referenceFieldId={`${vm.fieldPrefix}-ref`}
        referenceLabel='参考号'
        referenceNo={vm.referenceNo}
        onReferenceNoChange={vm.setReferenceNo}
        totalAllocatedLabel={
          isSingleLedgerMode ? `本次${config.actionLabel}合计` : '分摊合计'
        }
        totalAllocatedAmount={vm.totalAllocatedAmount}
        currencyCode={vm.currencyCode}
        addAllocationLabel='新增分摊行'
        onAddAllocationRow={vm.addAllocationRow}
        searchFieldId={`${vm.fieldPrefix}-ledger-search`}
        searchLabel='搜索台账'
        searchPlaceholder={`按单据编号、${config.partnerLabel}、${config.amountLabel}金额过滤台账`}
        ledgerSearchTerm={vm.ledgerSearchTerm}
        onLedgerSearchTermChange={vm.setLedgerSearchTerm}
        statusFieldId={`${vm.fieldPrefix}-ledger-status-filter`}
        statusLabel='状态'
        statusFilter={vm.ledgerStatusFilter}
        onStatusFilterChange={vm.setLedgerStatusFilter}
        statusOptions={getTradingLedgerStatusOptions(t)}
        statusAllLabel='全部状态'
        statusPlaceholder='全部状态'
        currencyFieldId={`${vm.fieldPrefix}-ledger-currency-filter`}
        currencyLabel='币种'
        currencyFilter={vm.ledgerCurrencyFilter}
        onCurrencyFilterChange={vm.setLedgerCurrencyFilter}
        currencyOptions={vm.currencyOptions}
        currencyAllLabel='全部币种'
        currencyLoadingLabel='币种字典加载中...'
        currencyUnavailableLabel='币种字典加载失败，请稍后重试'
        isCurrencyLoading={isCurrencyLoading}
        isCurrencyOptionsUnavailable={vm.isCurrencyOptionsUnavailable}
        outstandingMinFieldId={`${vm.fieldPrefix}-ledger-outstanding-min`}
        outstandingMinLabel={`${config.amountLabel}最小值`}
        outstandingMin={vm.ledgerOutstandingMin}
        onOutstandingMinChange={vm.setLedgerOutstandingMin}
        outstandingMaxFieldId={`${vm.fieldPrefix}-ledger-outstanding-max`}
        outstandingMaxLabel={`${config.amountLabel}最大值`}
        outstandingMax={vm.ledgerOutstandingMax}
        onOutstandingMaxChange={vm.setLedgerOutstandingMax}
        sortByFieldId={`${vm.fieldPrefix}-ledger-sort-by`}
        sortByLabel='排序字段'
        sortBy={vm.ledgerSortBy}
        onSortByChange={vm.setLedgerSortBy}
        sortByPlaceholder='选择排序字段'
        sortByOptions={[
          { label: '最近更新', value: 'updated_at' },
          { label: `${config.amountLabel}金额`, value: 'outstanding_amount' },
          { label: '台账编号', value: 'ledger_no' },
        ]}
        sortOrderFieldId={`${vm.fieldPrefix}-ledger-sort-order`}
        sortOrderLabel='排序方向'
        sortOrder={vm.ledgerSortOrder}
        onSortOrderChange={vm.setLedgerSortOrder}
        sortOrderPlaceholder='选择排序方向'
        sortOrderOptions={[
          { label: '降序', value: 'desc' },
          { label: '升序', value: 'asc' },
        ]}
        allocations={vm.allocations}
        allocationFieldPrefix={`${vm.fieldPrefix}-allocation`}
        ledgerIdLabel='目标台账'
        selectedLedgerPlaceholder='未选择台账'
        ledgerDisplayMap={vm.ledgerDisplayMap}
        selectLedgerLabel='选择台账'
        onOpenLedgerSearchDialog={vm.openLedgerSearchDialog}
        allocatedAmountLabel={
          isSingleLedgerMode ? `本次${config.actionLabel}金额` : '分摊金额'
        }
        onUpdateAllocationRow={vm.updateAllocationRow}
        remarkLabel='备注'
        removeAllocationLabel='删除'
        onRemoveAllocationRow={vm.removeAllocationRow}
      />

      <div className='grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]'>
        <SettlementRecordsTableSection
          title={vm.actionRecordLabel}
          records={vm.filteredRecords}
          currencyCode={vm.currencyCode}
          selectedRecordId={vm.selectedRecordId}
          onSelectRecord={vm.setSelectedRecordId}
          showOnlyMissingEvidenceRecords={vm.showOnlyMissingEvidenceRecords}
          onToggleShowOnlyMissingEvidenceRecords={() =>
            vm.setShowOnlyMissingEvidenceRecords((current) => !current)
          }
          showAllLabel='显示全部记录'
          showMissingOnlyLabel='只看缺凭证记录'
          emptyLabel={`暂无${vm.actionRecordLabel}`}
          emptyMissingOnlyLabel={`当前没有缺凭证的${vm.actionRecordLabel}`}
          showDetailedColumns={showDetailedFields}
          showRecordStatusColumn={!isSingleLedgerMode}
        />

        <SettlementRecordEvidencePanel
          recordId={vm.selectedRecordId}
          recordType={config.recordType}
          uploadPath={config.uploadPath}
          title={`${vm.actionRecordLabel}凭证`}
        />
      </div>

      {!isSingleLedgerMode ? (
        <SettlementAllocationHistorySection
          title='核销分摊明细'
          searchFieldId={`${vm.fieldPrefix}-history-search`}
          searchLabel='筛选历史'
          searchPlaceholder='按记录号、目标台账、备注、金额筛选'
          historySearchTerm={vm.historySearchTerm}
          onHistorySearchTermChange={vm.setHistorySearchTerm}
          groups={vm.filteredHistoryGroups}
          hasHistory={allocationHistoryCount > 0}
          ledgerDisplayMap={vm.ledgerDisplayMap}
          currencyCode={vm.currencyCode}
          emptyLabel='暂无核销分摊明细'
          emptyGroupLabel={`该${vm.actionRecordLabel}暂无分摊明细`}
        />
      ) : null}
    </div>
  )
}
