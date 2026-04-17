import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Globe, Loader2, MoveUpRight, PencilLine, Phone, Plus, RefreshCw, Truck, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/language-provider'
import {
  formatProviderVerifiedAt,
  getLogisticsCapabilityLabel,
  applyLogisticsTemplate,
  emptyLogisticsProvider,
  findDuplicateProvider,
  findLogisticsTemplateByCode,
  getProviderCategory,
  getProviderCapabilities,
  getProviderVerificationBadgeClass,
  getProviderVerificationLabel,
  getProviderVerificationStatus,
  isProviderApiConnected,
  LOGISTICS_CAPABILITY_OPTIONS,
  logisticsProviderQueryKey,
  toggleProviderCapability,
} from '@/features/logistics-config/provider-directory'
import { logisticsProviderService } from '@/features/sandbox/logistics-api/services/logistics-provider-service'
import { LOGISTICS_TEMPLATES, type LogisticsProvider } from '@/features/sandbox/logistics-api/types'
import { toast } from 'sonner'

export function LogisticsSupplierDirectoryTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTemplateNote, setSelectedTemplateNote] = useState('')
  const [formData, setFormData] = useState<LogisticsProvider>(emptyLogisticsProvider)

  const {
    data: providers = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: logisticsProviderQueryKey,
    queryFn: () => logisticsProviderService.getProviders(),
  })

  const saveMutation = useMutation({
    mutationFn: (provider: LogisticsProvider) => logisticsProviderService.saveProvider(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logisticsProviderQueryKey })
      toast.success(t('logisticsConfig.suppliers.toasts.saveSuccess'))
      setIsDialogOpen(false)
      setFormData(emptyLogisticsProvider)
      setSelectedTemplateNote('')
    },
    onError: (mutationError: unknown) => {
      const message = mutationError instanceof Error ? mutationError.message : t('logisticsConfig.suppliers.toasts.unknownError')
      toast.error(t('logisticsConfig.suppliers.toasts.saveFailed', { message }))
    },
  })

  const sortedProviders = [...providers].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  const pageError = error instanceof Error ? error.message : t('logisticsConfig.suppliers.errors.loadFailed')
  const isFormValid = formData.name.trim() !== '' && formData.code.trim() !== ''
  const previewConnected = isProviderApiConnected(formData)
  const previewVerificationStatus = getProviderVerificationStatus(formData)

  const resetForm = () => {
    setFormData(emptyLogisticsProvider)
    setSelectedTemplateNote('')
  }

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const handleApplyTemplate = (code: string) => {
    const template = findLogisticsTemplateByCode(code)
    if (!template) return

    setFormData((prev) => applyLogisticsTemplate(prev, code))
    setSelectedTemplateNote(template.note)
  }

  const handleEdit = (provider: LogisticsProvider) => {
    setFormData({
      ...emptyLogisticsProvider,
      ...provider,
      category: getProviderCategory(provider),
    })
    setSelectedTemplateNote(findLogisticsTemplateByCode(provider.code)?.note || '')
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    const duplicate = findDuplicateProvider(providers, formData)
    if (duplicate) {
      toast.error(t('logisticsConfig.suppliers.toasts.duplicate', { name: duplicate.name }))
      return
    }

    saveMutation.mutate({
      ...formData,
      category: getProviderCategory(formData),
    })
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-4 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-2 text-primary'>
              <Truck className='size-5' />
              <h2 className='text-lg font-black tracking-tighter italic uppercase'>
                {t('logisticsConfig.suppliers.title')}
              </h2>
            </div>
            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60'>
              {t('logisticsConfig.suppliers.description')}
            </p>
            <p className='text-xs leading-relaxed text-muted-foreground'>
              {t('logisticsConfig.suppliers.directoryNote')}
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => void refetch()}
              disabled={isFetching}
              className='rounded-full px-5 text-[10px] font-black uppercase tracking-widest'
            >
              {isFetching ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <RefreshCw className='size-4' />
              )}
              {t('logisticsConfig.suppliers.actions.refresh')}
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button className='rounded-full px-6 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20'>
                  <Plus className='size-4' />
                  {t('logisticsConfig.suppliers.actions.add')}
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-2xl rounded-[32px] border-none bg-white/95 p-8 shadow-2xl backdrop-blur-xl'>
                <DialogHeader>
                  <DialogTitle className='flex items-center gap-2 text-xl font-black italic tracking-tighter'>
                    <Truck className='size-5 text-primary' />
                    {formData.id
                      ? t('logisticsConfig.suppliers.dialog.editTitle')
                      : t('logisticsConfig.suppliers.dialog.createTitle')}
                  </DialogTitle>
                </DialogHeader>

                <div className='space-y-6 py-4'>
                  <div className='space-y-2 border-b border-dashed border-slate-200 pb-4'>
                    <Label className='pl-1 text-[10px] font-black uppercase tracking-widest text-primary'>
                      {t('logisticsConfig.suppliers.fields.template')}
                    </Label>
                    <Select onValueChange={handleApplyTemplate}>
                      <SelectTrigger className='h-12 rounded-2xl border-primary/10 bg-primary/5 font-bold text-primary'>
                        <SelectValue placeholder={t('logisticsConfig.suppliers.fields.templatePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent className='rounded-2xl border-none shadow-2xl'>
                        {LOGISTICS_TEMPLATES.map((template) => (
                          <SelectItem key={template.code} value={template.code} className='rounded-xl py-3'>
                            <span className='font-black italic'>{template.code}</span>
                            {' - '}
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTemplateNote ? (
                      <p className='pl-1 text-[11px] text-primary/70'>
                        {selectedTemplateNote}
                      </p>
                    ) : null}
                  </div>

                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div className='space-y-2'>
                      <Label>{t('logisticsConfig.suppliers.fields.name')}</Label>
                      <Input
                        value={formData.name}
                        onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label>{t('logisticsConfig.suppliers.fields.code')}</Label>
                      <Input
                        value={formData.code}
                        onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                      />
                    </div>
                  </div>

                  <div className='space-y-4 rounded-3xl border border-dashed border-slate-200 p-5'>
                    <div className='space-y-1'>
                      <h4 className='text-[11px] font-black uppercase tracking-widest text-slate-500'>目录信息</h4>
                      <p className='text-xs text-muted-foreground'>用于联系人协同、交接说明和目录检索。</p>
                    </div>

                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label>{t('logisticsConfig.suppliers.fields.category')}</Label>
                        <Select
                          value={getProviderCategory(formData)}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value as LogisticsProvider['category'] }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='domestic'>{t('logisticsConfig.suppliers.categoryDomestic')}</SelectItem>
                            <SelectItem value='international'>{t('logisticsConfig.suppliers.categoryInternational')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className='space-y-2'>
                        <Label>{t('logisticsConfig.suppliers.fields.website')}</Label>
                        <Input
                          value={formData.website || ''}
                          onChange={(event) => setFormData((prev) => ({ ...prev, website: event.target.value }))}
                          placeholder={t('logisticsConfig.suppliers.fields.websitePlaceholder')}
                        />
                      </div>
                    </div>

                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label>{t('logisticsConfig.suppliers.fields.contact')}</Label>
                        <Input
                          value={formData.contact || ''}
                          onChange={(event) => setFormData((prev) => ({ ...prev, contact: event.target.value }))}
                          placeholder={t('logisticsConfig.suppliers.fields.contactPlaceholder')}
                        />
                      </div>
                      <div className='space-y-2'>
                        <Label>{t('logisticsConfig.suppliers.fields.phone')}</Label>
                        <Input
                          value={formData.phone || ''}
                          onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                          placeholder={t('logisticsConfig.suppliers.fields.phonePlaceholder')}
                        />
                      </div>
                    </div>

                    <div className='space-y-2'>
                      <Label>{t('logisticsConfig.suppliers.fields.note')}</Label>
                      <Textarea
                        value={formData.note || ''}
                        onChange={(event) => setFormData((prev) => ({ ...prev, note: event.target.value }))}
                        placeholder={t('logisticsConfig.suppliers.fields.notePlaceholder')}
                        className='min-h-28'
                      />
                    </div>
                  </div>

                  <div className='space-y-4 rounded-3xl border border-dashed border-primary/20 bg-primary/5 p-5'>
                    <div className='space-y-1'>
                      <h4 className='text-[11px] font-black uppercase tracking-widest text-primary/80'>接口信息</h4>
                      <p className='text-xs text-primary/70'>用于接口连通、能力识别和技术状态追踪。</p>
                    </div>

                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label>{t('logisticsConfig.suppliers.fields.endpoint')}</Label>
                        <Input
                          value={formData.endpoint}
                          onChange={(event) => setFormData((prev) => ({ ...prev, endpoint: event.target.value }))}
                          placeholder={t('logisticsConfig.suppliers.fields.endpointPlaceholder')}
                        />
                      </div>
                      <div className='space-y-2'>
                        <Label>{t('logisticsConfig.suppliers.fields.apiStatus')}</Label>
                        <div className='flex h-10 items-center rounded-xl border border-dashed px-3 text-sm font-bold'>
                          {previewConnected
                            ? `${t('logisticsConfig.suppliers.apiConnected')} / ${getProviderVerificationLabel(previewVerificationStatus)}`
                            : `${t('logisticsConfig.suppliers.apiNotConnected')} / ${getProviderVerificationLabel(previewVerificationStatus)}`}
                        </div>
                      </div>
                    </div>

                    <div className='space-y-2'>
                      <Label>能力标签</Label>
                      <div className='flex flex-wrap gap-2'>
                        {LOGISTICS_CAPABILITY_OPTIONS.map((capability) => {
                          const selected = getProviderCapabilities(formData).includes(capability.value)
                          return (
                            <Button
                              key={capability.value}
                              type='button'
                              variant={selected ? 'default' : 'outline'}
                              className='rounded-full text-[10px] font-black uppercase tracking-widest'
                              onClick={() => setFormData((prev) => toggleProviderCapability(prev, capability.value))}
                            >
                              {capability.label}
                            </Button>
                          )
                        })}
                      </div>
                    </div>

                    <div className='rounded-2xl border border-dashed border-primary/30 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-primary/80'>
                      {previewConnected
                        ? t('logisticsConfig.suppliers.apiConnectedHint')
                        : t('logisticsConfig.suppliers.apiNotConnectedHint')}
                    </div>
                  </div>
                </div>

                <DialogFooter className='gap-2'>
                  <Button variant='outline' onClick={() => handleDialogChange(false)}>
                    {t('logisticsConfig.suppliers.actions.cancel')}
                  </Button>
                  <Button onClick={handleSave} disabled={!isFormValid || saveMutation.isPending}>
                    {saveMutation.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
                    {t('logisticsConfig.suppliers.actions.save')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {isError ? (
        <div className='flex h-64 flex-col items-center justify-center gap-3 rounded-[32px] border border-dashed border-rose-200 bg-rose-50/60 text-rose-500'>
          <AlertTriangle className='size-10' />
          <p className='text-sm font-black uppercase tracking-widest'>
            {t('logisticsConfig.suppliers.errors.title')}
          </p>
          <p className='max-w-xl text-center text-[11px] text-rose-400'>{pageError}</p>
        </div>
      ) : isLoading ? (
        <div className='flex h-64 flex-col items-center justify-center gap-3 rounded-[32px] border border-dashed border-slate-200 bg-white/70 text-slate-400'>
          <Loader2 className='size-10 animate-spin' />
          <p className='text-sm font-black uppercase tracking-widest'>
            {t('logisticsConfig.suppliers.loading')}
          </p>
        </div>
      ) : sortedProviders.length === 0 ? (
        <div className='flex h-64 flex-col items-center justify-center gap-3 rounded-[32px] border border-dashed border-slate-200 text-slate-400'>
          <Truck className='size-12 opacity-30' />
          <p className='text-sm font-black uppercase tracking-widest'>
            {t('logisticsConfig.suppliers.emptyTitle')}
          </p>
          <p className='max-w-lg text-center text-[11px] text-muted-foreground'>
            {t('logisticsConfig.suppliers.emptyDescription')}
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
          {sortedProviders.map((entry) => {
            const apiConnected = isProviderApiConnected(entry)
            const templateMatched = Boolean(findLogisticsTemplateByCode(entry.code))
            const verificationStatus = getProviderVerificationStatus(entry)
            const capabilities = getProviderCapabilities(entry)

            return (
              <Card key={String(entry.id ?? entry.code)} className='rounded-[28px] border-dashed bg-background/80 shadow-none'>
                <CardHeader className='space-y-3'>
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <CardTitle className='text-base font-black tracking-tight'>{entry.name}</CardTitle>
                      <CardDescription className='mt-1 text-[10px] font-black uppercase tracking-widest'>
                        {entry.code}
                      </CardDescription>
                    </div>
                    <div className='flex flex-col items-end gap-2'>
                      <Badge className='border-none bg-primary/10 text-primary'>
                        {getProviderCategory(entry) === 'domestic'
                          ? t('logisticsConfig.suppliers.categoryDomestic')
                          : t('logisticsConfig.suppliers.categoryInternational')}
                      </Badge>
                      <Badge className={getProviderVerificationBadgeClass(verificationStatus)}>
                        {getProviderVerificationLabel(verificationStatus)}
                      </Badge>
                    </div>
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    <Badge variant='outline' className='text-[10px]'>
                      {templateMatched
                        ? t('logisticsConfig.suppliers.templateLinked')
                        : t('logisticsConfig.suppliers.customEntry')}
                    </Badge>
                    <Badge variant='outline' className='text-[10px]'>
                      {apiConnected ? t('logisticsConfig.suppliers.apiConnected') : t('logisticsConfig.suppliers.apiNotConnected')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className='space-y-4 text-sm'>
                  <div className='space-y-3 rounded-3xl border border-dashed border-slate-200 p-4'>
                    <div className='text-[10px] font-black uppercase tracking-widest text-slate-500'>目录信息</div>
                    <div className='flex items-start gap-3'>
                      <Globe className='mt-0.5 size-4 text-primary' />
                      <div className='min-w-0 space-y-1'>
                        <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                          {t('logisticsConfig.suppliers.website')}
                        </div>
                        {entry.website?.trim() ? (
                          <a className='break-all font-mono text-xs text-blue-600 hover:underline' href={entry.website} target='_blank' rel='noreferrer'>
                            {entry.website}
                          </a>
                        ) : (
                          <div className='font-bold text-muted-foreground'>{t('logisticsConfig.suppliers.unset')}</div>
                        )}
                      </div>
                    </div>

                    <div className='flex items-start gap-3'>
                      <UserRound className='mt-0.5 size-4 text-primary' />
                      <div className='space-y-1'>
                        <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                          {t('logisticsConfig.suppliers.contact')}
                        </div>
                        <div className='font-bold'>{entry.contact?.trim() || t('logisticsConfig.suppliers.unset')}</div>
                      </div>
                    </div>

                    <div className='flex items-start gap-3'>
                      <Phone className='mt-0.5 size-4 text-primary' />
                      <div className='space-y-1'>
                        <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                          {t('logisticsConfig.suppliers.phone')}
                        </div>
                        <div className='font-bold'>{entry.phone?.trim() || t('logisticsConfig.suppliers.unset')}</div>
                      </div>
                    </div>

                    <div className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-[11px] leading-relaxed text-primary/80'>
                      {entry.note?.trim() || t('logisticsConfig.suppliers.noteEmpty')}
                    </div>
                  </div>

                  <div className='space-y-3 rounded-3xl border border-dashed border-primary/20 bg-primary/5 p-4'>
                    <div className='text-[10px] font-black uppercase tracking-widest text-primary/70'>接口信息</div>
                    <div className='space-y-2 text-[11px] text-slate-600'>
                      <div>
                        <span className='font-black text-slate-500'>Endpoint：</span>
                        <span className='font-mono'>{entry.endpoint?.trim() || t('logisticsConfig.suppliers.unset')}</span>
                      </div>
                      <div>
                        <span className='font-black text-slate-500'>最近验证：</span>
                        <span>{formatProviderVerifiedAt(entry.lastVerifiedAt)}</span>
                      </div>
                      <div>
                        <span className='font-black text-slate-500'>验证摘要：</span>
                        <span>{entry.lastVerificationMessage?.trim() || getProviderVerificationLabel(verificationStatus)}</span>
                      </div>
                    </div>

                    <div className='space-y-2'>
                      <div className='text-[10px] font-black uppercase tracking-widest text-slate-500'>能力标签</div>
                      <div className='flex flex-wrap gap-2'>
                        {capabilities.length > 0 ? (
                          capabilities.map((capability) => (
                            <Badge key={capability} variant='outline' className='text-[10px]'>
                              {getLogisticsCapabilityLabel(capability)}
                            </Badge>
                          ))
                        ) : (
                          <span className='text-xs text-muted-foreground'>未配置能力标签</span>
                        )}
                      </div>
                    </div>

                    <div className='rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-slate-600'>
                      {apiConnected
                        ? t('logisticsConfig.suppliers.apiConnectedHint')
                        : t('logisticsConfig.suppliers.apiNotConnectedHint')}
                    </div>
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    <Button variant='outline' className='rounded-full text-[10px] font-black uppercase tracking-widest' onClick={() => handleEdit(entry)}>
                      <PencilLine className='size-3.5' />
                      {t('logisticsConfig.suppliers.actions.edit')}
                    </Button>
                    <Button asChild className='rounded-full text-[10px] font-black uppercase tracking-widest'>
                      <Link to='/logistics-settings/platforms'>
                        <MoveUpRight className='size-3.5' />
                        {t('logisticsConfig.suppliers.actions.goToPlatforms')}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
