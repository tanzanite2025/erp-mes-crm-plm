import { History, Info } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Standard } from '../data/schema'

interface StandardEditorContentProps {
  mode: 'create' | 'edit'
  formData: Standard
  isDirty: boolean
  onCodeChange: (value: string) => void
  onNameChange: (value: string) => void
  onTypeChange: (value: Standard['type']) => void
  onStatusChange: (value: Standard['status']) => void
  onRemarksChange: (value: string) => void
}

function normalizeType(type?: string): 'IQC' | 'IPQC' | 'FQC' {
  const normalized = type?.toUpperCase()
  if (type === '巡检' || normalized === 'IPQC') return 'IPQC'
  if (type === '首检' || normalized === 'FQC') return 'FQC'
  return 'IQC'
}

function normalizeStatus(status?: string): 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' {
  const normalized = status?.toUpperCase()
  if (status === '已归档' || normalized === 'ARCHIVED') return 'ARCHIVED'
  if (
    status === '待审核' ||
    normalized === 'DRAFT' ||
    normalized === 'PENDING'
  ) {
    return 'DRAFT'
  }
  return 'PUBLISHED'
}

function getTypeLabel(t: ReturnType<typeof useLanguage>['t'], type?: string) {
  const normalized = normalizeType(type)
  if (normalized === 'IPQC') return t('quality.standards.values.typeProcess')
  if (normalized === 'FQC') return t('quality.standards.values.typeFinal')
  return t('quality.standards.values.typeQuality')
}

function getStatusLabel(
  t: ReturnType<typeof useLanguage>['t'],
  status?: string
) {
  const normalized = normalizeStatus(status)
  if (normalized === 'ARCHIVED')
    return t('quality.standards.values.statusArchived')
  if (normalized === 'DRAFT') return t('quality.standards.values.statusPending')
  return t('quality.standards.values.statusPublished')
}

