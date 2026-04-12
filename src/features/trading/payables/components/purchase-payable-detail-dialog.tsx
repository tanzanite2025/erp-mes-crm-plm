import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LedgerSearchDialog } from '../../components/ledger-search-dialog'
import { useGetPayables, useSearchPayableLedgers } from '../hooks/use-payables'
import { useCreatePaymentRecord, usePayableLedgerDetail } from '../hooks/use-payable-ledger-detail'
import { useTradingFinanceResources } from '../../hooks/use-trading-finance-resources'

interface AllocationDraft {
  allocatedAmount: string
  ledgerId: string
  remark: string
  sequenceNo: number
}

interface PurchasePayableDetailDialogProps {
  open: boolean
  ledgerId: string | null
  onOpenChange: (open: boolean) => void
}

const LEDGER_STATUS_OPTIONS = ['OPEN', 'PARTIAL', 'OVERDUE', 'SETTLED'] as const
const LEDGER_SORT_BY_OPTIONS = [
  { label: '最近更新', value: 'updated_at' },
  { label: '未付金额', value: 'outstanding_amount' },
  { label: '台账编号', value: 'ledger_no' },
] as const
const LEDGER_SORT_ORDER_OPTIONS = [
  { label: '降序', value: 'desc' },
  { label: '升序', value: 'asc' },
] as const

