'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ruler, Tag, Info, Save, Box, Nut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/select-dropdown'
import { FileUploader } from '@/components/file-uploader'
import {
  spokeLengthInputSchema,
  type SpokeLength,
  type SpokeLengthInput,
} from '../data/schema'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { hubService } from '../services/hub-service'
import { nippleService } from '../services/nipple-service'
import { type Hub } from '../data/hub-schema'
import { type Nipple } from '../data/nipple-schema'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { toast } from 'sonner'
import type { DeltaSet } from '@/lib/delta/types'

type SpokeLengthFormState = SpokeLengthInput & { id?: string; createdAt?: string }
type SpokeLengthFormUpdater = SpokeLengthFormState | ((prev: SpokeLengthFormState) => SpokeLengthFormState)

interface SpokeLengthActionDialogProps {
  currentRow?: SpokeLength | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: {
    data: SpokeLengthInput
    recordId?: string
    isPatch: boolean
    delta?: DeltaSet
    version?: number
  }) => Promise<void>
  isLoading?: boolean
}

const DEFAULT_SPOKE_LENGTH: SpokeLengthInput = {
  name: '',
  productId: '',
  hubId: '',
  nippleId: '',
  length: '',
  material: '',
  fileUrl: '',
  fileExtension: '',
  version: 1,
}

