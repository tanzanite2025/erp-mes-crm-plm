import {
  Plus,
  PackageSearch,
  RefreshCw,
  Send,
  AlertCircle,
  History,
  Database,
  Search,
} from 'lucide-react'
import { auditUtils } from '@/lib/audit-utils'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useStocktakeMgmtViewModel } from '../hooks/use-stocktake-mgmt-view-model'
import { type StocktakeItem } from '../stocktake'
import { getStocktakeStatusMeta } from '../utils/warehouse-status-display'

export function StocktakeMgmt() {
  const { t } = useLanguage()
  const {
    readResource,
    itemsResource,
    tasks,
    isLoading,
    selectedTask,
    items,
    itemsLoading,
    stocktakeCategories,
    isCreateOpen,
    adjustmentConfirmOpen,
    isCreating,
    isSubmittingAdjustment,
    canSubmitAdjustment,
    handleRefresh,
    handleSelectTask,
    handleCreateDialogOpenChange,
    handleCreateTaskSubmit,
    handleRequestAdjustmentSubmission,
    handleAdjustmentConfirmOpenChange,
    handleConfirmAdjustmentSubmission,
    retryRead,
    retryItems,
  } = useStocktakeMgmtViewModel()

  if (readResource.status === 'error' && isForbiddenError(readResource.error)) {
    return <ForbiddenState />
  }

  if (readResource.status === 'error') {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <IndustrialHeader
          title={t('warehouse.stocktake.title')}
          description={t('warehouse.stocktake.subtitle')}
          icon={PackageSearch}
        />
        <div className='flex min-h-[360px] flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-500/25 bg-rose-500/3 px-6 text-center'>
          <p className='text-[10px] font-black tracking-widest text-rose-700 uppercase'>
            盘点基础数据加载失败
          </p>
          <p className='mt-3 max-w-2xl text-[11px] leading-5 font-bold text-rose-700/80'>
            {readResource.error.message || '请重试后再查看盘点任务。'}
          </p>
          <Button
            type='button'
            variant='outline'
            className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black tracking-widest uppercase'
            onClick={() => {
              void retryRead()
            }}
          >
            重试
          </Button>
        </div>
      </div>
    )
  }

  if (readResource.status === 'loading') {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <IndustrialHeader
          title={t('warehouse.stocktake.title')}
          description={t('warehouse.stocktake.subtitle')}
          icon={PackageSearch}
        />
        <div className='flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 px-6 text-center'>
          <RefreshCw className='size-8 animate-spin text-primary/40' />
          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            盘点基础数据加载中
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        title={t('warehouse.stocktake.title')}
        description={t('warehouse.stocktake.subtitle')}
        icon={PackageSearch}
      />

      <div className='flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center'>
        <div className='flex w-full items-center gap-2 overflow-hidden rounded-full border border-dashed border-muted/50 bg-muted/10 px-3 py-2 text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase sm:w-auto md:px-4 md:text-[10px]'>
          <AlertCircle className='size-3 shrink-0 md:size-3.5' />
          <span className='truncate'>
            {t('warehouse.stocktake.autoFreeze')}
          </span>
        </div>
        <div className='flex items-center justify-end gap-2 md:gap-3'>
          <Button
            variant='ghost'
            size='icon'
            onClick={handleRefresh}
            className='size-9 shrink-0 rounded-full hover:bg-muted md:size-10'
          >
            <RefreshCw
              className={cn(
                'size-3.5 text-muted-foreground md:size-4',
                isLoading && 'animate-spin'
              )}
            />
          </Button>
          <Dialog
            open={isCreateOpen}
            onOpenChange={handleCreateDialogOpenChange}
          >
            <DialogTrigger asChild>
              <Button className='h-10 shrink-0 gap-2 rounded-full px-4 text-[9px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all active:scale-95 md:h-11 md:px-6 md:text-[10px]'>
                <Plus className='size-3.5 md:size-4' />
                <span className='truncate'>
                  {t('warehouse.stocktake.initiate')}
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className='w-[95vw] overflow-hidden rounded-2xl border-none p-0 shadow-2xl sm:max-w-[480px] md:rounded-[32px]'>
              <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-blue-600/5 via-transparent' />
              <form
                onSubmit={handleCreateTaskSubmit}
                className='relative p-5 md:p-8'
              >
                <DialogHeader className='mb-6 text-left md:mb-8'>
                  <DialogTitle className='truncate text-lg font-black tracking-tighter uppercase md:text-xl'>
                    {t('warehouse.stocktake.createDialog.title')}
                  </DialogTitle>
                  <p className='truncate text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[10px]'>
                    {t('warehouse.stocktake.createDialog.subtitle')}
                  </p>
                </DialogHeader>

                <div className='space-y-4 md:space-y-6'>
                  <div className='space-y-2 md:space-y-3'>
                    <Label className='block text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase md:text-[10px]'>
                      {t('warehouse.stocktake.createDialog.sessionTitleLabel')}
                    </Label>
                    <Input
                      name='title'
                      placeholder={t(
                        'warehouse.stocktake.createDialog.sessionTitlePlaceholder'
                      )}
                      required
                      className='h-10 rounded-xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner focus-visible:ring-blue-600 md:h-11 md:px-5 md:text-sm'
                    />
                  </div>
                  <div className='space-y-2 md:space-y-3'>
                    <Label className='block text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase md:text-[10px]'>
                      {t('warehouse.stocktake.createDialog.scopeLabel')}
                    </Label>
                    <Select name='category' required>
                      <SelectTrigger className='h-10 rounded-xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner focus:ring-blue-600 md:h-11 md:px-5 md:text-sm'>
                        <SelectValue
                          placeholder={t(
                            'warehouse.stocktake.createDialog.selectCategory'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent className='rounded-xl border-none p-1 shadow-2xl md:p-2'>
                        {stocktakeCategories.length === 0 ? (
                          <SelectItem
                            value='_'
                            disabled
                            className='text-[9px] md:text-[10px]'
                          >
                            {t('warehouse.stocktake.createDialog.noCategories')}
                          </SelectItem>
                        ) : (
                          stocktakeCategories.map(
                            (cat: { code: string; name: string }) => (
                              <SelectItem
                                key={cat.code}
                                value={cat.code}
                                className='rounded-lg py-2 text-[9px] font-black tracking-widest uppercase md:py-2.5 md:text-[10px]'
                              >
                                {cat.name} ({cat.code})
                              </SelectItem>
                            )
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <div className='flex items-start gap-2 rounded-xl border border-dashed border-amber-500/20 bg-amber-500/5 p-2.5 md:gap-2.5 md:p-3'>
                      <AlertCircle className='mt-0.5 size-3 shrink-0 text-amber-500 md:size-3.5' />
                      <p className='text-[8px] leading-relaxed font-bold tracking-widest text-amber-600/80 uppercase md:text-[9px]'>
                        {t('warehouse.stocktake.createDialog.freezeHint')}
                      </p>
                    </div>
                  </div>
                  <div className='space-y-2 md:space-y-3'>
                    <Label className='block text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase md:text-[10px]'>
                      {t('warehouse.stocktake.createDialog.remarksLabel')}
                    </Label>
                    <Input
                      name='remarks'
                      placeholder={t(
                        'warehouse.stocktake.createDialog.remarksPlaceholder'
                      )}
                      className='h-10 rounded-xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner focus-visible:ring-blue-600 md:h-11 md:px-5 md:text-sm'
                    />
                  </div>
                </div>
                <div className='mt-6 flex gap-4 md:mt-8'>
                  <Button
                    type='submit'
                    disabled={isCreating}
                    className='h-10 flex-1 rounded-full bg-blue-600 text-[9px] font-black tracking-widest uppercase shadow-lg shadow-blue-500/20 transition-all active:scale-95 md:h-11 md:text-[10px]'
                  >
                    {isCreating
                      ? t('warehouse.stocktake.createDialog.creating')
                      : t('warehouse.stocktake.createDialog.start')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className='flex flex-col items-start gap-8 lg:grid lg:grid-cols-12'>
        <div className='relative h-fit w-full rounded-2xl border border-dashed border-muted/50 bg-muted/5 p-4 shadow-inner transition-all hover:bg-muted/10 md:rounded-[32px] md:p-6 lg:col-span-4'>
          <div className='absolute top-0 left-6 flex -translate-y-1/2 items-center gap-2 rounded-full border border-dashed border-muted/80 bg-background px-3 py-1 md:left-12 md:px-4'>
            <History className='size-3 text-muted-foreground/60' />
            <span className='truncate text-[8px] font-black tracking-widest text-muted-foreground/60 uppercase italic md:text-[10px]'>
              {t('warehouse.stocktake.queueTitle')}
            </span>
          </div>

          <ScrollArea className='h-auto max-h-[400px] pr-2 md:pr-4 lg:h-[650px] lg:max-h-[650px]'>
            {tasks?.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-20 text-center'>
                <Database className='mb-4 size-12 opacity-5' />
                <p className='text-[10px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                  {t('warehouse.stocktake.noTasks')}
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                {tasks?.map((task) => {
                  const creatorName =
                    auditUtils.formatOperatorName(task.createdBy) ||
                    task.createdBy
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleSelectTask(task)}
                      className={cn(
                        'group relative cursor-pointer rounded-[24px] border border-muted/60 p-5 transition-all',
                        selectedTask?.id === task.id
                          ? 'scale-[1.02] border-blue-500/50 bg-background shadow-xl ring-4 ring-blue-500/5'
                          : 'bg-card/40 hover:border-blue-500/30 hover:bg-background/60 hover:shadow-lg'
                      )}
                    >
                      <div className='mb-3 flex items-start justify-between'>
                        <h4 className='text-sm font-black tracking-tighter text-foreground uppercase italic transition-colors group-hover:text-blue-600'>
                          {task.title}
                        </h4>
                        <div className='origin-top-right scale-75'>
                          <AuditStatusDisplay
                            meta={getStocktakeStatusMeta(t, task.status)}
                            badgeClassName='h-5 px-3'
                          />
                        </div>
                      </div>
                      <div className='mt-4 flex items-center gap-4 border-t border-dashed border-muted/50 pt-4'>
                        <div className='flex flex-col'>
                          <span className='text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                            {t('warehouse.stocktake.areaCode')}
                          </span>
                          <span className='font-mono text-[10px] font-black text-muted-foreground'>
                            {task.warehouseCategoryCode}
                          </span>
                        </div>
                        <div className='ml-auto flex flex-col text-right'>
                          <span className='text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                            {t('warehouse.stocktake.creator')}
                          </span>
                          <span className='text-[10px] font-black text-muted-foreground'>
                            {creatorName}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className='relative w-full lg:col-span-8'>
          {selectedTask ? (
            <div className='overflow-hidden rounded-2xl border border-dashed border-muted/50 bg-muted/5 shadow-inner md:rounded-[32px]'>
              <div className='flex flex-col items-stretch justify-between gap-4 border-b border-dashed border-muted/50 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center md:px-8 md:py-6'>
                <div className='space-y-0.5 overflow-hidden'>
                  <div className='flex items-center gap-3'>
                    <div className='h-4 w-1 shrink-0 rounded-full bg-blue-600 md:h-5' />
                    <h3 className='truncate text-sm font-black tracking-tighter text-foreground uppercase italic'>
                      {selectedTask.title}
                    </h3>
                  </div>
                  <p className='ml-[16px] truncate text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:text-[9px]'>
                    {t('warehouse.stocktake.detailSubtitle', {
                      count: items?.length || 0,
                    })}
                  </p>
                </div>
                {canSubmitAdjustment && (
                  <Button
                    onClick={handleRequestAdjustmentSubmission}
                    disabled={isSubmittingAdjustment}
                    className='h-9 shrink-0 gap-2 self-start rounded-full bg-amber-600 px-4 text-[9px] font-black tracking-widest uppercase shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-700 active:scale-95 sm:self-auto md:h-10 md:px-6 md:text-[10px]'
                  >
                    <Send className='size-3 md:size-3.5' />{' '}
                    {t('warehouse.stocktake.submitRecon')}
                  </Button>
                )}
              </div>

              <div className='scrollbar-hide overflow-x-auto p-0'>
                <ScrollArea className='h-auto max-h-[620px] lg:h-[620px]'>
                  {itemsResource.status === 'error' ? (
                    <div className='flex h-[420px] flex-col items-center justify-center px-6 text-center'>
                      <AlertCircle className='size-8 text-rose-500' />
                      <p className='mt-4 text-[10px] font-black tracking-widest text-rose-700 uppercase'>
                        盘点明细加载失败
                      </p>
                      <p className='mt-3 max-w-lg text-[11px] leading-5 font-bold text-rose-700/80'>
                        {itemsResource.error.message ||
                          '请重试后再查看盘点明细。'}
                      </p>
                      <Button
                        type='button'
                        variant='outline'
                        className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black tracking-widest uppercase'
                        onClick={() => {
                          void retryItems()
                        }}
                      >
                        重试
                      </Button>
                    </div>
                  ) : (
                    <Table className='min-w-[700px] md:min-w-0'>
                      <TableHeader className='h-12 bg-muted/30 md:h-14'>
                        <TableRow className='border-b border-dashed border-muted/50 hover:bg-transparent'>
                          <TableHead className='pl-5 text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:pl-8 md:text-[10px]'>
                            {t('warehouse.stocktake.columns.nodeContext')}
                          </TableHead>
                          <TableHead className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[10px]'>
                            {t('warehouse.stocktake.columns.batch')}
                          </TableHead>
                          <TableHead className='text-right text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[10px]'>
                            {t('warehouse.stocktake.columns.theory')}
                          </TableHead>
                          <TableHead className='text-right text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[10px]'>
                            {t('warehouse.stocktake.columns.actual')}
                          </TableHead>
                          <TableHead className='pr-5 text-right text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:pr-8 md:text-[10px]'>
                            {t('warehouse.stocktake.columns.variance')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemsLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className='h-64 text-center'>
                              <RefreshCw className='mx-auto size-8 animate-spin text-blue-600 opacity-20' />
                            </TableCell>
                          </TableRow>
                        ) : (
                          items.map((item: StocktakeItem) => (
                            <TableRow
                              key={item.id}
                              className='group border-muted/50 transition-colors hover:bg-muted/30'
                            >
                              <TableCell className='py-2 pl-5 md:py-2.5 md:pl-8'>
                                <div className='flex max-w-[150px] flex-col overflow-hidden md:max-w-none'>
                                  <span className='truncate text-[11px] font-bold tracking-tight text-foreground/90 uppercase transition-colors group-hover:text-blue-600 md:text-[12px]'>
                                    {item.materialName}
                                  </span>
                                  <span className='truncate font-mono text-[7px] tracking-widest text-muted-foreground/30 uppercase md:text-[8px]'>
                                    {item.materialCode}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className='py-2 md:py-2.5'>
                                <span className='inline-flex h-3.5 items-center rounded-full bg-muted/30 px-1.5 text-[7px] font-black tracking-widest whitespace-nowrap uppercase shadow-sm md:px-2 md:text-[8px]'>
                                  {item.batchNo ||
                                    t('warehouse.stocktake.noBatch')}
                                </span>
                              </TableCell>
                              <TableCell className='py-2 text-right font-mono text-[10px] font-bold whitespace-nowrap text-muted-foreground/60 md:py-2.5 md:text-[11px]'>
                                {item.theoryQty}{' '}
                                <span className='text-[7px] tracking-tighter uppercase'>
                                  {item.uom}
                                </span>
                              </TableCell>
                              <TableCell className='py-2 text-right font-mono text-xs font-black whitespace-nowrap text-blue-600 md:py-2.5 md:text-sm'>
                                {item.actualQty}{' '}
                                <span className='text-[7px] tracking-tighter text-blue-400 uppercase'>
                                  {item.uom}
                                </span>
                              </TableCell>
                              <TableCell className='py-2 pr-5 text-right md:py-2.5 md:pr-8'>
                                <div
                                  className={cn(
                                    'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] font-black md:px-2 md:text-[10px]',
                                    item.difference > 0
                                      ? 'bg-emerald-500/10 text-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                                      : item.difference < 0
                                        ? 'bg-rose-500/10 text-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.1)]'
                                        : 'bg-muted text-muted-foreground/30'
                                  )}
                                >
                                  {item.difference > 0 ? '+' : ''}
                                  {item.difference}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className='flex h-auto min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted/40 bg-muted/5 p-8 text-center md:rounded-[32px] md:p-12 lg:h-[734px]'>
              <div className='relative mb-6 md:mb-8'>
                <Search className='size-16 opacity-5 md:size-24' />
                <div className='absolute inset-0 flex items-center justify-center'>
                  <Database className='size-8 animate-pulse opacity-10 md:size-10' />
                </div>
              </div>
              <h4 className='mb-2 text-lg font-black tracking-tighter text-muted-foreground/40 uppercase md:text-xl'>
                {t('warehouse.stocktake.idleTitle')}
              </h4>
              <p className='max-w-xs text-[9px] font-black tracking-widest text-muted-foreground/20 uppercase md:text-[10px]'>
                {t('warehouse.stocktake.idleHint')}
              </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={adjustmentConfirmOpen}
        onOpenChange={handleAdjustmentConfirmOpenChange}
        title={t('warehouse.adjustment.execute')}
        desc={t('warehouse.stocktake.toast.posting')} // Reuse or specific desc if needed
        confirmText={t('warehouse.stocktake.submitRecon')}
        handleConfirm={handleConfirmAdjustmentSubmission}
        isLoading={isSubmittingAdjustment}
      />
    </div>
  )
}
