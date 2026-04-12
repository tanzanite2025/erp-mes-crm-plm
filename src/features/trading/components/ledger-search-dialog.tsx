import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTradingFinanceResources } from '../hooks/use-trading-finance-resources'

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
      <DialogContent className='sm:max-w-5xl'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className='grid gap-4'>
          <div className='grid gap-2'>
            <Label htmlFor='ledger-search-dialog-keyword'>搜索台账</Label>
            <Input
              id='ledger-search-dialog-keyword'
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder='输入单据编号或往来方名称'
            />
          </div>

          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <div className='grid gap-2'>
              <Label htmlFor='ledger-search-dialog-status'>状态</Label>
              <Select value={statusFilter || '__all__'} onValueChange={(value) => onStatusFilterChange(value === '__all__' ? '' : value)}>
                <SelectTrigger id='ledger-search-dialog-status'>
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
              <Label htmlFor='ledger-search-dialog-currency'>币种</Label>
              <Select
                value={currencyFilter || '__all__'}
                onValueChange={(value) => onCurrencyFilterChange(value === '__all__' ? '' : value)}
                disabled={financeResources.isLoading || isCurrencyOptionsUnavailable}
              >
                <SelectTrigger id='ledger-search-dialog-currency'>
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
              {financeResources.isLoading ? <div className='text-xs text-muted-foreground'>币种字典加载中</div> : null}
              {isCurrencyOptionsUnavailable ? <div className='text-xs text-destructive'>币种字典加载失败，请稍后重试</div> : null}
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='ledger-search-dialog-outstanding-min'>{outstandingLabel}最小值</Label>
              <Input
                id='ledger-search-dialog-outstanding-min'
                type='number'
                value={outstandingMin}
                onChange={(event) => onOutstandingMinChange(event.target.value)}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='ledger-search-dialog-outstanding-max'>{outstandingLabel}最大值</Label>
              <Input
                id='ledger-search-dialog-outstanding-max'
                type='number'
                value={outstandingMax}
                onChange={(event) => onOutstandingMaxChange(event.target.value)}
              />
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='grid gap-2'>
              <Label htmlFor='ledger-search-dialog-sort-by'>排序字段</Label>
              <Select value={sortBy} onValueChange={onSortByChange}>
                <SelectTrigger id='ledger-search-dialog-sort-by'>
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
              <Label htmlFor='ledger-search-dialog-sort-order'>排序方向</Label>
              <Select value={sortOrder} onValueChange={onSortOrderChange}>
                <SelectTrigger id='ledger-search-dialog-sort-order'>
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

          <div className='rounded-md border'>
            <RadioGroup value={pendingLedgerId} onValueChange={setPendingLedgerId} className='gap-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-14'>选择</TableHead>
                    <TableHead>台账编号</TableHead>
                    <TableHead>{partnerLabel}</TableHead>
                    <TableHead>币种</TableHead>
                    <TableHead>{outstandingLabel}</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.length > 0 ? (
                    searchResults.map((item) => (
                      <TableRow
                        key={item.id}
                        className='cursor-pointer'
                        onClick={() => setPendingLedgerId(item.id)}
                      >
                        <TableCell>
                          <RadioGroupItem value={item.id} />
                        </TableCell>
                        <TableCell>{item.documentNo}</TableCell>
                        <TableCell>{item.partnerName}</TableCell>
                        <TableCell>{item.currency}</TableCell>
                        <TableCell>{item.outstandingAmount}</TableCell>
                        <TableCell>{item.status}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className='text-center text-sm text-muted-foreground'>
                        {isSearching ? '正在搜索台账候选...' : '请输入至少 2 个字符进行搜索'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type='button' onClick={() => onConfirm(pendingLedgerId)} disabled={!canConfirm}>
            确认选择
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
