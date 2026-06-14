'use client'

import { useState } from 'react'
import {
  Plus,
  RefreshCw,
  Settings2,
  Hash,
  ShieldCheck,
  AlertCircle,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { isConflictError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
import { ForbiddenState } from '@/components/forbidden-state'
import { type NumberingRule } from '../data/schema'
import { useNumberingRules } from '../hooks/use-numbering-rules'

interface SequenceMgmtProps {
  hideHeader?: boolean
}

export function SequenceMgmt({ hideHeader = false }: SequenceMgmtProps) {
  const { t } = useLanguage()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Partial<NumberingRule> | null>(
    null
  )
  const { rules, isLoading, error, refreshRules, saveRule, isSaving } =
    useNumberingRules()

  const getResetPeriodLabel = (period: NumberingRule['resetPeriod']) => {
    if (period === 'MONTHLY')
      return t('basicSettings.sequences.table.resetPeriod.monthly')
    if (period === 'YEARLY')
      return t('basicSettings.sequences.table.resetPeriod.yearly')
    return t('basicSettings.sequences.table.resetPeriod.never')
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  const handleSaveRule = async () => {
    if (!editingRule?.ruleKey || !editingRule?.pattern) {
      toast.error(t('basicSettings.sequences.toast.requiredMissing'))
      return
    }

    if (!editingRule.pattern.includes('{SEQ}')) {
      toast.error(t('basicSettings.sequences.toast.patternMissingSeq'))
      return
    }

    try {
      await saveRule(editingRule)
      toast.success(t('basicSettings.sequences.toast.saveSuccess'))
      setIsDialogOpen(false)
    } catch (error: unknown) {
      if (isConflictError(error)) {
        toast.error(t('basicSettings.sequences.toast.conflict'))
        return
      }

      const message =
        error instanceof Error
          ? error.message
          : t('basicSettings.sequences.toast.unknown')
      toast.error(t('basicSettings.sequences.toast.saveFailed', { message }))
    }
  }

  const openEditDialog = (
    rule: Partial<NumberingRule> = {
      ruleKey: '',
      prefix: '',
      pattern: '{PREFIX}{YYMM}{SEQ}',
      padding: 4,
      resetPeriod: 'MONTHLY',
    }
  ) => {
    setEditingRule(rule)
    setIsDialogOpen(true)
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      {!hideHeader && (
        <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-4 md:p-6'>
          <div className='flex items-center gap-2 text-primary'>
            <Hash className='size-4 text-primary' />
            <h3 className='text-lg font-black tracking-tighter uppercase italic'>
              {t('basicSettings.sequences.page.title')}
            </h3>
          </div>
          <p className='text-[9px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
            {t('basicSettings.sequences.page.subtitle')}
          </p>
        </div>
      )}

      <div className='flex flex-col items-start justify-between gap-4 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4 sm:flex-row sm:items-center sm:gap-6 md:p-6'>
        <Alert className='max-w-2xl rounded-[24px] border-dashed border-blue-500/20 bg-blue-500/5 py-4 shadow-none'>
          <ShieldCheck className='mt-1 size-4 text-blue-600' />
          <div className='ml-3 flex-1'>
            <AlertTitle className='text-[10px] font-black tracking-widest text-blue-700 uppercase italic'>
              {t('basicSettings.sequences.syncGuard.title')}
            </AlertTitle>
            <AlertDescription className='mt-1 text-[11px] leading-relaxed font-bold text-blue-800/60'>
              {t('basicSettings.sequences.syncGuard.description')}
            </AlertDescription>
          </div>
        </Alert>

        <div className='flex w-full flex-col gap-3 sm:w-auto sm:flex-row'>
          <Button
            variant='ghost'
            onClick={() => void refreshRules()}
            disabled={isLoading}
            className='h-11 w-full rounded-full px-8 text-[10px] font-black tracking-widest uppercase transition-all hover:bg-muted sm:w-auto'
          >
            <RefreshCw
              className={`mr-2 size-4 ${isLoading ? 'animate-spin' : ''}`}
            />{' '}
            {t('basicSettings.sequences.actions.refresh')}
          </Button>
          <Button
            onClick={() => openEditDialog()}
            className='h-11 w-full rounded-full bg-primary px-6 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-primary/20 transition-all active:scale-95 sm:w-auto md:px-10'
          >
            <Plus className='mr-2 size-4' />{' '}
            {t('basicSettings.sequences.actions.addRule')}
          </Button>
        </div>
      </div>

      <div className='no-scrollbar overflow-x-auto rounded-[24px] border border-dashed bg-muted/5'>
        <Table>
          <TableHeader className='h-14 bg-muted/30'>
            <TableRow className='border-b border-dashed border-muted/50 hover:bg-transparent'>
              <TableHead className='pl-8 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('basicSettings.sequences.table.headers.ruleKey')}
              </TableHead>
              <TableHead className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('basicSettings.sequences.table.headers.prefix')}
              </TableHead>
              <TableHead className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('basicSettings.sequences.table.headers.pattern')}
              </TableHead>
              <TableHead className='text-center text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('basicSettings.sequences.table.headers.seq')}
              </TableHead>
              <TableHead className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('basicSettings.sequences.table.headers.reset')}
              </TableHead>
              <TableHead className='min-w-[100px] pr-8 text-right text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('basicSettings.sequences.table.headers.action')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length > 0 ? (
              rules.map((rule) => (
                <TableRow
                  key={rule.ruleKey}
                  className='h-16 border-b transition-colors last:border-0 hover:bg-muted/5'
                >
                  <TableCell className='pl-8 font-mono text-xs font-black text-primary/80'>
                    {rule.ruleKey}
                  </TableCell>
                  <TableCell className='text-xs font-black'>
                    {rule.prefix || '-'}
                  </TableCell>
                  <TableCell>
                    <code className='rounded border border-dashed bg-background px-2 py-0.5 font-mono text-[10px] font-black text-muted-foreground uppercase'>
                      {rule.pattern}
                    </code>
                  </TableCell>
                  <TableCell className='text-center text-sm font-black text-primary tabular-nums'>
                    {rule.currentSeq}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant='secondary'
                      className='h-5 rounded-full border-none bg-muted/50 px-3 text-[9px] font-black tracking-tighter text-muted-foreground uppercase'
                    >
                      {getResetPeriodLabel(rule.resetPeriod)}
                    </Badge>
                  </TableCell>
                  <TableCell className='pr-8 text-right'>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => openEditDialog(rule)}
                      className='size-9 rounded-full hover:bg-muted'
                    >
                      <Settings2 className='size-4 text-muted-foreground' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className='h-64 text-center'>
                  <div className='flex flex-col items-center justify-center opacity-20'>
                    <AlertCircle className='mb-4 size-12' />
                    <p className='text-[11px] font-black tracking-widest uppercase'>
                      {isLoading
                        ? t('basicSettings.sequences.table.emptyLoading')
                        : t('basicSettings.sequences.table.emptyNoRules')}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='overflow-hidden rounded-[32px] border-none p-0 shadow-2xl sm:max-w-[500px]'>
          <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent' />
          <DialogHeader className='relative z-10 p-8 pb-4'>
            <DialogTitle className='text-xl font-black tracking-tight uppercase italic'>
              {editingRule?.id
                ? t('basicSettings.sequences.dialog.editTitle')
                : t('basicSettings.sequences.dialog.createTitle')}
            </DialogTitle>
            <DialogDescription className='mt-2 text-[10px] leading-relaxed font-black tracking-widest text-muted-foreground/60 uppercase'>
              {t('basicSettings.sequences.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className='relative z-10 space-y-6 p-8 pt-4'>
            <div className='space-y-3'>
              <Label className='pl-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'>
                {t('basicSettings.sequences.dialog.labels.ruleKey')}
              </Label>
              <Input
                className='h-12 rounded-2xl border-none bg-muted/50 text-sm font-black tabular-nums transition-all focus:ring-1 focus:ring-primary/20'
                value={editingRule?.ruleKey}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, ruleKey: e.target.value })
                }
                disabled={!!editingRule?.id}
                placeholder={t(
                  'basicSettings.sequences.dialog.placeholders.ruleKey'
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-6'>
              <div className='space-y-3'>
                <Label className='pl-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'>
                  {t('basicSettings.sequences.dialog.labels.prefix')}
                </Label>
                <Input
                  className='h-12 rounded-2xl border-none bg-muted/50 text-sm font-bold focus:ring-1 focus:ring-primary/20'
                  value={editingRule?.prefix}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, prefix: e.target.value })
                  }
                  placeholder={t(
                    'basicSettings.sequences.dialog.placeholders.prefix'
                  )}
                />
              </div>
              <div className='space-y-3'>
                <Label className='pl-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'>
                  {t('basicSettings.sequences.dialog.labels.padding')}
                </Label>
                <Input
                  type='number'
                  className='h-12 rounded-2xl border-none bg-muted/50 text-sm font-black focus:ring-1 focus:ring-primary/20'
                  value={editingRule?.padding}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      padding: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className='space-y-3'>
              <Label className='pl-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'>
                {t('basicSettings.sequences.dialog.labels.pattern')}
              </Label>
              <Input
                className='h-12 rounded-2xl border-none bg-muted/50 font-mono text-xs tabular-nums focus:ring-1 focus:ring-primary/20'
                value={editingRule?.pattern}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, pattern: e.target.value })
                }
                placeholder={t(
                  'basicSettings.sequences.dialog.placeholders.pattern'
                )}
              />
            </div>

            <div className='space-y-3'>
              <Label className='pl-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'>
                {t('basicSettings.sequences.dialog.labels.resetStrategy')}
              </Label>
              <Select
                value={editingRule?.resetPeriod}
                onValueChange={(val) =>
                  setEditingRule({
                    ...editingRule,
                    resetPeriod: val as NumberingRule['resetPeriod'],
                  })
                }
              >
                <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 text-sm font-bold focus:ring-1 focus:ring-primary/20'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='rounded-[24px] border-none p-2 shadow-2xl'>
                  <SelectItem
                    value='MONTHLY'
                    className='rounded-xl py-3 font-bold italic'
                  >
                    {t('basicSettings.sequences.dialog.resetOptions.monthly')}
                  </SelectItem>
                  <SelectItem
                    value='YEARLY'
                    className='rounded-xl py-3 font-bold italic'
                  >
                    {t('basicSettings.sequences.dialog.resetOptions.yearly')}
                  </SelectItem>
                  <SelectItem
                    value='NEVER'
                    className='rounded-xl py-3 font-bold italic'
                  >
                    {t('basicSettings.sequences.dialog.resetOptions.never')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className='flex gap-4 bg-transparent p-8 pt-0 sm:justify-between'>
            <Button
              variant='ghost'
              className='h-11 flex-1 rounded-full text-[10px] font-black tracking-widest uppercase transition-colors hover:bg-muted'
              onClick={() => setIsDialogOpen(false)}
            >
              {t('basicSettings.sequences.dialog.actions.cancel')}
            </Button>
            <Button
              className='h-11 flex-1 gap-2 rounded-full bg-primary text-[10px] font-black tracking-widest uppercase shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95'
              onClick={handleSaveRule}
              disabled={isSaving}
            >
              <Save className='size-4' />{' '}
              {isSaving
                ? t('basicSettings.sequences.dialog.actions.syncing')
                : t('basicSettings.sequences.dialog.actions.commit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