export function StandardEditorContent({
  mode,
  formData,
  isDirty,
  onCodeChange,
  onNameChange,
  onTypeChange,
  onStatusChange,
  onRemarksChange,
}: StandardEditorContentProps) {
  const { t } = useLanguage()
  const isEdit = mode === 'edit'

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-dashed border-muted/40 bg-muted/10 px-5 py-4'>
        <div>
          <p className='text-[10px] font-black tracking-[0.3em] text-muted-foreground/60 uppercase'>
            {t('quality.standards.workspace.editorFormTitle')}
          </p>
          <p className='mt-1 text-sm font-medium text-muted-foreground/70'>
            {t('quality.standards.workspace.editorFormDescription')}
          </p>
        </div>
        {isDirty ? (
          <Badge className='rounded-full border-none bg-amber-500/10 px-4 py-1 text-[10px] font-black tracking-widest text-amber-600 uppercase'>
            {t('quality.standards.workspace.editorDirty')}
          </Badge>
        ) : null}
      </div>

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-12'>
        <div className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6 shadow-inner xl:col-span-8'>
          <div className='grid gap-6'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                  {t('quality.standards.dialog.action.fields.code')}{' '}
                  <span className='text-red-500'>*</span>
                </Label>
                <Input
                  placeholder={t(
                    'quality.standards.dialog.action.placeholders.code'
                  )}
                  className='h-11 rounded-xl border-none bg-muted/30 font-mono shadow-inner transition-all focus:ring-2 focus:ring-primary/20'
                  value={formData.code || ''}
                  onChange={(event) => onCodeChange(event.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label className='mb-1.5 ml-1 flex items-center gap-1.5 text-[10px] leading-none font-black tracking-widest text-muted-foreground/70 uppercase'>
                  <History className='size-3' />
                  {t('quality.standards.dialog.action.fields.systemVersion')}
                </Label>
                <div className='flex h-11 items-center rounded-xl border border-white/5 bg-muted/20 px-4 shadow-inner'>
                  <Badge
                    variant='secondary'
                    className='border-none bg-primary/10 py-0.5 font-mono text-[10px] font-black text-primary'
                  >
                    VER{' '}
                    {isEdit ? Number(formData.version || 1).toFixed(1) : '1.0'}
                  </Badge>
                  <span className='ml-2 text-[9px] font-black tracking-tighter text-muted-foreground/40 uppercase'>
                    {isEdit
                      ? t('quality.standards.dialog.action.versionCurrent')
                      : t('quality.standards.dialog.action.versionInitial')}
                  </span>
                </div>
              </div>
            </div>

            <div className='space-y-2'>
              <Label className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                {t('quality.standards.dialog.action.fields.name')}{' '}
                <span className='text-red-500'>*</span>
              </Label>
              <Input
                placeholder={t(
                  'quality.standards.dialog.action.placeholders.name'
                )}
                className='h-11 rounded-xl border-none bg-muted/30 font-bold shadow-inner transition-all focus:ring-2 focus:ring-primary/20'
                value={formData.name || ''}
                onChange={(event) => onNameChange(event.target.value)}
              />
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                  {t('quality.standards.dialog.action.fields.type')}
                </Label>
                <Select
                  value={normalizeType(formData.type)}
                  onValueChange={(value: Standard['type']) =>
                    onTypeChange(value)
                  }
                >
                  <SelectTrigger className='h-11 rounded-xl border-none bg-muted/30 shadow-inner transition-all focus:ring-2 focus:ring-primary/20'>
                    <SelectValue
                      placeholder={t(
                        'quality.standards.dialog.action.placeholders.type'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent className='rounded-xl border-white/5 bg-background text-[11px] font-black'>
                    <SelectItem value='IQC'>
                      {getTypeLabel(t, 'IQC')} (IQC)
                    </SelectItem>
                    <SelectItem value='IPQC'>
                      {getTypeLabel(t, 'IPQC')} (IPQC)
                    </SelectItem>
                    <SelectItem value='FQC'>
                      {getTypeLabel(t, 'FQC')} (FQC)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                  {t('quality.standards.dialog.action.fields.status')}
                </Label>
                <Select
                  value={normalizeStatus(formData.status)}
                  onValueChange={(value: Standard['status']) =>
                    onStatusChange(value)
                  }
                >
                  <SelectTrigger className='h-11 rounded-xl border-none bg-muted/30 shadow-inner transition-all focus:ring-2 focus:ring-primary/20'>
                    <SelectValue
                      placeholder={t(
                        'quality.standards.dialog.action.placeholders.status'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent className='rounded-xl border-white/5 bg-background text-[11px] font-black'>
                    <SelectItem value='DRAFT'>
                      {getStatusLabel(t, 'DRAFT')} (DRAFT)
                    </SelectItem>
                    <SelectItem value='PUBLISHED'>
                      {getStatusLabel(t, 'PUBLISHED')} (PUBLISHED)
                    </SelectItem>
                    <SelectItem value='ARCHIVED'>
                      {getStatusLabel(t, 'ARCHIVED')} (ARCHIVED)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='space-y-2'>
              <Label className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                {t('quality.standards.dialog.action.fields.remarks')}
              </Label>
              <Textarea
                rows={5}
                placeholder={t(
                  'quality.standards.dialog.action.placeholders.remarks'
                )}
                className='rounded-xl border-none bg-muted/30 p-4 text-sm shadow-inner transition-all focus:ring-2 focus:ring-primary/20'
                value={formData.remarks || ''}
                onChange={(event) => onRemarksChange(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className='space-y-6 xl:col-span-4'>
          <div className='rounded-[32px] border border-dashed border-primary/20 bg-primary/5 p-5 shadow-inner'>
            <div className='flex items-start gap-3'>
              <Info className='mt-0.5 size-4 shrink-0 text-primary' />
              <div className='space-y-1'>
                <p className='text-[10px] font-black tracking-widest text-primary uppercase'>
                  {t('quality.standards.dialog.action.versionNoticeTitle')}
                </p>
                <p className='text-[11px] leading-relaxed text-primary/70'>
                  {isEdit
                    ? t('quality.standards.dialog.action.versionNoticeEdit')
                    : t('quality.standards.dialog.action.versionNoticeCreate')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