export function PurchasePayableDetailDialog({
  open,
  ledgerId,
  onOpenChange,
}: PurchasePayableDetailDialogProps) {
  const payablesQuery = useGetPayables()
  const detailQuery = usePayableLedgerDetail(open ? ledgerId : null)
  const createMutation = useCreatePaymentRecord()
  const financeResources = useTradingFinanceResources({
    includeCurrencies: true,
    includePaymentMethods: false,
    includePaymentTerms: false,
  })

  const [recordDate, setRecordDate] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [allocations, setAllocations] = useState<AllocationDraft[]>([])
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('')
  const [debouncedLedgerSearchTerm, setDebouncedLedgerSearchTerm] = useState('')
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState('')
  const [ledgerCurrencyFilter, setLedgerCurrencyFilter] = useState('')
  const [ledgerOutstandingMin, setLedgerOutstandingMin] = useState('')
  const [ledgerOutstandingMax, setLedgerOutstandingMax] = useState('')
  const [ledgerSortBy, setLedgerSortBy] = useState('updated_at')
  const [ledgerSortOrder, setLedgerSortOrder] = useState('desc')
  const [isLedgerSearchDialogOpen, setIsLedgerSearchDialogOpen] = useState(false)
  const [activeAllocationSequenceNo, setActiveAllocationSequenceNo] = useState<number | null>(null)
  const [historySearchTerm, setHistorySearchTerm] = useState('')

  const detail = detailQuery.data
  const currencyOptions = useMemo(
    () => financeResources.currencies.filter((item) => item.status === 'Active'),
    [financeResources.currencies]
  )
  const isCurrencyOptionsUnavailable = !financeResources.isLoading && currencyOptions.length === 0
  const payableSearchQuery = useSearchPayableLedgers({
    keyword: debouncedLedgerSearchTerm,
    status: ledgerStatusFilter,
    currency: ledgerCurrencyFilter,
    outstandingMin: ledgerOutstandingMin,
    outstandingMax: ledgerOutstandingMax,
    sortBy: ledgerSortBy,
    sortOrder: ledgerSortOrder,
  })
  const records = useMemo(() => detail?.paymentRecords ?? [], [detail])
  const allocationHistory = useMemo(() => detail?.allocations ?? [], [detail])
  const ledgerOptions = useMemo(() => payablesQuery.data?.items ?? [], [payablesQuery.data])
  const remoteLedgerOptions = useMemo(() => payableSearchQuery.data ?? [], [payableSearchQuery.data])
  const ledgerDisplayMap = useMemo(() => {
    const entries: [string, string][] = ledgerOptions.map((option) => [
      option.id,
      `${option.documentNo} / ${option.supplierName} / 未付 ${option.outstandingAmount}`,
    ] as [string, string])
    remoteLedgerOptions.forEach((option) => {
      entries.push([
        option.id,
        `${option.documentNo} / ${option.partnerName} / 未付 ${option.outstandingAmount}`,
      ] as [string, string])
    })
    if (detail) {
      entries.push([
        detail.id,
        `${detail.documentNo} / ${detail.supplierName} / 未付 ${detail.outstandingAmount}`,
      ] as [string, string])
    }
    return new Map<string, string>(entries)
  }, [detail, ledgerOptions, remoteLedgerOptions])
  const allocationHistoryGroups = useMemo(() => {
    return records.map((record) => ({
      record,
      allocations: allocationHistory.filter((allocation) => allocation.paymentRecordId === record.id),
    }))
  }, [allocationHistory, records])
  const fallbackFilteredLedgerOptions = useMemo(() => {
    const keyword = ledgerSearchTerm.trim().toLowerCase()
    if (!keyword) {
      return ledgerOptions
    }
    return ledgerOptions.filter((option) => {
      const haystack = `${option.documentNo} ${option.supplierName} ${option.outstandingAmount}`.toLowerCase()
      return haystack.includes(keyword)
    })
  }, [ledgerOptions, ledgerSearchTerm])
  const displayLedgerOptions = useMemo(() => {
    if (debouncedLedgerSearchTerm.trim().length >= 2) {
      return remoteLedgerOptions.map((option) => ({
        id: option.id,
        documentNo: option.documentNo,
        displayName: `${option.documentNo} / ${option.partnerName} / 未付 ${option.outstandingAmount}`,
      }))
    }
    return fallbackFilteredLedgerOptions.map((option) => ({
      id: option.id,
      documentNo: option.documentNo,
      displayName: `${option.documentNo} / ${option.supplierName} / 未付 ${option.outstandingAmount}`,
    }))
  }, [debouncedLedgerSearchTerm, fallbackFilteredLedgerOptions, remoteLedgerOptions])
  const filteredAllocationHistoryGroups = useMemo(() => {
    const keyword = historySearchTerm.trim().toLowerCase()
    if (!keyword) {
      return allocationHistoryGroups
    }
    return allocationHistoryGroups
      .map(({ record, allocations: groupedAllocations }) => ({
        record,
        allocations: groupedAllocations.filter((allocation) => {
          const targetLedgerDisplay = ledgerDisplayMap.get(allocation.ledgerId) ?? allocation.ledgerId
          const haystack = `${record.recordNo} ${record.recordDate} ${allocation.remark} ${targetLedgerDisplay} ${allocation.allocatedAmount}`.toLowerCase()
          return haystack.includes(keyword)
        }),
      }))
      .filter(({ record, allocations: groupedAllocations }) => {
        if (groupedAllocations.length > 0) {
          return true
        }
        return `${record.recordNo} ${record.recordDate} ${record.amount}`.toLowerCase().includes(keyword)
      })
  }, [allocationHistoryGroups, historySearchTerm, ledgerDisplayMap])
  const totalAllocatedAmount = useMemo(
    () => allocations.reduce((sum, item) => sum + (Number(item.allocatedAmount) || 0), 0),
    [allocations]
  )
  const canSubmit = useMemo(
    () => allocations.length > 0 && totalAllocatedAmount > 0 && allocations.every((item) => Number(item.allocatedAmount) > 0 && item.ledgerId),
    [allocations, totalAllocatedAmount]
  )

  const resetForm = () => {
    setRecordDate('')
    setReferenceNo('')
    setAllocations(ledgerId ? [{ ledgerId, allocatedAmount: '', remark: '', sequenceNo: 1 }] : [])
    setLedgerSearchTerm('')
    setDebouncedLedgerSearchTerm('')
    setLedgerStatusFilter('')
    setLedgerCurrencyFilter('')
    setLedgerOutstandingMin('')
    setLedgerOutstandingMax('')
    setLedgerSortBy('updated_at')
    setLedgerSortOrder('desc')
    setIsLedgerSearchDialogOpen(false)
    setActiveAllocationSequenceNo(null)
    setHistorySearchTerm('')
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLedgerSearchTerm(ledgerSearchTerm.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [ledgerSearchTerm])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async () => {
    if (!ledgerId || totalAllocatedAmount <= 0 || allocations.length === 0) {
      return
    }

    await createMutation.mutateAsync({
      id: ledgerId,
      payload: {
        amount: totalAllocatedAmount,
        recordDate,
        referenceNo,
        allocations: allocations.map((item, index) => ({
          ledgerId: item.ledgerId,
          allocatedAmount: Number(item.allocatedAmount),
          sequenceNo: item.sequenceNo || index + 1,
          remark: item.remark,
        })),
      },
    })

    resetForm()
  }

  const addAllocationRow = () => {
    setAllocations((current) => [
      ...current,
      { ledgerId: ledgerId ?? '', allocatedAmount: '', remark: '', sequenceNo: current.length + 1 },
    ])
  }

  const removeAllocationRow = (sequenceNo: number) => {
    setAllocations((current) => current.filter((item) => item.sequenceNo !== sequenceNo).map((item, index) => ({ ...item, sequenceNo: index + 1 })))
  }

  const updateAllocationRow = (sequenceNo: number, patch: Partial<AllocationDraft>) => {
    setAllocations((current) => current.map((item) => (item.sequenceNo === sequenceNo ? { ...item, ...patch } : item)))
  }

  const openLedgerSearchDialog = (sequenceNo: number) => {
    setActiveAllocationSequenceNo(sequenceNo)
    setIsLedgerSearchDialogOpen(true)
  }

  const activeAllocation = useMemo(
    () => allocations.find((item) => item.sequenceNo === activeAllocationSequenceNo) ?? null,
    [activeAllocationSequenceNo, allocations]
  )

  const handleLedgerSelected = (selectedLedgerId: string) => {
    if (!activeAllocationSequenceNo) {
      return
    }
    updateAllocationRow(activeAllocationSequenceNo, { ledgerId: selectedLedgerId })
    setIsLedgerSearchDialogOpen(false)
    setActiveAllocationSequenceNo(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>应付详情</DialogTitle>
          <DialogDescription>查看台账明细并登记一笔最小付款记录。</DialogDescription>
        </DialogHeader>

        <div className='grid gap-6'>
          <div className='grid gap-2 md:grid-cols-2'>
            <div className='rounded-lg border p-4'>
              <div className='text-sm text-muted-foreground'>单据编号</div>
              <div className='mt-1 font-medium'>{detail?.documentNo ?? '-'}</div>
            </div>
            <div className='rounded-lg border p-4'>
              <div className='text-sm text-muted-foreground'>供应商</div>
              <div className='mt-1 font-medium'>{detail?.supplierName ?? '-'}</div>
            </div>
            <div className='rounded-lg border p-4'>
              <div className='text-sm text-muted-foreground'>开票金额</div>
              <div className='mt-1 font-medium'>{detail?.invoiceAmount ?? 0}</div>
            </div>
            <div className='rounded-lg border p-4'>
              <div className='text-sm text-muted-foreground'>未付金额</div>
              <div className='mt-1 font-medium'>{detail?.outstandingAmount ?? 0}</div>
            </div>
          </div>

          <div className='grid gap-4 rounded-lg border p-4'>
            <div className='text-sm font-medium'>登记付款</div>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='payable-date'>付款日期</Label>
                <Input id='payable-date' type='date' value={recordDate} onChange={(event) => setRecordDate(event.target.value)} />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='payable-ref'>参考号</Label>
                <Input id='payable-ref' value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} />
              </div>
            </div>
            <div className='flex items-center justify-between'>
              <div className='text-sm text-muted-foreground'>分摊合计：{totalAllocatedAmount}</div>
              <Button type='button' variant='outline' size='sm' onClick={addAllocationRow}>新增分摊行</Button>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='payable-ledger-search'>搜索台账</Label>
              <Input
                id='payable-ledger-search'
                value={ledgerSearchTerm}
                onChange={(event) => setLedgerSearchTerm(event.target.value)}
                placeholder='按单据编号、供应商、未付金额过滤台账'
              />
            </div>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <div className='grid gap-2'>
                <Label htmlFor='payable-ledger-status-filter'>状态</Label>
                <Select value={ledgerStatusFilter || '__all__'} onValueChange={(value) => setLedgerStatusFilter(value === '__all__' ? '' : value)}>
                  <SelectTrigger id='payable-ledger-status-filter'>
                    <SelectValue placeholder='全部状态' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__all__'>全部状态</SelectItem>
                    {LEDGER_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='payable-ledger-currency-filter'>币种</Label>
                <Select
                  value={ledgerCurrencyFilter || '__all__'}
                  onValueChange={(value) => setLedgerCurrencyFilter(value === '__all__' ? '' : value)}
                  disabled={financeResources.isLoading || isCurrencyOptionsUnavailable}
                >
                  <SelectTrigger id='payable-ledger-currency-filter'>
                    <SelectValue placeholder='全部币种' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__all__'>全部币种</SelectItem>
                    {currencyOptions.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {financeResources.isLoading ? (
                  <div className='text-xs text-muted-foreground'>币种字典加载中</div>
                ) : null}
                {isCurrencyOptionsUnavailable ? (
                  <div className='text-xs text-destructive'>币种字典加载失败，请稍后重试</div>
                ) : null}
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='payable-ledger-outstanding-min'>未付最小值</Label>
                <Input
                  id='payable-ledger-outstanding-min'
                  type='number'
                  value={ledgerOutstandingMin}
                  onChange={(event) => setLedgerOutstandingMin(event.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='payable-ledger-outstanding-max'>未付最大值</Label>
                <Input
                  id='payable-ledger-outstanding-max'
                  type='number'
                  value={ledgerOutstandingMax}
                  onChange={(event) => setLedgerOutstandingMax(event.target.value)}
                />
              </div>
            </div>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='payable-ledger-sort-by'>排序字段</Label>
                <Select value={ledgerSortBy} onValueChange={setLedgerSortBy}>
                  <SelectTrigger id='payable-ledger-sort-by'>
                    <SelectValue placeholder='选择排序字段' />
                  </SelectTrigger>
                  <SelectContent>
                    {LEDGER_SORT_BY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='payable-ledger-sort-order'>排序方向</Label>
                <Select value={ledgerSortOrder} onValueChange={setLedgerSortOrder}>
                  <SelectTrigger id='payable-ledger-sort-order'>
                    <SelectValue placeholder='选择排序方向' />
                  </SelectTrigger>
                  <SelectContent>
                    {LEDGER_SORT_ORDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='grid gap-3'>
              {allocations.map((item) => (
                <div key={item.sequenceNo} className='grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_1fr_auto]'>
                  <div className='grid gap-2'>
                    <Label htmlFor={`payable-allocation-ledger-${item.sequenceNo}`}>台账ID</Label>
                    <div id={`payable-allocation-ledger-${item.sequenceNo}`} className='rounded-md border px-3 py-2 text-sm'>
                      {ledgerDisplayMap.get(item.ledgerId) ?? item.ledgerId ?? '未选择台账'}
                    </div>
                    <Button type='button' variant='outline' size='sm' onClick={() => openLedgerSearchDialog(item.sequenceNo)}>
                      选择台账
                    </Button>
                  </div>
                  <div className='grid gap-2'>
                    <Label htmlFor={`payable-allocation-amount-${item.sequenceNo}`}>分摊金额</Label>
                    <Input
                      id={`payable-allocation-amount-${item.sequenceNo}`}
                      type='number'
                      value={item.allocatedAmount}
                      onChange={(event) => updateAllocationRow(item.sequenceNo, { allocatedAmount: event.target.value })}
                    />
                  </div>
                  <div className='grid gap-2'>
                    <Label htmlFor={`payable-allocation-remark-${item.sequenceNo}`}>备注</Label>
                    <Input
                      id={`payable-allocation-remark-${item.sequenceNo}`}
                      value={item.remark}
                      onChange={(event) => updateAllocationRow(item.sequenceNo, { remark: event.target.value })}
                    />
                  </div>
                  <div className='flex items-end'>
                    <Button type='button' variant='ghost' size='sm' onClick={() => removeAllocationRow(item.sequenceNo)} disabled={allocations.length === 1}>
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className='rounded-lg border p-4'>
            <div className='mb-3 text-sm font-medium'>付款记录</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>记录号</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className='text-center text-muted-foreground'>
                      暂无付款记录
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.recordNo}</TableCell>
                      <TableCell>{record.amount}</TableCell>
                      <TableCell>{record.recordDate}</TableCell>
                      <TableCell>{record.status}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className='rounded-lg border p-4'>
            <div className='mb-3 text-sm font-medium'>核销分摊明细</div>
            <div className='mb-4 grid gap-2'>
              <Label htmlFor='payable-history-search'>筛选历史</Label>
              <Input
                id='payable-history-search'
                value={historySearchTerm}
                onChange={(event) => setHistorySearchTerm(event.target.value)}
                placeholder='按记录号、目标台账、备注、金额筛选'
              />
            </div>
            <div className='grid gap-4'>
              {filteredAllocationHistoryGroups.length === 0 || allocationHistory.length === 0 ? (
                <div className='rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground'>
                  暂无核销分摊明细
                </div>
              ) : (
                filteredAllocationHistoryGroups.map(({ record, allocations: groupedAllocations }) => (
                  <div key={record.id} className='rounded-md border p-4'>
                    <div className='mb-3 flex flex-col gap-1'>
                      <div className='text-sm font-medium'>记录号：{record.recordNo}</div>
                      <div className='text-xs text-muted-foreground'>
                        日期：{record.recordDate || '-'} / 金额：{record.amount}
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>序号</TableHead>
                          <TableHead>目标台账</TableHead>
                          <TableHead>分摊金额</TableHead>
                          <TableHead>备注</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedAllocations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className='text-center text-muted-foreground'>
                              该付款记录暂无分摊明细
                            </TableCell>
                          </TableRow>
                        ) : (
                          groupedAllocations.map((allocation) => (
                            (() => {
                              const targetLedgerDisplay = ledgerDisplayMap.get(allocation.ledgerId) ?? allocation.ledgerId
                              return (
                                <TableRow key={allocation.id}>
                                  <TableCell>{allocation.sequenceNo}</TableCell>
                                  <TableCell>{targetLedgerDisplay}</TableCell>
                                  <TableCell>{allocation.allocatedAmount}</TableCell>
                                  <TableCell>{allocation.remark || '-'}</TableCell>
                                </TableRow>
                              )
                            })()
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => handleOpenChange(false)}>关闭</Button>
          <Button onClick={() => void handleSubmit()} disabled={!canSubmit || createMutation.isPending || detailQuery.isLoading}>
            登记付款
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>

      <LedgerSearchDialog
        open={isLedgerSearchDialogOpen}
        title='选择应付台账'
        description='在独立弹窗内搜索、筛选并确认一条应付台账候选。'
        partnerLabel='供应商'
        outstandingLabel='未付金额'
        selectedLedgerId={activeAllocation?.ledgerId ?? ''}
        onOpenChange={setIsLedgerSearchDialogOpen}
        onConfirm={handleLedgerSelected}
        searchResults={displayLedgerOptions.map((option) => {
          const matched = remoteLedgerOptions.find((item) => item.id === option.id)
          return {
            id: option.id,
            documentNo: option.documentNo,
            partnerName: matched?.partnerName ?? '',
            outstandingAmount: matched?.outstandingAmount ?? 0,
            status: matched?.status ?? '',
            currency: matched?.currency ?? '',
          }
        })}
        isSearching={payableSearchQuery.isFetching}
        searchTerm={ledgerSearchTerm}
        onSearchTermChange={setLedgerSearchTerm}
        statusFilter={ledgerStatusFilter}
        onStatusFilterChange={setLedgerStatusFilter}
        currencyFilter={ledgerCurrencyFilter}
        onCurrencyFilterChange={setLedgerCurrencyFilter}
        outstandingMin={ledgerOutstandingMin}
        onOutstandingMinChange={setLedgerOutstandingMin}
        outstandingMax={ledgerOutstandingMax}
        onOutstandingMaxChange={setLedgerOutstandingMax}
        sortBy={ledgerSortBy}
        onSortByChange={setLedgerSortBy}
        sortOrder={ledgerSortOrder}
        onSortOrderChange={setLedgerSortOrder}
      />
    </>
  )
}
