import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PRODUCTION_PLAN_STATUS_OPTIONS } from '../constants'
import {
  APS_CARD_SHELL_CLASS,
  APS_INPUT_CLASS,
  APS_KICKER_CLASS,
  APS_OUTLINE_BUTTON_CLASS,
  APS_PRIMARY_BUTTON_CLASS,
} from '../ui-classes'
import type { CuttingIssuanceFilterDraft } from '../types'

type FilterPanelProps = {
  filterDraft: CuttingIssuanceFilterDraft
  appliedFilterTags: string[]
  onFilterDraftChange: (next: CuttingIssuanceFilterDraft) => void
  onApplyFilters: () => void
  onResetFilters: () => void
}

export function FilterPanel(props: FilterPanelProps) {
  const { filterDraft, appliedFilterTags, onFilterDraftChange, onApplyFilters, onResetFilters } = props

  return (
    <section className={`${APS_CARD_SHELL_CLASS} p-4`}>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <p className={APS_KICKER_CLASS}>Execution Filters</p>
          <h3 className='mt-1 text-sm font-black tracking-tight text-foreground'>执行单筛选</h3>
          <p className='mt-1 text-xs text-muted-foreground/80'>按订单号、型号、孔数、状态、时间范围过滤数据。</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' className={APS_OUTLINE_BUTTON_CLASS} onClick={onResetFilters}>
            重置
          </Button>
          <Button className={APS_PRIMARY_BUTTON_CLASS} onClick={onApplyFilters}>
            应用筛选
          </Button>
        </div>
      </div>

      <div className='mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6'>
        <Input
          className={APS_INPUT_CLASS}
          placeholder='订单号'
          value={filterDraft.orderNo}
          onChange={(event) => onFilterDraftChange({ ...filterDraft, orderNo: event.target.value })}
        />
        <Input
          className={APS_INPUT_CLASS}
          placeholder='型号'
          value={filterDraft.productModel}
          onChange={(event) => onFilterDraftChange({ ...filterDraft, productModel: event.target.value })}
        />
        <Select
          value={filterDraft.status}
          onValueChange={(value) => onFilterDraftChange({ ...filterDraft, status: value })}
        >
          <SelectTrigger className={`${APS_INPUT_CLASS} w-full`}>
            <SelectValue placeholder='状态' />
          </SelectTrigger>
          <SelectContent>
            {PRODUCTION_PLAN_STATUS_OPTIONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className={APS_INPUT_CLASS}
          type='number'
          min={0}
          placeholder='孔数'
          value={filterDraft.holeCount}
          onChange={(event) => onFilterDraftChange({ ...filterDraft, holeCount: event.target.value })}
        />
        <Input
          className={APS_INPUT_CLASS}
          type='date'
          value={filterDraft.createdAtFrom}
          onChange={(event) => onFilterDraftChange({ ...filterDraft, createdAtFrom: event.target.value })}
        />
        <Input
          className={APS_INPUT_CLASS}
          type='date'
          value={filterDraft.createdAtTo}
          onChange={(event) => onFilterDraftChange({ ...filterDraft, createdAtTo: event.target.value })}
        />
      </div>

      <div className='mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground'>
        {appliedFilterTags.length ? (
          appliedFilterTags.map((tag) => (
            <span
              key={tag}
              className='rounded-full border border-dashed border-cyan-500/25 bg-cyan-500/5 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-700/80'
            >
              {tag}
            </span>
          ))
        ) : (
          <span className='text-xs text-muted-foreground/70'>当前未应用筛选条件。</span>
        )}
      </div>
    </section>
  )
}
