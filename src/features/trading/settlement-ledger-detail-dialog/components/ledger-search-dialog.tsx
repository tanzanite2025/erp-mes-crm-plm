import { useMemo, useState } from 'react'

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
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useTradingFinanceResources } from '../../hooks/use-trading-finance-resources'

export interface LedgerSearchCandidate {
  id: string
  documentNo: string
  partnerName: string
  outstandingAmount: number
  status: string
  currency: string
}

interface LedgerSearchDialogProps {
  open: boolean
  title: string
  description: string
  partnerLabel: string
  outstandingLabel: string
  selectedLedgerId: string
  onOpenChange: (open: boolean) => void
  onConfirm: (ledgerId: string) => void
  searchResults: LedgerSearchCandidate[]
  isSearching: boolean
  searchTerm: string
  onSearchTermChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  currencyFilter: string
  onCurrencyFilterChange: (value: string) => void
  outstandingMin: string
  onOutstandingMinChange: (value: string) => void
  outstandingMax: string
  onOutstandingMaxChange: (value: string) => void
  sortBy: string
  onSortByChange: (value: string) => void
  sortOrder: string
  onSortOrderChange: (value: string) => void
}

const LEDGER_STATUS_OPTIONS = ['OPEN', 'PARTIAL', 'OVERDUE', 'SETTLED'] as const
const LEDGER_SORT_BY_OPTIONS = [
  { label: '最近更新', value: 'updated_at' },
  { label: '未结金额', value: 'outstanding_amount' },
  { label: '台账编号', value: 'ledger_no' },
] as const
const LEDGER_SORT_ORDER_OPTIONS = [
  { label: '降序', value: 'desc' },
  { label: '升序', value: 'asc' },
] as const

const amountFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})

const fieldLabelClassName = 'text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/60'
const controlClassName = 'h-10 rounded-xl text-xs'

