import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQualityMutations } from '../hooks/use-quality'
import { canEditInspectionItemDeviationGrades } from '../services/configurable-inspection-deviation-grade-rules'
import {
  QualityCoreService,
  type QualityTask,
} from '../services/quality-core-service'

export function QualityInspectionMeasurementSubmissionDialog({
  task,
  onClose,
}: {
  task?: QualityTask
  onClose: () => void
}) {
  const { t } = useLanguage()
  const [standardId, setStandardId] = useState(task?.standardId ?? '')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [values, setValues] = useState<Record<string, string>>({})
  const [batchNo, setBatchNo] = useState(task?.batchNo ?? '')
  const [remarks, setRemarks] = useState('')
  const [saved, setSaved] = useState<QualityTask | null>(null)
  const [submissionKey] = useState(() => crypto.randomUUID())
  const { executeInspectionMutation } = useQualityMutations()
  const readOnly = Boolean(
    saved ||
    (task &&
      (task.result !== 'PENDING' ||
        task.status === 'COMPLETED' ||
        task.status === 'CANCELLED'))
  )
  const record = saved ?? task
  const standards = useQuery({
    queryKey: [
      'quality_standards',
      'measurement-selection',
      keyword,
      page,
      task?.productId,
    ],
    queryFn: () =>
      QualityCoreService.getStandards({
        page,
        pageSize: 20,
        status: 'PUBLISHED',
        keyword,
        productId: task?.productId,
      }),
    enabled: !readOnly && !task?.standardId,
  })
  const selectedStandard = useQuery({
    queryKey: ['quality_standard', standardId],
    queryFn: () => QualityCoreService.getStandardById(standardId),
    enabled: !readOnly && Boolean(standardId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  const standard = selectedStandard.data
  const supported = Boolean(
    standard &&
    standard.status === 'PUBLISHED' &&
    standard.productId &&
    standard.items.length &&
    standard.items.every((item) =>
      canEditInspectionItemDeviationGrades(item)
    ) &&
    (!task?.productId || task.productId === standard.productId)
  )
  function selectQualityInspectionStandard(id: string) {
    setStandardId(id)
    setValues({})
  }
  async function submitQualityInspectionMeasurements() {
    if (!standard || !supported || executeInspectionMutation.isPending) return
    const measurements = standard.items
      .filter((item) => values[item.id]?.trim())
      .map((item) => ({
        itemId: item.id,
        value: Number(values[item.id]),
        unit: item.unit ?? '',
      }))
    if (
      !batchNo.trim() ||
      !measurements.length ||
      measurements.some((item) => !Number.isFinite(item.value)) ||
      standard.items.some(
        (item) => item.isRequired !== false && !values[item.id]?.trim()
      )
    ) {
      toast.error(t('quality.measurement.invalid'))
      return
    }
    try {
      const result = await executeInspectionMutation.mutateAsync({
        id: task?.id ?? '',
        submissionKey,
        standardId: standard.id,
        standardVersion: standard.version,
        productId: standard.productId,
        batchNo: batchNo.trim(),
        remarks,
        inputData: { measurements },
      })
      setSaved(result)
    } catch {
      /* Shared mutation reports the error; keep measurements for retry. */
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !executeInspectionMutation.isPending) onClose()
      }}
    >
      <DialogContent className='flex max-h-[90dvh] flex-col sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>{t('quality.measurement.title')}</DialogTitle>
          <DialogDescription>
            {t('quality.measurement.description')}
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 space-y-4 overflow-y-auto'>
          {readOnly ? (
            <QualityInspectionMeasurementRecord record={record} />
          ) : (
            <>
              {!task?.standardId && (
                <div className='space-y-3'>
                  <Input
                    aria-label={t('quality.measurement.search')}
                    placeholder={t('quality.measurement.search')}
                    value={keyword}
                    disabled={executeInspectionMutation.isPending}
                    onChange={(event) => {
                      setKeyword(event.target.value)
                      setPage(1)
                    }}
                  />
                  {standards.isLoading ? (
                    <p>{t('quality.measurement.loading')}</p>
                  ) : standards.isError ? (
                    <div role='alert'>
                      <p>{t('quality.measurement.loadFailed')}</p>
                      <Button
                        variant='outline'
                        onClick={() => void standards.refetch()}
                      >
                        {t('quality.measurement.retry')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Label htmlFor='inspection-published-standard'>
                        {t('quality.measurement.standard')}
                      </Label>
                      <select
                        id='inspection-published-standard'
                        className='h-10 w-full rounded-md border bg-background px-3'
                        value={standardId}
                        disabled={executeInspectionMutation.isPending}
                        onChange={(event) =>
                          selectQualityInspectionStandard(event.target.value)
                        }
                      >
                        <option value=''>
                          {t('quality.measurement.select')}
                        </option>
                        {standard &&
                          !standards.data?.items.some(
                            (item) => item.id === standard.id
                          ) && (
                            <option value={standard.id}>
                              {standard.code} · {standard.name}
                            </option>
                          )}
                        {standards.data?.items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.code} · {item.name}
                          </option>
                        ))}
                      </select>
                      {standards.data?.items.length === 0 && (
                        <p className='text-sm text-muted-foreground'>
                          {t('quality.measurement.empty')}
                        </p>
                      )}
                      <div className='flex gap-2'>
                        <Button
                          variant='outline'
                          disabled={
                            page === 1 || executeInspectionMutation.isPending
                          }
                          onClick={() => setPage((previous) => previous - 1)}
                        >
                          {t('quality.measurement.previous')}
                        </Button>
                        <Button
                          variant='outline'
                          disabled={
                            page * 20 >= (standards.data?.total ?? 0) ||
                            executeInspectionMutation.isPending
                          }
                          onClick={() => setPage((previous) => previous + 1)}
                        >
                          {t('quality.measurement.remaining')}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {selectedStandard.isLoading && (
                <p>{t('quality.measurement.loading')}</p>
              )}
              {selectedStandard.isError && (
                <div role='alert'>
                  {t('quality.measurement.loadFailed')}
                  <Button
                    variant='outline'
                    onClick={() => void selectedStandard.refetch()}
                  >
                    {t('quality.measurement.retry')}
                  </Button>
                </div>
              )}
              {standard && (
                <>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <p className='min-w-0 text-sm break-words'>
                      {standard.name} ·{' '}
                      {standard.productName || standard.productId} ·{' '}
                      {t('quality.measurement.version')} {standard.version}
                    </p>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={
                        executeInspectionMutation.isPending ||
                        selectedStandard.isFetching
                      }
                      onClick={() => void selectedStandard.refetch()}
                    >
                      {t('quality.measurement.retry')}
                    </Button>
                  </div>
                  {!supported ? (
                    <p role='alert' className='text-sm text-destructive'>
                      {t('quality.measurement.unsupported')}
                    </p>
                  ) : (
                    <div className='space-y-3'>
                      <div className='space-y-1'>
                        <Label htmlFor='inspection-batch-number'>
                          {t('quality.measurement.batch')}
                        </Label>
                        <Input
                          id='inspection-batch-number'
                          disabled={
                            Boolean(task) || executeInspectionMutation.isPending
                          }
                          value={batchNo}
                          onChange={(event) => setBatchNo(event.target.value)}
                        />
                      </div>
                      {standard.items.map((item) => (
                        <div
                          key={item.id}
                          className='space-y-2 rounded-xl border p-3'
                        >
                          <Label htmlFor={`inspection-measurement-${item.id}`}>
                            {item.name} · {item.inspectionStageName} ·{' '}
                            {item.unit} ·{' '}
                            {t(
                              item.isRequired !== false
                                ? 'quality.measurement.required'
                                : 'quality.measurement.optional'
                            )}
                          </Label>
                          <p className='text-xs text-muted-foreground'>
                            {t(
                              'quality.standards.dialog.detail.table.centerValue'
                            )}{' '}
                            {item.centerValue} {item.unit}
                          </p>
                          <Input
                            id={`inspection-measurement-${item.id}`}
                            aria-label={`${item.name} ${t('quality.measurement.value')}`}
                            type='number'
                            step='any'
                            disabled={executeInspectionMutation.isPending}
                            value={values[item.id] ?? ''}
                            onChange={(event) =>
                              setValues((previous) => ({
                                ...previous,
                                [item.id]: event.target.value,
                              }))
                            }
                          />
                        </div>
                      ))}
                      <div className='space-y-1'>
                        <Label htmlFor='inspection-measurement-remarks'>
                          {t('quality.measurement.remarks')}
                        </Label>
                        <Input
                          id='inspection-measurement-remarks'
                          value={remarks}
                          disabled={executeInspectionMutation.isPending}
                          onChange={(event) => setRemarks(event.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
        <div className='flex shrink-0 justify-end gap-2 border-t pt-3'>
          <Button
            variant='outline'
            disabled={executeInspectionMutation.isPending}
            onClick={onClose}
          >
            {t('quality.measurement.close')}
          </Button>
          {!readOnly && (
            <Button
              disabled={
                !supported ||
                selectedStandard.isFetching ||
                executeInspectionMutation.isPending
              }
              onClick={() => void submitQualityInspectionMeasurements()}
            >
              {t('quality.measurement.submit')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function QualityInspectionMeasurementRecord({
  record,
}: {
  record?: QualityTask
}) {
  const { t } = useLanguage()
  return (
    <div className='space-y-3'>
      <p className='text-sm'>
        {t('quality.measurement.result')}：
        {record?.result === 'PASS'
          ? t('quality.grading.pass')
          : record?.result === 'FAIL'
            ? t('quality.grading.fail')
            : record?.result}
      </p>
      {record?.standardSnapshot ? (
        <>
          <p className='text-sm'>
            {record.standardSnapshot.code} · {record.standardSnapshot.name} ·{' '}
            {t('quality.measurement.version')} {record.standardSnapshot.version}
          </p>
          <div className='space-y-3'>
            {record.standardSnapshot.items.map((item) => (
              <div key={item.id} className='rounded-xl border p-3 text-sm'>
                <p>
                  {item.name} · {item.inspectionStageName} · {item.centerValue}{' '}
                  {item.unit}
                </p>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {item.levels
                    .map(
                      (grade) =>
                        `${grade.level}: −${grade.lowerTolerance} / +${grade.upperTolerance} ${item.unit} (${t(grade.result === 'FAIL' ? 'quality.grading.fail' : 'quality.grading.pass')})`
                    )
                    .join('；')}
                </p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className='text-sm text-amber-700'>
          {t('quality.measurement.noSnapshot')}
        </p>
      )}
      {record?.evaluationData?.length ? (
        record.evaluationData.map((item) => (
          <div key={item.itemId} className='rounded-xl border p-3 text-sm'>
            {item.itemName}：{item.value} {item.unit} ·{' '}
            {item.grade || t('quality.measurement.outside')} ·{' '}
            {t(
              item.result === 'PASS'
                ? 'quality.grading.pass'
                : 'quality.grading.fail'
            )}
          </div>
        ))
      ) : (
        <p className='text-sm text-muted-foreground'>
          {t('quality.measurement.noEvaluation')}
        </p>
      )}
      {record?.result === 'FAIL' && (
        <p className='text-sm text-amber-700'>
          {t('quality.measurement.disposition')}
        </p>
      )}
    </div>
  )
}
