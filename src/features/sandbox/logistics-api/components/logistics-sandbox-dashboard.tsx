import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  Globe,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Truck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { logisticsProviderService } from '../services/logistics-provider-service'
import { LOGISTICS_TEMPLATES, type LogisticsProvider } from '../types'

const emptyFormData: LogisticsProvider = {
  name: '',
  code: '',
  endpoint: '',
  status: 'Enabled',
  appKey: '',
  appSecret: '',
  customerId: '',
  checkWord: '',
  quotaTotal: 0,
  quotaUsed: 0,
  quotaAlertAt: 100,
}

function getProviderSecretKey(provider: LogisticsProvider) {
  return String(provider.id ?? provider.code)
}

export function LogisticsSandboxDashboard() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState<LogisticsProvider>(emptyFormData)
  const [selectedNote, setSelectedNote] = useState('')

  const {
    data: providers = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['logistics-push-providers'],
    queryFn: () => logisticsProviderService.getProviders(),
  })

  const saveMutation = useMutation({
    mutationFn: (provider: LogisticsProvider) =>
      logisticsProviderService.saveProvider(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistics-push-providers'] })
      toast.success('物流接口配置已保存到后端')
      setIsDialogOpen(false)
      setFormData(emptyFormData)
      setSelectedNote('')
    },
    onError: (mutationError: unknown) => {
      const message =
        mutationError instanceof Error ? mutationError.message : '未知错误'
      toast.error(`保存失败: ${message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => logisticsProviderService.deleteProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistics-push-providers'] })
      toast.success('物流接口配置已删除')
    },
    onError: (mutationError: unknown) => {
      const message =
        mutationError instanceof Error ? mutationError.message : '未知错误'
      toast.error(`删除失败: ${message}`)
    },
  })

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleApplyTemplate = (code: string) => {
    const template = LOGISTICS_TEMPLATES.find((item) => item.code === code)
    if (!template) return

    setFormData((prev) => ({
      ...prev,
      name: template.name,
      code: template.code,
      endpoint: template.endpoint,
    }))
    setSelectedNote(template.note)
  }

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setFormData(emptyFormData)
      setSelectedNote('')
    }
  }

  const handleSave = () => {
    saveMutation.mutate(formData)
  }

  const handleDelete = (id?: number) => {
    if (!id) return
    deleteMutation.mutate(id)
  }

  const isFormValid =
    formData.name.trim() !== '' &&
    formData.code.trim() !== '' &&
    formData.endpoint.trim() !== ''

  const isCredentialsComplete =
    (formData.appKey || '').trim() !== '' &&
    (formData.appSecret || '').trim() !== ''

  const pageError =
    error instanceof Error ? error.message : '无法加载后端物流接口配置'

  return (
    <div className='mt-4 mx-4 min-h-screen rounded-[40px] border border-dashed border-slate-200 bg-slate-50/50 p-8 shadow-inner animate-in fade-in zoom-in-95 duration-500'>
      <div className='space-y-8'>
        <div className='flex items-start justify-between gap-4'>
          <div className='space-y-1'>
            <Badge
              variant='outline'
              className='mb-2 border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase italic tracking-widest text-emerald-600'
            >
              Production / 生产环境
            </Badge>
            <h1 className='flex items-center gap-3 text-3xl font-black italic uppercase tracking-tighter text-slate-800'>
              <Truck className='size-8 text-blue-600' /> Logistics API Hub
            </h1>
            <p className='pl-1 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60'>
              统一承运商 API 集成配置中心
            </p>
          </div>

          <div className='flex items-center gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => void refetch()}
              disabled={isFetching}
              className='h-12 rounded-full px-6 font-black text-[10px] uppercase tracking-widest'
            >
              {isFetching ? (
                <Loader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <RefreshCw className='mr-2 size-4' />
              )}
              刷新配置
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button className='h-12 rounded-full bg-slate-900 px-8 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 transition-all hover:scale-105'>
                  <Plus className='mr-2 size-4' />
                  新增物流接口
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-2xl rounded-[32px] border-none bg-white/95 p-8 shadow-2xl backdrop-blur-xl'>
                <DialogHeader>
                  <DialogTitle className='flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter'>
                    <Settings2 className='size-5 text-blue-600' />
                    配置物流接口 (Provider)
                  </DialogTitle>
                </DialogHeader>

                <div className='space-y-6 py-6'>
                  <div className='space-y-2 border-b border-dashed border-slate-200 pb-4'>
                    <Label className='pl-1 text-[10px] font-black uppercase tracking-widest text-blue-600'>
                      快速选择 / 常用物流模板
                    </Label>
                    <Select onValueChange={handleApplyTemplate}>
                      <SelectTrigger className='h-12 rounded-2xl border-blue-500/10 bg-blue-500/5 font-bold text-blue-800'>
                        <SelectValue placeholder='选择物流模板，自动填入名称、编码和默认 endpoint' />
                      </SelectTrigger>
                      <SelectContent className='rounded-2xl border-none shadow-2xl'>
                        {LOGISTICS_TEMPLATES.map((template) => (
                          <SelectItem
                            key={template.code}
                            value={template.code}
                            className='rounded-xl py-3'
                          >
                            <span className='font-black italic'>{template.code}</span>
                            {' - '}
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedNote ? (
                      <p className='flex items-center gap-1 pl-1 text-[9px] font-bold text-blue-500'>
                        <Info className='size-3' />
                        {selectedNote}
                      </p>
                    ) : null}
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label className='pl-1 text-[10px] font-black uppercase tracking-widest opacity-50'>
                        厂商名称
                      </Label>
                      <Input
                        value={formData.name}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                        className='h-12 rounded-2xl border-slate-200 focus-visible:ring-blue-500/30'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label className='pl-1 text-[10px] font-black uppercase tracking-widest opacity-50'>
                        内部唯一编码
                      </Label>
                      <Input
                        value={formData.code}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            code: event.target.value.toUpperCase(),
                          }))
                        }
                        className='h-12 rounded-2xl border-slate-200 font-black italic tracking-tighter'
                      />
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label className='pl-1 text-[10px] font-black uppercase tracking-widest opacity-50'>
                      API 生产地址 (Endpoint)
                    </Label>
                    <Input
                      value={formData.endpoint}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          endpoint: event.target.value,
                        }))
                      }
                      className='h-12 rounded-2xl border-slate-200 font-mono text-[11px]'
                      placeholder='https://...'
                    />
                  </div>

                  <div className='space-y-3 border-t border-dashed border-slate-200 pt-4'>
                    <h4 className='flex items-center gap-2 pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400'>
                      通讯凭证信息
                      <span className='text-[8px] font-bold tracking-normal text-rose-500 normal-case'>
                        * 没填也能保存配置，但后续无法真正调通
                      </span>
                    </h4>
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='space-y-2'>
                        <Label className='pl-1 text-[9px] font-black uppercase tracking-tight text-muted-foreground'>
                          AppKey / Token
                        </Label>
                        <Input
                          value={formData.appKey || ''}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              appKey: event.target.value,
                            }))
                          }
                          className='h-11 rounded-xl bg-slate-50'
                        />
                      </div>
                      <div className='space-y-2'>
                        <Label className='pl-1 text-[9px] font-black uppercase tracking-tight text-muted-foreground'>
                          AppSecret / Secret
                        </Label>
                        <Input
                          type='password'
                          value={formData.appSecret || ''}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              appSecret: event.target.value,
                            }))
                          }
                          className='h-11 rounded-xl bg-slate-50'
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className='flex-col gap-2'>
                  {!isCredentialsComplete && isFormValid ? (
                    <p className='flex w-full items-center justify-center gap-1 text-[10px] font-bold text-amber-600'>
                      <AlertTriangle className='size-3' />
                      当前配置缺少凭证，保存后仅完成面板建档
                    </p>
                  ) : null}
                  <Button
                    onClick={handleSave}
                    disabled={!isFormValid || saveMutation.isPending}
                    className='h-12 w-full rounded-full bg-blue-600 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40'
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className='mr-2 size-4 animate-spin' />
                    ) : (
                      <Check className='mr-2 size-4' />
                    )}
                    {isCredentialsComplete ? '确认保存' : '保存配置（凭证待补）'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isError ? (
          <div className='flex h-64 flex-col items-center justify-center gap-3 rounded-[40px] border-2 border-dashed border-rose-200 bg-rose-50/60 text-rose-500'>
            <AlertTriangle className='size-10' />
            <p className='text-sm font-black uppercase tracking-widest'>
              后端配置加载失败
            </p>
            <p className='max-w-xl text-center text-[10px] font-bold text-rose-400'>
              {pageError}
            </p>
          </div>
        ) : isLoading ? (
          <div className='flex h-64 flex-col items-center justify-center gap-3 rounded-[40px] border-2 border-dashed border-slate-200 bg-white/70 text-slate-400'>
            <Loader2 className='size-10 animate-spin' />
            <p className='text-sm font-black uppercase tracking-widest'>
              正在同步后端物流接口配置
            </p>
          </div>
        ) : providers.length === 0 ? (
          <div className='flex h-64 flex-col items-center justify-center gap-3 rounded-[40px] border-2 border-dashed border-slate-200 text-slate-300'>
            <Truck className='size-12 opacity-20' />
            <span className='text-sm font-black italic uppercase tracking-tighter'>
              暂无物流接口配置
            </span>
            <span className='text-[10px] font-bold text-slate-300'>
              点击右上角“新增物流接口”开始写入真实后端
            </span>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            {providers.map((provider) => {
              const secretKey = getProviderSecretKey(provider)
              const hasCredentials =
                Boolean(provider.appKey?.trim()) &&
                Boolean(provider.appSecret?.trim())
              const quotaRemaining =
                typeof provider.quotaTotal === 'number' &&
                typeof provider.quotaUsed === 'number'
                  ? provider.quotaTotal - provider.quotaUsed
                  : null

              return (
                <Card
                  key={secretKey}
                  className='group relative overflow-hidden rounded-[32px] border-none bg-white shadow-sm transition-all hover:shadow-md'
                >
                  <div
                    className={`absolute top-0 left-0 h-full w-1.5 ${
                      hasCredentials
                        ? 'bg-emerald-500'
                        : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                  <CardHeader className='pb-2'>
                    <div className='flex items-center justify-between gap-4'>
                      <div className='flex items-center gap-4'>
                        <div
                          className={`flex size-12 items-center justify-center rounded-2xl shadow-inner ${
                            hasCredentials ? 'bg-slate-50' : 'bg-amber-50'
                          }`}
                        >
                          {hasCredentials ? (
                            <Globe className='size-6 text-slate-400' />
                          ) : (
                            <AlertTriangle className='size-6 text-amber-500' />
                          )}
                        </div>
                        <div>
                          <CardTitle className='text-lg font-black italic uppercase tracking-tighter'>
                            {provider.name}
                          </CardTitle>
                          <CardDescription className='flex items-center gap-2'>
                            <Badge
                              variant='outline'
                              className='h-4 border-slate-200 px-1.5 text-[8px] font-black uppercase italic tracking-tighter'
                            >
                              {provider.code}
                            </Badge>
                            {provider.status === 'Enabled' ? (
                              <span className='rounded-full bg-emerald-100/50 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-600'>
                                Enabled
                              </span>
                            ) : (
                              <span className='rounded-full bg-slate-200/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-slate-500'>
                                Disabled
                              </span>
                            )}
                            {!hasCredentials ? (
                              <span className='rounded-full bg-amber-100/50 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-600'>
                                凭证缺失
                              </span>
                            ) : null}
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant='ghost'
                        size='icon'
                        disabled={deleteMutation.isPending}
                        className='rounded-full text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500'
                        onClick={() => handleDelete(provider.id)}
                      >
                        <X className='size-4' />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className='space-y-4 pt-2'>
                    <div className='grid grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4'>
                      <div className='space-y-1'>
                        <span className='text-[8px] font-black uppercase tracking-widest text-slate-400'>
                          App Key
                        </span>
                        {provider.appKey?.trim() ? (
                          <div className='flex items-center gap-2'>
                            <span className='max-w-[150px] truncate text-[10px] font-mono font-bold text-slate-600'>
                              {showSecrets[secretKey]
                                ? provider.appKey
                                : '****************'}
                            </span>
                            <button
                              type='button'
                              onClick={() => toggleSecret(secretKey)}
                              className='text-slate-300 transition-colors hover:text-blue-600'
                            >
                              {showSecrets[secretKey] ? (
                                <EyeOff className='size-3' />
                              ) : (
                                <Eye className='size-3' />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className='text-[10px] font-bold text-rose-500'>
                            未配置，请补充凭证
                          </span>
                        )}
                      </div>

                      <div className='space-y-1'>
                        <span className='text-[8px] font-black uppercase tracking-widest text-slate-400'>
                          Endpoint
                        </span>
                        <span className='block truncate text-[9px] font-mono font-bold text-slate-500'>
                          {provider.endpoint || '未配置'}
                        </span>
                      </div>
                    </div>

                    <div className='grid grid-cols-3 gap-3 rounded-2xl border border-dashed border-slate-100 bg-white p-4'>
                      <div className='space-y-1'>
                        <span className='text-[8px] font-black uppercase tracking-widest text-slate-400'>
                          Quota Total
                        </span>
                        <p className='text-sm font-black italic tracking-tighter text-slate-700'>
                          {provider.quotaTotal ?? 0}
                        </p>
                      </div>
                      <div className='space-y-1'>
                        <span className='text-[8px] font-black uppercase tracking-widest text-slate-400'>
                          Quota Used
                        </span>
                        <p className='text-sm font-black italic tracking-tighter text-slate-700'>
                          {provider.quotaUsed ?? 0}
                        </p>
                      </div>
                      <div className='space-y-1'>
                        <span className='text-[8px] font-black uppercase tracking-widest text-slate-400'>
                          Remaining
                        </span>
                        <p className='text-sm font-black italic tracking-tighter text-slate-700'>
                          {quotaRemaining ?? '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