export function SpokeLengthActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: SpokeLengthActionDialogProps) {
  const { data: products = [] } = useGetProducts()
  const [hubs, setHubs] = useState<Hub[]>([])
  const [nipples, setNipples] = useState<Nipple[]>([])

  const shellClasses = buildActionDialogShellClasses({
    content: 'sm:max-w-[700px] rounded-[32px] overflow-hidden',
    header: 'p-8 pb-4 border-none bg-muted/5',
    title: 'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
    description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
    body: 'p-8 pt-4 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar',
    footer: 'p-8 pt-4 flex items-center justify-between w-full border-t border-dashed border-muted/20 bg-muted/5',
  })

  useEffect(() => {
    if (!open) return

    const loadMasterData = async () => {
      const [hubData, nippleData] = await Promise.all([
        hubService.getHubs(),
        nippleService.getNipples(),
      ])
      setHubs(hubData)
      setNipples(nippleData)
    }

    void loadMasterData()
  }, [open])

  const isEdit = !!currentRow
  const initialFormData = useMemo<SpokeLengthFormState>(() => {
    if (currentRow) return currentRow
    return { ...DEFAULT_SPOKE_LENGTH }
  }, [currentRow])

  const { data: formData, tracker, isDirty } = useDeltaTracker(initialFormData, open)

  const setFormData = useCallback((updater: SpokeLengthFormUpdater) => {
    if (typeof updater === 'function') {
      const next = updater(formData)
      Object.assign(formData, next)
    } else {
      Object.assign(formData, updater)
    }
  }, [formData])

  const updateField = useCallback(<K extends keyof SpokeLengthFormState>(field: K, value: SpokeLengthFormState[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [setFormData])

  const handleSave = async () => {
    const parsed = spokeLengthInputSchema.safeParse(formData)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? '请填写完整的辐条记录')
      return
    }

    const payload = parsed.data
    if (isEdit && currentRow) {
      const delta = tracker.commit()
      if (Object.keys(delta).length === 0) {
        onOpenChange(false)
        return
      }

      await onSave({
        data: payload,
        recordId: currentRow.id,
        isPatch: true,
        delta,
        version: currentRow.version,
      })
      return
    }

    await onSave({ data: payload, isPatch: false })
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          <div className='rounded-xl bg-blue-500/10 p-2'>
            <Ruler className='size-5 text-blue-500' />
          </div>
          {isEdit ? '编辑辐条规格' : '建立辐条规格'}
        </>
      }
      description='COMPONENT_MASTER_SPOKE / 维护辐条长度、材料以及关联花鼓和条帽。'
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={
        <>
          <p className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50'>
            <span className='inline-block size-1.5 rounded-full bg-blue-500 animate-pulse' />
            Sync_to_BOM_Hierarchy
          </p>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='rounded-full px-6 text-[10px] font-black uppercase tracking-widest'
            >
              取消 / Cancel
            </Button>
            <Button
              disabled={isLoading || (isEdit && !isDirty())}
              onClick={handleSave}
              className='h-11 gap-2 rounded-full bg-blue-600 px-10 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all active:scale-95 hover:bg-blue-700'
            >
              {isLoading ? (
                <span className='size-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
              ) : (
                <Save className='size-4' />
              )}
              同步存档 / Sync
            </Button>
          </div>
        </>
      }
    >
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-blue-500/5 via-transparent' />

      <div className='relative grid gap-8'>
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
              <Tag className='size-3' /> 名称 / Display Name
            </Label>
            <Input
              placeholder='例如：DT-SWISS-29er-Rear'
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-black shadow-inner focus-visible:ring-blue-500/20'
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>
          <div className='space-y-2 text-blue-600'>
            <Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-70'>
              <Box className='size-3' /> 成品 SKU / Parent Product
            </Label>
            <SelectDropdown
              defaultValue={formData.productId}
              onValueChange={(value) => updateField('productId', value)}
              items={products.map((product) => ({
                label: `${product.sku} | ${product.name}`,
                value: product.id,
              }))}
              placeholder='选择关联成品 SKU'
              className='h-12 rounded-2xl border-none bg-blue-500/5 px-4 text-sm font-bold italic shadow-inner'
            />
          </div>
        </div>

        <div className='grid grid-cols-2 gap-6 rounded-[32px] border border-dashed border-muted-foreground/10 bg-muted/20 p-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest'>长度 / Spoke Length (mm)</Label>
            <Input
              placeholder='例如：298'
              className='h-12 rounded-2xl border-none bg-background px-5 font-mono text-sm font-black shadow-sm'
              value={formData.length}
              onChange={(e) => updateField('length', e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest'>材质 / Material</Label>
            <Input
              placeholder='例如：SUS304 / Steel'
              className='h-12 rounded-2xl border-none bg-background px-5 text-sm font-bold shadow-sm'
              value={formData.material}
              onChange={(e) => updateField('material', e.target.value)}
            />
          </div>
        </div>

        <div className='space-y-6 rounded-[32px] border border-dashed border-muted-foreground/10 bg-muted/10 p-6'>
          <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
            Linked_Components / 结构关联件
          </p>
          <div className='grid grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-70'>
                <Box className='size-3 text-indigo-500' /> 花鼓 / Hub
              </Label>
              <SelectDropdown
                defaultValue={formData.hubId}
                onValueChange={(value) => updateField('hubId', value)}
                items={hubs.map((hub) => ({
                  label: `${hub.brand} ${hub.name}`,
                  value: hub.id,
                }))}
                placeholder='选择关联花鼓'
                className='h-11 rounded-2xl border-none bg-background px-4 text-xs font-bold shadow-inner'
              />
            </div>
            <div className='space-y-2'>
              <Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-70'>
                <Nut className='size-3 text-orange-500' /> 条帽 / Nipple
              </Label>
              <SelectDropdown
                defaultValue={formData.nippleId}
                onValueChange={(value) => updateField('nippleId', value)}
                items={nipples.map((nipple) => ({
                  label: `${nipple.brand} ${nipple.name}`,
                  value: nipple.id,
                }))}
                placeholder='选择关联条帽'
                className='h-11 rounded-2xl border-none bg-background px-4 text-xs font-bold shadow-inner'
              />
            </div>
          </div>
        </div>

        <div className='space-y-3 rounded-[32px] border border-dashed border-blue-500/20 bg-blue-500/5 p-6'>
          <Label className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600/60'>
            <Info className='size-3' /> 附件 / Technical Attachment
          </Label>
          <FileUploader
            value={formData.fileUrl}
            accept='image/*,.pdf'
            onChange={(url, ext) => {
              setFormData((prev) => ({
                ...prev,
                fileUrl: url,
                fileExtension: ext || prev.fileExtension,
              }))
            }}
          />
        </div>
      </div>
    </ActionDialogShell>
  )
}