export function LedgerSearchDialog({
  open,
  title,
  description,
  partnerLabel,
  outstandingLabel,
  selectedLedgerId,
  onOpenChange,
  onConfirm,
  searchResults,
  isSearching,
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  currencyFilter,
  onCurrencyFilterChange,
  outstandingMin,
  onOutstandingMinChange,
  outstandingMax,
  onOutstandingMaxChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
}: LedgerSearchDialogProps) {
  const financeResources = useTradingFinanceResources({
    includeCurrencies: true,
    includePaymentMethods: false,
    includePaymentTerms: false,
  })
  const currencyOptions = useMemo(
    () => financeResources.currencies.filter((item) => item.status === 'Active'),
    [financeResources.currencies]
  )
  const isCurrencyOptionsUnavailable = !financeResources.isLoading && currencyOptions.length === 0
  const [pendingLedgerId, setPendingLedgerId] = useState(selectedLedgerId)

  const canConfirm = pendingLedgerId.trim().length > 0

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setPendingLedgerId(selectedLedgerId)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size='6xl' className='gap-0 overflow-hidden rounded-[28px] border-dashed p-0 shadow-2xl'>
        <DialogHeader className='border-b border-dashed border-muted/60 bg-muted/20 px-6 py-5'>
          <DialogTitle className='text-base font-black leading-tight tracking-tight'>{title}</DialogTitle>
          <DialogDescription className='text-[11px] font-medium leading-5 text-muted-foreground/70'>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className='grid max-h-[calc(100dvh-13rem)] gap-4 overflow-y-auto px-6 py-5'>
          <div className='grid gap-2'>
            <Label htmlFor='ledger-search-dialog-keyword' className={fieldLabelClassName}>搜索台账</Label>
            <Input
              id='ledger-search-dialog-keyword'
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder='输入单据编号或往来方名称'
              className={controlClassName}
            />
          </div>

          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <div className='grid gap-2'>
              <Label htmlFor='ledger-search-dialog-status' className={fieldLabelClassName}>状态</Label>
              <Select
                value={statusFilter || '__all__'}
                onValueChange={(value) => onStatusFilterChange(value === '__all__' ? '' : value)}
              >
                <SelectTrigger id='ledger-search-dialog-status' className={controlClassName}>
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
              <Label htmlFor='ledger-search-dialog-currency' className={fieldLabelClassName}>币种</Label>
              <Select
                value={currencyFilter || '__all__'}
                onValueChange={(value) => onCurrencyFilterChange(value === '__all__' ? '' : value)}
                disabled={financeResources.isLoading || isCurrencyOptionsUnavailable}
              >
                <SelectTrigger id='ledger-search-dialog-currency' className={controlClassName}>
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
                <div className='text-[10px] font-bold text-muted-foreground/60'>币种字典加载中...</div>
              ) : null}
              {isCurrencyOptionsUnavailable ? (
                <div className='text-[10px] font-bold text-destructive'>币种字典加载失败，请稍后重试</div>
              ) : null}
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='ledger-search-dialog-outstanding-min' className={fieldLabelClassName}>{outstandingLabel}最小值</Label>
              <Input
                id='ledger-search-dialog-outstanding-min'
                type='number'
                value={outstandingMin}
                onChange={(event) => onOutstandingMinChange(event.target.value)}
                className={controlClassName}
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='ledger-search-dialog-outstanding-max' className={fieldLabelClassName}>{outstandingLabel}最大值</Label>
              <Input
                id='ledger-search-dialog-outstanding-max'
                type='number'
                value={outstandingMax}
                onChange={(event) => onOutstandingMaxChange(event.target.value)}
                className={controlClassName}
              />
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='grid gap-2'>
              <Label htmlFor='ledger-search-dialog-sort-by' className={fieldLabelClassName}>排序字段</Label>
              <Select value={sortBy} onValueChange={onSortByChange}>
                <SelectTrigger id='ledger-search-dialog-sort-by' className={controlClassName}>
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
              <Label htmlFor='ledger-search-dialog-sort-order' className={fieldLabelClassName}>排序方向</Label>
              <Select value={sortOrder} onValueChange={onSortOrderChange}>
                <SelectTrigger id='ledger-search-dialog-sort-order' className={controlClassName}>
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

          <div className='overflow-hidden rounded-[24px] border border-dashed border-muted/60 bg-muted/5 shadow-inner'>
            <RadioGroup value={pendingLedgerId} onValueChange={setPendingLedgerId} className='gap-0'>
              <Table>
                <TableHeader className='bg-muted/20'>
                  <TableRow className='hover:bg-transparent'>
                    <TableHead className='h-10 w-14 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55'>选择</TableHead>
                    <TableHead className='h-10 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55'>台账编号</TableHead>
                    <TableHead className='h-10 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55'>{partnerLabel}</TableHead>
                    <TableHead className='h-10 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55'>币种</TableHead>
                    <TableHead className='h-10 px-4 text-right text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55'>{outstandingLabel}</TableHead>
                    <TableHead className='h-10 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55'>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.length > 0 ? (
                    searchResults.map((item) => (
                      <TableRow
                        key={item.id}
                        className='cursor-pointer border-muted/40 transition-colors hover:bg-muted/25'
                        onClick={() => setPendingLedgerId(item.id)}
                      >
                        <TableCell className='px-4 py-3'>
                          <RadioGroupItem value={item.id} />
                        </TableCell>
                        <TableCell className='px-4 py-3 text-xs font-black tracking-tight'>{item.documentNo}</TableCell>
                        <TableCell className='px-4 py-3 text-xs font-medium text-muted-foreground'>{item.partnerName}</TableCell>
                        <TableCell className='px-4 py-3 text-xs font-semibold text-muted-foreground'>{item.currency}</TableCell>
                        <TableCell className='px-4 py-3 text-right text-xs font-black tabular-nums'>{amountFormatter.format(item.outstandingAmount)}</TableCell>
                        <TableCell className='px-4 py-3 text-xs font-semibold text-muted-foreground'>{item.status}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className='h-20 text-center text-[11px] font-bold text-muted-foreground/50'>
                        {isSearching ? '正在搜索台账候选...' : '请输入至少 2 个字符进行搜索'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className='border-t border-dashed border-muted/60 bg-background px-6 py-4'>
          <Button
            type='button'
            variant='outline'
            className='h-10 rounded-full border-dashed px-5 text-[10px] font-black tracking-[0.14em]'
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type='button'
            className='h-10 rounded-full px-5 text-[10px] font-black tracking-[0.14em]'
            onClick={() => onConfirm(pendingLedgerId)}
            disabled={!canConfirm}
          >
            确认选择
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
