'use client'

import { type ChangeEvent, useMemo, useEffect, useState } from 'react'
import { type z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AssetService as GlobalAssetService } from '@/services/asset-service'
import { FilePlus, Save, FileText, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { type MoldDrawing, type Mold, moldDrawingSchema } from '../data/schema'
import { prepareTrackedDialogSubmit } from '../utils/tracked-dialog-submit'

interface DrawingActionDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: MoldDrawing | null
  molds: Mold[]
  onSubmit: (
    data: MoldDrawing,
    isPatch?: boolean,
    delta?: DeltaSet
  ) => Promise<void>
}

const EMPTY_MOLD_VALUE = '__NONE__'

type MoldDrawingFormInput = z.input<typeof moldDrawingSchema>
type MoldDrawingFormOutput = z.output<typeof moldDrawingSchema>

export function DrawingActionDialog({
  isOpen,
  onOpenChange,
  currentRow,
  molds,
  onSubmit,
}: DrawingActionDialogProps) {
  const { t } = useLanguage()
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // SDRTS: 状态初始化
  const isEdit = !!currentRow

  const initialValues = useMemo(() => {
    if (currentRow) return currentRow
    return {
      // [BACKEND-AUTHORITY]: 物理 ID 严禁在前端使用 Math.random 生成，必须由后端数据库在创建时分配。
      id: '',
      moldId: '',
      moldSn: '',
      name: '',
      type: '2D' as const,
      fileUrl: '',
      version: 'V1.0',
      sysVersion: 1,
      status: 'ACTIVE' as const,
      uploadedAt: new Date().toISOString(),
      remarks: '',
    }
  }, [currentRow])

  const { commit, deltaProxy, reset } = useDeltaTracker<MoldDrawing>(
    initialValues,
    isOpen
  )

  const form = useForm<MoldDrawingFormInput, unknown, MoldDrawingFormOutput>({
    resolver: zodResolver(moldDrawingSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (isOpen) {
      form.reset(initialValues)
      reset(initialValues)
      setPendingFile(null)
      setIsUploading(false)
    }
  }, [isOpen, initialValues, form, reset])

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    if (!form.getValues('name')) {
      form.setValue('name', file.name)
    }
  }

  const handleFormSubmit = async (values: MoldDrawingFormOutput) => {
    try {
      // 安全校验：资产解绑完整性检查
      if (isEdit && initialValues.moldSn && !values.moldSn) {
        const confirmed = window.confirm(
          t('equipmentTooling.drawings.dialog.warnings.unbindConfirm')
        )
        if (!confirmed) return
      }

      let finalFileUrl = values.fileUrl

      // 如果有新文件待上传
      if (pendingFile) {
        setIsUploading(true)
        toast.loading(t('equipmentTooling.drawings.toast.uploading'), {
          id: 'upload',
        })
        const uploadResult = await GlobalAssetService.uploadFile(pendingFile)
        finalFileUrl = uploadResult.url
        form.setValue('fileUrl', finalFileUrl)
        toast.success(t('equipmentTooling.drawings.toast.uploaded'), {
          id: 'upload',
        })
      }

      if (!finalFileUrl) {
        toast.error(t('equipmentTooling.drawings.toast.fileRequired'))
        return
      }

      const submissionData = { ...values, fileUrl: finalFileUrl }
      const { isDirty, patchDelta } = prepareTrackedDialogSubmit({
        values: submissionData,
        deltaProxy,
        commit,
        isEdit,
      })

      if (isEdit && !isDirty) {
        onOpenChange(false)
        return
      }

      await onSubmit(submissionData, isEdit, patchDelta)
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '文件上传或保存失败',
        { id: 'upload' }
      )
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <ActionDialogShell
      open={isOpen}
      onOpenChange={onOpenChange}
      title={
        <div className='flex items-center gap-3'>
          <FilePlus className='size-6 text-blue-600' />
          <span>
            {isEdit
              ? t('equipmentTooling.drawings.dialog.title.edit')
              : t('equipmentTooling.drawings.dialog.title.create')}
          </span>
        </div>
      }
      contentDecoration={
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
      }
      contentClassName='w-[95vw] sm:max-w-lg max-h-[92vh] flex flex-col p-0 rounded-[32px] shadow-2xl border-none overflow-hidden bg-background'
      headerClassName='p-6 sm:p-8 shrink-0 pb-4 bg-primary/5 border-b border-dashed text-left'
      bodyClassName='flex-1 overflow-y-auto px-6 sm:p-8 pt-6 custom-scrollbar pb-8'
      footerClassName='p-6 sm:p-8 bg-muted/5 border-t border-dashed border-muted-foreground/10 flex flex-row sm:justify-end gap-3 shrink-0'
      titleClassName='text-xl font-black tracking-tighter italic uppercase'
      footer={
        <>
          <Button
            variant='ghost'
            onClick={() => onOpenChange(false)}
            className='h-11 flex-1 rounded-full px-8 text-[10px] font-black tracking-widest uppercase sm:flex-none'
          >
            {t('equipmentTooling.drawings.dialog.actions.cancel')}
          </Button>
          <Button
            onClick={form.handleSubmit(handleFormSubmit)}
            disabled={isUploading}
            className='h-11 flex-1 rounded-full bg-blue-600 px-10 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 sm:flex-none'
          >
            <Save className='mr-2 size-3.5' />
            {t('common.actions.save')}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className='space-y-6'
        >
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                  {t('equipmentTooling.drawings.dialog.fields.name')}
                </FormLabel>
                <FormControl>
                  <Input
                    className='h-12 rounded-2xl border-none bg-muted/50 font-bold focus:ring-blue-500/20'
                    placeholder={t(
                      'equipmentTooling.drawings.dialog.placeholders.name'
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage className='text-[10px] font-bold' />
              </FormItem>
            )}
          />

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                    {t('equipmentTooling.drawings.dialog.fields.type')}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 font-bold'>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className='rounded-2xl border-none shadow-2xl'>
                      <SelectItem value='2D' className='rounded-xl font-bold'>
                        {t('equipmentTooling.drawings.types.twoD')}
                      </SelectItem>
                      <SelectItem value='3D' className='rounded-xl font-bold'>
                        {t('equipmentTooling.drawings.types.threeD')}
                      </SelectItem>
                      <SelectItem
                        value='TECH_SPEC'
                        className='rounded-xl font-bold'
                      >
                        {t('equipmentTooling.drawings.types.techSpec')}
                      </SelectItem>
                      <SelectItem
                        value='OTHER'
                        className='rounded-xl font-bold'
                      >
                        {t('equipmentTooling.drawings.types.other')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='version'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                    {t('equipmentTooling.drawings.dialog.fields.version')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className='h-12 rounded-2xl border-none bg-muted/50 font-mono font-bold'
                      placeholder={t(
                        'equipmentTooling.drawings.dialog.placeholders.version'
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='moldSn'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-primary/40 uppercase italic'>
                  {t('equipmentTooling.drawings.dialog.fields.mold')}
                </FormLabel>
                <Select
                  value={field.value || EMPTY_MOLD_VALUE}
                  onValueChange={(val) => {
                    const selected = molds.find((m) => m.sn === val)
                    field.onChange(val === EMPTY_MOLD_VALUE ? '' : val)
                    if (selected) {
                      form.setValue('moldId', selected.id)
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 font-bold'>
                      <SelectValue
                        placeholder={t(
                          'equipmentTooling.drawings.dialog.placeholders.selectMold'
                        )}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className='rounded-2xl border-none shadow-2xl'>
                    <SelectItem
                      value={EMPTY_MOLD_VALUE}
                      className='rounded-xl text-muted-foreground italic'
                    >
                      {t('equipmentTooling.drawings.options.independent')}
                    </SelectItem>
                    {molds.map((mold) => (
                      <SelectItem
                        key={mold.id}
                        value={mold.sn}
                        className='rounded-xl font-bold'
                      >
                        {mold.sn} - {mold.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className='text-[10px] font-bold' />
              </FormItem>
            )}
          />

          <div className='space-y-2'>
            <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
              {t('equipmentTooling.drawings.dialog.fields.source')}
            </FormLabel>
            {form.watch('fileUrl') || pendingFile ? (
              <div className='flex items-center justify-between rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/5 p-4'>
                <div className='flex items-center gap-3'>
                  <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10'>
                    <FileText className='size-5 text-emerald-600' />
                  </div>
                  <div className='min-w-0'>
                    <span className='block text-[10px] font-black tracking-widest text-emerald-600 uppercase'>
                      {t('equipmentTooling.drawings.source.ready')}
                    </span>
                    <span className='block max-w-[200px] truncate font-mono text-[9px] text-emerald-600/60 italic'>
                      {pendingFile?.name ||
                        t('equipmentTooling.drawings.source.archived')}
                    </span>
                  </div>
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='rounded-xl text-[9px] font-black tracking-widest text-rose-500 uppercase'
                  onClick={() => {
                    form.setValue('fileUrl', '')
                    setPendingFile(null)
                  }}
                >
                  {t('equipmentTooling.drawings.source.reupload')}
                </Button>
              </div>
            ) : (
              <div className='group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-muted-foreground/10 bg-muted/5 p-8 transition-all hover:border-primary/30 hover:bg-primary/5 sm:p-10'>
                <div className='flex size-14 items-center justify-center rounded-full bg-white shadow-lg transition-transform group-hover:scale-110'>
                  <Upload className='size-6 text-primary' />
                </div>
                <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                  {t('equipmentTooling.drawings.source.clickUpload')}
                </p>
                <input
                  type='file'
                  className='absolute inset-0 cursor-pointer opacity-0'
                  onChange={handleFileUpload}
                />
              </div>
            )}
          </div>

          <FormField
            control={form.control}
            name='remarks'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                  {t('equipmentTooling.drawings.dialog.fields.remarks')}
                </FormLabel>
                <FormControl>
                  <Input
                    className='h-12 rounded-2xl border-none bg-muted/50 font-bold'
                    placeholder={t(
                      'equipmentTooling.drawings.dialog.placeholders.remarks'
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage className='text-[10px] font-bold' />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </ActionDialogShell>
  )
}
