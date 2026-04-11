import { type ChangeEvent, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createLogger } from '@/lib/logger'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import {
  EmployeeTransactionService,
  type EmployeeImportMode,
  type EmployeeImportPreviewItem,
  type EmployeeImportPreviewResponse,
} from '../services/employee-transaction-service'
import { downloadPersonnelTemplate } from '../utils/personnel-import-utils'

const logger = createLogger('ImportPersonnelDialog')

function buildPreviewNames(
  employees: EmployeeImportPreviewItem[],
  fallback: string,
  limit = 3,
) {
  const names = employees
    .slice(0, limit)
    .map((employee) => employee.name || employee.staffId || fallback)
    .filter(Boolean)

  return {
    names: names.join(' / '),
    extra: Math.max(employees.length - limit, 0),
  }
}

type ImportPersonnelDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ImportPersonnelDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportPersonnelDialogProps) {
  const { locale, t } = useLanguage()
  const isChinese = locale === 'zh-CN'
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<EmployeeImportPreviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importMode, setImportMode] = useState<EmployeeImportMode>('add-only')
  const [confirmImpact, setConfirmImpact] = useState(false)

  const reset = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    setIsParsing(false)
    setIsImporting(false)
    setImportMode('add-only')
    setConfirmImpact(false)
  }

  const executionPlan = useMemo(() => {
    const createCount = preview?.createCount ?? 0
    const updateCount = importMode === 'sync' ? preview?.updateCount ?? 0 : 0
    const payloadCount = importMode === 'sync' ? (preview?.importedCount ?? 0) : createCount
    const skippedCount = importMode === 'add-only' ? preview?.updateCount ?? 0 : 0

    return {
      payloadCount,
      createCount,
      updateCount,
      skippedCount,
    }
  }, [importMode, preview])

  const newPreview = useMemo(
    () => buildPreviewNames(preview?.newEmployees ?? [], isChinese ? '新人员' : 'New employee'),
    [preview, isChinese],
  )
  const updatePreview = useMemo(
    () => buildPreviewNames(preview?.existingEmployees ?? [], isChinese ? '待更新人员' : 'Matched employee'),
    [preview, isChinese],
  )
  const missingPreview = useMemo(
    () => buildPreviewNames(preview?.missingEmployees ?? [], isChinese ? '缺失人员' : 'Missing employee'),
    [preview, isChinese],
  )

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    reset()
    setFile(selectedFile)
    setIsParsing(true)

    try {
      const nextPreview = await EmployeeTransactionService.previewEmployeeImport(selectedFile)
      setPreview(nextPreview)
      setError(null)
    } catch (err) {
      logger.error('Preview failed', err)
      setError(err instanceof Error ? err.message : t('orgPersonnel.importDialog.parseFailed'))
    } finally {
      setIsParsing(false)
    }
  }

  const startImport = async () => {
    if (!preview || error) return
    setIsImporting(true)

    try {
      const result = await EmployeeTransactionService.commitEmployeeImport(preview.previewToken, importMode)

      toast.success(
        importMode === 'add-only'
          ? isChinese
            ? `已新增导入 ${result.created} 人，跳过 ${result.skipped} 名已存在人员。`
            : `Imported ${result.created} new employees and skipped ${result.skipped} existing matches.`
          : isChinese
            ? `已批量同步 ${result.count} 人，其中新增 ${result.created} 人、更新 ${result.updated} 人。`
            : `Synced ${result.count} employees: ${result.created} created, ${result.updated} updated.`
      )

      onSuccess?.()
      onOpenChange(false)
      reset()
    } catch (err) {
      logger.error('Commit failed', err)
      toast.error(
        t('orgPersonnel.importDialog.importFailed', {
          message: err instanceof Error ? err.message : 'Unknown error',
        }),
      )
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset()
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className='sm:max-w-2xl rounded-[32px] border-none shadow-2xl p-0 gap-0 overflow-hidden bg-background'>
        <DialogHeader className='text-start bg-muted/5 p-8 border-b border-dashed border-muted/50'>
          <DialogTitle className='text-lg font-black tracking-tighter italic uppercase flex items-center gap-2'>
            <FileSpreadsheet className='size-5 text-blue-600' />
            {t('orgPersonnel.importDialog.title')}
          </DialogTitle>
          <DialogDescription className='text-[9px] font-black uppercase tracking-widest opacity-60 flex items-center justify-between'>
            <span>{t('orgPersonnel.importDialog.description')}</span>
            <Button
              variant='link'
              size='sm'
              className='h-auto p-0 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 underline underline-offset-4'
              onClick={() => downloadPersonnelTemplate(locale)}
            >
              <FileSpreadsheet className='mr-1 size-3' /> {t('orgPersonnel.importDialog.downloadTemplate')}
            </Button>
          </DialogDescription>
        </DialogHeader>

        <div className='p-8 space-y-6'>
          {!file ? (
            <label className='flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-muted/50 rounded-[24px] bg-muted/20 hover:bg-muted/30 transition-all cursor-pointer group'>
              <div className='flex flex-col items-center justify-center pt-5 pb-6'>
                <div className='p-4 rounded-full bg-blue-500/10 mb-4 group-hover:scale-110 transition-transform'>
                  <Upload className='size-8 text-blue-600' />
                </div>
                <p className='text-sm font-black uppercase tracking-tighter italic'>
                  {t('orgPersonnel.importDialog.clickToUpload')}
                </p>
                <p className='text-[10px] mt-2 font-black uppercase tracking-widest opacity-40'>
                  {t('orgPersonnel.importDialog.support')}
                </p>
              </div>
              <input type='file' className='hidden' accept='.xlsx' onChange={handleFileChange} />
            </label>
          ) : (
            <div className='space-y-4 animate-in fade-in slide-in-from-bottom-2'>
              {error ? (
                <div className='flex items-start justify-between p-4 rounded-2xl bg-rose-50 border border-rose-200'>
                  <div className='flex items-start gap-3'>
                    <AlertCircle className='size-5 text-rose-500 mt-0.5' />
                    <div className='overflow-hidden'>
                      <p className='text-[11px] font-bold text-rose-900 uppercase'>
                        {t('orgPersonnel.importDialog.auditFailed')}
                      </p>
                      <pre className='text-[10px] text-rose-600 mt-1.5 leading-relaxed font-mono whitespace-pre-wrap break-all'>
                        {error}
                      </pre>
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='text-[10px] font-black uppercase text-rose-600 hover:bg-rose-100 hover:text-rose-700 shrink-0'
                    onClick={reset}
                  >
                    {t('orgPersonnel.importDialog.retry')}
                  </Button>
                </div>
              ) : (
                <div className='flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20'>
                  <div className='flex items-center gap-3'>
                    <CheckCircle2 className='size-5 text-emerald-500' />
                    <div>
                      <p className='text-xs font-bold text-emerald-950 uppercase'>{preview?.fileName || file.name}</p>
                      <p className='text-[10px] text-emerald-600/60 font-black tracking-widest uppercase'>
                        {t('orgPersonnel.importDialog.previewReady', {
                          sheetName: preview?.sheetName || '-',
                          count: preview?.importedCount ?? 0,
                        })}
                      </p>
                    </div>
                  </div>
                  <Button variant='ghost' size='sm' className='text-[10px] font-black uppercase' onClick={reset}>
                    {t('orgPersonnel.importDialog.changeFile')}
                  </Button>
                </div>
              )}

              {preview && !error ? (
                <div className='space-y-4'>
                  <div className='rounded-2xl border border-dashed border-muted overflow-hidden'>
                    <p className='bg-muted/30 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-dashed'>
                      {isChinese ? '导入模式' : 'Import mode'}
                    </p>
                    <div className='p-3'>
                      <RadioGroup
                        value={importMode}
                        onValueChange={(value) => {
                          setImportMode(value as EmployeeImportMode)
                          setConfirmImpact(false)
                        }}
                        className='grid gap-3 md:grid-cols-2'
                      >
                        <Label
                          htmlFor='employee-import-add-only'
                          className='items-start gap-3 rounded-2xl border border-dashed border-emerald-300/60 bg-emerald-50/40 p-4 cursor-pointer'
                        >
                          <RadioGroupItem id='employee-import-add-only' value='add-only' className='mt-0.5' />
                          <div className='space-y-1'>
                            <p className='text-xs font-black text-emerald-900'>
                              {isChinese ? '只新增' : 'Add only'}
                            </p>
                            <p className='text-[10px] leading-relaxed text-emerald-700'>
                              {isChinese
                                ? '只导入系统里还不存在的工号；已存在人员会被跳过，不会覆盖老数据。'
                                : 'Only import staff IDs that do not already exist; matched employees are skipped.'}
                            </p>
                          </div>
                        </Label>

                        <Label
                          htmlFor='employee-import-sync'
                          className='items-start gap-3 rounded-2xl border border-dashed border-blue-300/60 bg-blue-50/40 p-4 cursor-pointer'
                        >
                          <RadioGroupItem id='employee-import-sync' value='sync' className='mt-0.5' />
                          <div className='space-y-1'>
                            <p className='text-xs font-black text-blue-900'>
                              {isChinese ? '批量同步（新增 + 更新）' : 'Sync (create + update)'}
                            </p>
                            <p className='text-[10px] leading-relaxed text-blue-700'>
                              {isChinese
                                ? '已存在工号会按 Excel 字段覆盖更新；Excel 缺失人员不会自动删除。'
                                : 'Existing staff IDs are updated from Excel fields; missing rows are not deleted automatically.'}
                            </p>
                          </div>
                        </Label>
                      </RadioGroup>
                    </div>
                  </div>

                  <div className='rounded-2xl border border-dashed border-muted overflow-hidden'>
                    <p className='bg-muted/30 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-dashed'>
                      {isChinese ? '差异预览' : 'Diff preview'}
                    </p>
                    <div className='grid gap-3 p-3 md:grid-cols-3'>
                      <div className='rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3'>
                        <p className='text-[9px] font-black uppercase tracking-widest text-emerald-600/70'>
                          {isChinese ? '将新增' : 'To create'}
                        </p>
                        <p className='mt-1 text-2xl font-black text-emerald-900'>{preview.createCount}</p>
                        {newPreview.names ? (
                          <p className='mt-2 text-[10px] leading-relaxed text-emerald-700'>
                            {newPreview.names}
                            {newPreview.extra > 0 ? ` +${newPreview.extra}` : ''}
                          </p>
                        ) : null}
                      </div>

                      <div className='rounded-2xl border border-blue-200 bg-blue-50/60 p-3'>
                        <p className='text-[9px] font-black uppercase tracking-widest text-blue-600/70'>
                          {isChinese ? 'Excel 命中现有人员' : 'Matched existing'}
                        </p>
                        <p className='mt-1 text-2xl font-black text-blue-900'>{preview.updateCount}</p>
                        {updatePreview.names ? (
                          <p className='mt-2 text-[10px] leading-relaxed text-blue-700'>
                            {updatePreview.names}
                            {updatePreview.extra > 0 ? ` +${updatePreview.extra}` : ''}
                          </p>
                        ) : null}
                      </div>

                      <div className='rounded-2xl border border-amber-200 bg-amber-50/60 p-3'>
                        <p className='text-[9px] font-black uppercase tracking-widest text-amber-700/70'>
                          {isChinese ? 'Excel 缺失但系统保留' : 'Missing in Excel, kept'}
                        </p>
                        <p className='mt-1 text-2xl font-black text-amber-900'>{preview.missingCount}</p>
                        {missingPreview.names ? (
                          <p className='mt-2 text-[10px] leading-relaxed text-amber-700'>
                            {missingPreview.names}
                            {missingPreview.extra > 0 ? ` +${missingPreview.extra}` : ''}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className='rounded-2xl border border-dashed border-muted overflow-hidden'>
                    <p className='bg-muted/30 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-dashed'>
                      {isChinese ? '执行预期' : 'Execution plan'}
                    </p>
                    <div className='p-3 space-y-3'>
                      <div className='rounded-2xl border border-dashed border-muted/60 bg-background p-3'>
                        <p className='text-[11px] font-black text-slate-800'>
                          {importMode === 'add-only'
                            ? isChinese
                              ? `本次将只新增 ${executionPlan.createCount} 人。`
                              : `This run will create ${executionPlan.createCount} employees only.`
                            : isChinese
                              ? `本次将同步 ${executionPlan.payloadCount} 人：新增 ${executionPlan.createCount} 人，更新 ${executionPlan.updateCount} 人。`
                              : `This run will sync ${executionPlan.payloadCount} employees: ${executionPlan.createCount} create, ${executionPlan.updateCount} update.`}
                        </p>
                        <p className='mt-2 text-[10px] leading-relaxed text-muted-foreground'>
                          {importMode === 'add-only'
                            ? isChinese
                              ? `系统中已存在的 ${executionPlan.skippedCount} 名同工号人员会被跳过，不会覆盖。`
                              : `${executionPlan.skippedCount} existing staff-ID matches will be skipped and left untouched.`
                            : isChinese
                              ? `Excel 中缺失的 ${preview.missingCount} 名人员不会自动删除或离职。`
                              : `${preview.missingCount} employees missing from Excel will not be deleted or resigned automatically.`}
                        </p>
                      </div>

                      <div className='rounded-2xl border border-amber-200 bg-amber-50/80 p-3'>
                        <Label htmlFor='employee-import-confirm' className='items-start gap-3 cursor-pointer'>
                          <Checkbox
                            id='employee-import-confirm'
                            checked={confirmImpact}
                            onCheckedChange={(checked) => setConfirmImpact(checked === true)}
                            className='mt-0.5'
                          />
                          <div className='space-y-1'>
                            <p className='text-[11px] font-black text-amber-900'>
                              {isChinese ? '我已确认本次导入规则' : 'I understand the import rules'}
                            </p>
                            <p className='text-[10px] leading-relaxed text-amber-700'>
                              {importMode === 'add-only'
                                ? isChinese
                                  ? '只新增模式不会修改已存在人员；重名工号会直接跳过。'
                                  : 'Add-only mode will not modify existing employees; matching staff IDs are skipped.'
                                : isChinese
                                  ? '批量同步模式会按 Excel 字段更新已存在人员，但不会自动删除 Excel 中缺失的人员。'
                                  : 'Sync mode updates matched employees from Excel fields, but it does not delete employees missing from the Excel file.'}
                            </p>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className='rounded-2xl border border-dashed border-muted overflow-hidden'>
                    <p className='bg-muted/30 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-dashed'>
                      {t('orgPersonnel.importDialog.preview')}
                    </p>
                    <ScrollArea className='h-32'>
                      <div className='p-3 space-y-2'>
                        {preview.previewRows.map((row, index) => (
                          <div
                            key={`${row.staffId}-${index}`}
                            className='flex gap-4 text-[10px] font-mono text-muted-foreground/80 border-b border-muted/20 pb-1 last:border-0'
                          >
                            <span className='w-[100px] shrink-0 font-bold text-primary'>{row.staffId || '-'}</span>
                            <span className='w-[80px] shrink-0 font-bold text-slate-700'>{row.name || '-'}</span>
                            <span className='w-[80px] shrink-0'>{row.gender || '-'}</span>
                            <span className='truncate'>{[row.deptName, row.positionName, row.phone].filter(Boolean).join(' / ') || '-'}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              ) : null}

              <div className='flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10'>
                <AlertCircle className='size-4 text-amber-500 shrink-0 mt-0.5' />
                <p className='text-[9px] text-amber-700 font-medium leading-relaxed italic'>
                  {t('orgPersonnel.importDialog.warning')}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className='p-6 bg-muted/5 border-t border-dashed border-muted/50'>
          <Button
            variant='ghost'
            onClick={() => onOpenChange(false)}
            className='h-11 px-8 font-black text-[10px] uppercase tracking-widest'
          >
            {t('orgPersonnel.importDialog.cancel')}
          </Button>
          <Button
            onClick={startImport}
            disabled={!preview || isImporting || isParsing || !!error || !confirmImpact}
            className='rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all'
          >
            {isImporting
              ? t('orgPersonnel.importDialog.syncing')
              : importMode === 'add-only'
                ? isChinese
                  ? `只新增 ${executionPlan.createCount} 人`
                  : `Add ${executionPlan.createCount}`
                : isChinese
                  ? `同步 ${executionPlan.payloadCount} 人`
                  : `Sync ${executionPlan.payloadCount}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
