/**
 * PDA 终端配置 tab — 给 PDA 端用户配置个人工作台默认值与扫码协议。
 *
 * 与 pda-shell.tsx 区别: shell 是 PDA 设备运行时入口,本组件是 web 后台的 PDA 配置 UI。
 *
 * 配置项:
 *   - 默认工作台快捷指令(createDefaultWorkbenchForm 按当前协议生成默认表单)
 *   - 扫码协议(linear barcode 解析规则) 由 LinearBarcodeProtocolConfig 提供
 *
 * 此组件只负责 UI 配置呈现,真正下发协议到 PDA 设备由后端 sidebarCommandAssignment 链路处理。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  CheckCircle2,
  Loader2,
  MonitorSmartphone,
  MoveUpRight,
  Radio,
  Save,
  ScanLine,
  Send,
  Workflow,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { canOpenRouteEntryNonBlocking } from '@/features/authz/guards/route-entry-access'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { TrackingNumberInput } from '@/components/tracking-number-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  createDefaultLinearBarcodeProtocolConfig,
  type LinearBarcodeProtocolConfig,
} from '@/features/basic-settings/data/linear-barcode-protocol'
import { linearBarcodeProtocolService } from '@/features/basic-settings/services/linear-barcode-protocol-service'
import {
  pdaIngestService,
  type PDAIngestRequest,
  type PDAIngestResponse,
} from '../services/pda-ingest-service'
import { getPdaCategories } from '../data'
import { isForbiddenError } from '@/lib/error-status'
import { useAuthStore } from '@/stores/auth-store'
import { createLogger } from '@/lib/logger'
import {
  normalizeDeviceCode,
  normalizeMachineCode,
  normalizeMaterialCode,
  normalizeSceneKey,
  normalizeTaskKey,
} from '@/lib/codecs/code-normalization'

type PDAWorkbenchForm = {
  rawCode: string
  symbology: string
  scene: string
  deviceId: string
  taskId: string
  materialCode: string
  batchNo: string
  scannedQty: string
}

const SYMBOLOGY_OPTIONS = [
  { value: 'code128', label: 'Code 128' },
  { value: 'ean13', label: 'EAN-13' },
  { value: 'dm', label: 'Data Matrix' },
  { value: 'qr', label: 'QR Code' },
]

const logger = createLogger('TerminalPdaTab')

function createDefaultWorkbenchForm(config: LinearBarcodeProtocolConfig): PDAWorkbenchForm {
  return {
    rawCode: '',
    symbology: config.ingestDefaults.symbology,
    scene: config.ingestDefaults.scene,
    deviceId: config.ingestDefaults.deviceId,
    taskId: '',
    materialCode: '',
    batchNo: '',
    scannedQty: String(config.ingestDefaults.scannedQty || 1),
  }
}

export function PDATerminalTab() {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const canOpenShell = canOpenRouteEntryNonBlocking(user, '/pda-shell')
  const [protocolConfig, setProtocolConfig] = useState<LinearBarcodeProtocolConfig>(
    createDefaultLinearBarcodeProtocolConfig
  )
  const [form, setForm] = useState<PDAWorkbenchForm>(() =>
    createDefaultWorkbenchForm(createDefaultLinearBarcodeProtocolConfig())
  )
  const [autoSubmit, setAutoSubmit] = useState(false)
  const [isConfigLoading, setIsConfigLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDefaults, setIsSavingDefaults] = useState(false)
  const [result, setResult] = useState<PDAIngestResponse | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [pageError, setPageError] = useState<unknown>(null)
  const lastAutoSubmittedRef = useRef('')

  const sceneOptions = [
    { value: 'general', label: t('terminalConfig.pda.sceneOptions.general') },
    { value: 'stocktake', label: t('terminalConfig.pda.sceneOptions.stocktake') },
    { value: 'production', label: t('terminalConfig.pda.sceneOptions.production') },
    { value: 'traceability', label: t('terminalConfig.pda.sceneOptions.traceability') },
  ]
  const pdaCategories = getPdaCategories(t)

  useEffect(() => {
    let active = true

    const loadProtocolConfig = async () => {
      if (active) {
        setPageError(null)
      }
      setIsConfigLoading(true)
      try {
        const config = await linearBarcodeProtocolService.getConfig()
        if (!active) return

        setProtocolConfig(config)
        setForm((current) => ({
          ...current,
          symbology: config.ingestDefaults.symbology,
          scene: config.ingestDefaults.scene,
          deviceId: config.ingestDefaults.deviceId,
          scannedQty: String(config.ingestDefaults.scannedQty || 1),
        }))
        setAutoSubmit(config.ingestDefaults.autoSubmit)
      } catch (error) {
        if (active) {
          setPageError(error)
        }
        logger.error('Failed to load protocol config', error)
      } finally {
        if (active) {
          setIsConfigLoading(false)
        }
      }
    }

    void loadProtocolConfig()

    return () => {
      active = false
    }
  }, [])

  const normalizedRawCode = useMemo(() => normalizeMachineCode(form.rawCode), [form.rawCode])

  const payloadPreview = useMemo<PDAIngestRequest>(() => {
    const parsedQty = Number(form.scannedQty)
    return {
      rawCode: normalizedRawCode,
      symbology: form.symbology,
      scene: normalizeSceneKey(form.scene),
      deviceId: normalizeDeviceCode(form.deviceId),
      taskId: normalizeTaskKey(form.taskId) || undefined,
      materialCode: normalizeMaterialCode(form.materialCode) || undefined,
      batchNo: form.batchNo.trim() || undefined,
      scannedQty:
        Number.isFinite(parsedQty) && parsedQty > 0
          ? parsedQty
          : protocolConfig.ingestDefaults.scannedQty,
    }
  }, [form, normalizedRawCode, protocolConfig.ingestDefaults.scannedQty])

  const submitIngest = useCallback(
    async (overrideRawCode?: string) => {
      const payload: PDAIngestRequest = {
        ...payloadPreview,
        rawCode: normalizeMachineCode(overrideRawCode || payloadPreview.rawCode),
      }

      if (!payload.rawCode) {
        const message = t('terminalConfig.pda.toast.rawCodeRequired')
        setLastError(message)
        toast.error(message)
        return null
      }

      setIsSubmitting(true)
      setLastError(null)

      try {
        const response = await pdaIngestService.ingest(payload)
        setResult(response)
        lastAutoSubmittedRef.current = payload.rawCode
        toast.success(t('terminalConfig.pda.toast.submitSuccess'), {
          description: response.parsed.summary,
        })
        return response
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('terminalConfig.pda.toast.submitFailed')
        setLastError(message)
        toast.error(message)
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [payloadPreview, t]
  )

  useEffect(() => {
    if (!autoSubmit || isSubmitting) return
    if (!normalizedRawCode || normalizedRawCode.length < 8) return
    if (normalizedRawCode === lastAutoSubmittedRef.current) return

    const timer = window.setTimeout(() => {
      void submitIngest(normalizedRawCode)
    }, 320)

    return () => window.clearTimeout(timer)
  }, [autoSubmit, isSubmitting, normalizedRawCode, submitIngest])

  const handleSaveDefaults = useCallback(async () => {
    setIsSavingDefaults(true)
    try {
      const parsedQty = Number(form.scannedQty)
      const saved = await linearBarcodeProtocolService.updateConfig({
        ...protocolConfig,
        ingestDefaults: {
          symbology: form.symbology,
          scene: normalizeSceneKey(form.scene),
          deviceId: normalizeDeviceCode(form.deviceId) || protocolConfig.ingestDefaults.deviceId,
          scannedQty:
            Number.isFinite(parsedQty) && parsedQty > 0
              ? parsedQty
              : protocolConfig.ingestDefaults.scannedQty,
          autoSubmit,
        },
      })

      setProtocolConfig(saved)
      toast.success(t('terminalConfig.pda.toast.saveDefaultsSuccess'))
    } catch (error) {
      logger.error('Failed to save ingest defaults', error)
      toast.error(t('terminalConfig.pda.toast.saveDefaultsFailed'))
    } finally {
      setIsSavingDefaults(false)
    }
  }, [autoSubmit, form.deviceId, form.scene, form.scannedQty, form.symbology, protocolConfig, t])

  const bridgeReady = Boolean(
    payloadPreview.taskId && payloadPreview.materialCode && payloadPreview.scannedQty
  )
  const bridgeSignals = [
    {
      key: 'taskId',
      label: t('terminalConfig.pda.fields.taskId'),
      value: payloadPreview.taskId,
      ready: Boolean(payloadPreview.taskId),
    },
    {
      key: 'materialCode',
      label: t('terminalConfig.pda.fields.materialCode'),
      value: payloadPreview.materialCode,
      ready: Boolean(payloadPreview.materialCode),
    },
    {
      key: 'scannedQty',
      label: t('terminalConfig.pda.fields.scannedQty'),
      value: payloadPreview.scannedQty ? String(payloadPreview.scannedQty) : undefined,
      ready: Boolean(payloadPreview.scannedQty),
    },
  ]

  if (isForbiddenError(pageError)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        title={t('terminalConfig.pda.page.title')}
        description={t('terminalConfig.pda.page.description')}
        icon={MonitorSmartphone}
        statusBadge={<div className='flex flex-wrap items-center gap-2'>
          {canOpenShell ? (
            <Button asChild variant='outline' className='rounded-full text-[10px] font-black uppercase tracking-widest'>
              <Link to='/pda-shell'>
                <MoveUpRight className='mr-2 size-3.5' />
                {t('terminalConfig.pda.page.openShell')}
              </Link>
            </Button>
          ) : null}
          <Badge className='bg-emerald-500/6 text-emerald-600 border-none'>
            {isConfigLoading
              ? t('terminalConfig.pda.page.configLoading')
              : t('terminalConfig.pda.page.configReady')}
          </Badge>
          <Badge className='bg-amber-500/6 text-amber-600 border-none'>
            {autoSubmit
              ? t('terminalConfig.pda.page.autoSubmitOn')
              : t('terminalConfig.pda.page.autoSubmitOff')}
          </Badge>
        </div>}
      />

      <div className='grid grid-cols-1 xl:grid-cols-12 gap-6'>
        <Card className='xl:col-span-8 rounded-[28px] border-dashed bg-muted/5 shadow-inner border-muted/50'>
          <CardHeader className='pb-4'>
            <CardTitle className='text-sm md:text-base font-black tracking-tight uppercase flex items-center gap-2'>
              <ScanLine className='size-4 text-primary' />
              {t('terminalConfig.pda.workbench.title')}
            </CardTitle>
            <CardDescription className='text-[10px] md:text-[11px] font-medium text-muted-foreground/70'>
              {t('terminalConfig.pda.workbench.description')}
            </CardDescription>
          </CardHeader>

          <CardContent className='space-y-6'>
            <div className='rounded-[24px] border border-dashed border-primary/20 bg-primary/5 p-4 md:p-5 space-y-4'>
              <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                <div className='space-y-1'>
                  <p className='text-[10px] font-black uppercase tracking-widest text-primary/80'>
                    {t('terminalConfig.pda.workbench.inputTitle')}
                  </p>
                  <p className='text-xs text-muted-foreground/70 font-medium'>
                    {t('terminalConfig.pda.workbench.inputDescription')}
                  </p>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='flex items-center gap-2'>
                    <Switch checked={autoSubmit} onCheckedChange={setAutoSubmit} />
                    <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
                      {t('terminalConfig.pda.workbench.autoSubmit')}
                    </span>
                  </div>
                  <Button
                    variant='outline'
                    className='rounded-full text-[10px] font-black uppercase tracking-widest'
                    onClick={() => void handleSaveDefaults()}
                    disabled={isSavingDefaults}
                  >
                    {isSavingDefaults ? (
                      <Loader2 className='mr-2 size-3.5 animate-spin' />
                    ) : (
                      <Save className='mr-2 size-3.5' />
                    )}
                    {t('terminalConfig.pda.workbench.saveDefaults')}
                  </Button>
                </div>
              </div>

              <TrackingNumberInput
                value={form.rawCode}
                onValueChange={(value) => {
                  lastAutoSubmittedRef.current = value === form.rawCode ? lastAutoSubmittedRef.current : ''
                  setForm((current) => ({ ...current, rawCode: normalizeMachineCode(value) }))
                  setLastError(null)
                }}
                placeholder={t('terminalConfig.pda.workbench.inputPlaceholder')}
                inputClassName='h-12 rounded-2xl bg-background/80 border-dashed'
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4'>
              <div className='space-y-2'>
                <label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {t('terminalConfig.pda.fields.symbology')}
                </label>
                <Select
                  value={form.symbology}
                  onValueChange={(value) => setForm((current) => ({ ...current, symbology: value }))}
                >
                  <SelectTrigger className='h-11 rounded-2xl'>
                    <SelectValue placeholder={t('terminalConfig.pda.fields.symbologyPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {SYMBOLOGY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {t('terminalConfig.pda.fields.scene')}
                </label>
                <Select
                  value={form.scene}
                  onValueChange={(value) => setForm((current) => ({ ...current, scene: normalizeSceneKey(value) }))}
                >
                  <SelectTrigger className='h-11 rounded-2xl'>
                    <SelectValue placeholder={t('terminalConfig.pda.fields.scenePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {sceneOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {t('terminalConfig.pda.fields.deviceId')}
                </label>
                <Input
                  value={form.deviceId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, deviceId: normalizeDeviceCode(event.target.value) }))
                  }
                  placeholder='PDA-01'
                  className='h-11 rounded-2xl'
                />
              </div>

              <div className='space-y-2'>
                <label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {t('terminalConfig.pda.fields.scannedQty')}
                </label>
                <Input
                  type='number'
                  min='0'
                  step='1'
                  value={form.scannedQty}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, scannedQty: event.target.value }))
                  }
                  placeholder='1'
                  className='h-11 rounded-2xl'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div className='space-y-2'>
                <label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {t('terminalConfig.pda.fields.taskId')}
                </label>
                <Input
                  value={form.taskId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, taskId: normalizeTaskKey(event.target.value) }))
                  }
                  placeholder={t('terminalConfig.pda.fields.taskIdPlaceholder')}
                  className='h-11 rounded-2xl'
                />
              </div>

              <div className='space-y-2'>
                <label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {t('terminalConfig.pda.fields.materialCode')}
                </label>
                <Input
                  value={form.materialCode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      materialCode: normalizeMaterialCode(event.target.value),
                    }))
                  }
                  placeholder='MAT-001'
                  className='h-11 rounded-2xl'
                />
              </div>

              <div className='space-y-2'>
                <label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {t('terminalConfig.pda.fields.batchNo')}
                </label>
                <Input
                  value={form.batchNo}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, batchNo: event.target.value.toUpperCase() }))
                  }
                  placeholder={t('terminalConfig.pda.fields.batchNoPlaceholder')}
                  className='h-11 rounded-2xl'
                />
              </div>
            </div>

            <div className='flex flex-col gap-4 rounded-[24px] border border-dashed border-muted/50 bg-background/60 p-4 md:flex-row md:items-stretch md:justify-between'>
              <div
                className={`flex-1 rounded-[20px] border border-dashed p-4 space-y-3 ${
                  bridgeReady
                    ? 'border-emerald-500/25 bg-emerald-500/6'
                    : 'border-amber-500/25 bg-amber-500/6'
                }`}
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='space-y-1'>
                    <p
                      className={`text-[10px] font-black uppercase tracking-widest ${
                        bridgeReady ? 'text-emerald-700/80' : 'text-amber-700/80'
                      }`}
                    >
                      {t('terminalConfig.pda.routing.title')}
                    </p>
                    <p className='text-sm font-bold leading-relaxed text-foreground/90'>
                      {bridgeReady
                        ? t('terminalConfig.pda.routing.ready')
                        : t('terminalConfig.pda.routing.idle')}
                    </p>
                  </div>
                  <Badge
                    className={`border-none ${
                      bridgeReady
                        ? 'bg-emerald-500/10 text-emerald-700'
                        : 'bg-amber-500/10 text-amber-700'
                    }`}
                  >
                    {bridgeReady
                      ? t('terminalConfig.pda.response.bridged')
                      : t('terminalConfig.pda.response.ingestOnly')}
                  </Badge>
                </div>

                <div className='flex flex-wrap gap-2'>
                  {bridgeSignals.map((signal) => (
                    <div
                      key={signal.key}
                      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold ${
                        signal.ready
                          ? 'border-emerald-500/20 bg-background/80 text-emerald-700'
                          : 'border-amber-500/20 bg-background/80 text-amber-700'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${signal.ready ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      />
                      <span className='uppercase tracking-widest opacity-70'>{signal.label}</span>
                      <span className='max-w-[16rem] truncate text-foreground/80'>
                        {signal.value || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className='rounded-full px-8 h-11 text-[10px] font-black uppercase tracking-widest'
                onClick={() => void submitIngest()}
                disabled={isSubmitting || !normalizedRawCode}
              >
                {isSubmitting ? (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                ) : (
                  <Send className='mr-2 size-4' />
                )}
                {t('terminalConfig.pda.routing.submit')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className='xl:col-span-4 space-y-6'>
          <Card className='rounded-[28px] border-dashed bg-muted/5 shadow-inner border-muted/50'>
            <CardHeader className='pb-4'>
              <CardTitle className='text-sm md:text-base font-black tracking-tight uppercase flex items-center gap-2'>
                <Workflow className='size-4 text-primary' />
                {t('terminalConfig.pda.defaults.title')}
              </CardTitle>
              <CardDescription className='text-[10px] md:text-[11px] font-medium text-muted-foreground/70'>
                {t('terminalConfig.pda.defaults.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <div className='rounded-2xl border border-dashed border-muted/50 bg-background/70 p-4 space-y-2'>
                <div className='flex items-center justify-between gap-3'>
                  <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                    {t('terminalConfig.pda.defaults.sequenceRule')}
                  </span>
                  <Badge className='bg-primary/10 text-primary border-none'>
                    {protocolConfig.sequenceRuleKey}
                  </Badge>
                </div>
                <p className='text-xs text-muted-foreground/70'>
                  {t('terminalConfig.pda.defaults.sequenceRuleHint')}
                </p>
              </div>

              <div className='rounded-2xl border border-dashed border-muted/50 bg-background/70 p-4 space-y-2'>
                <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  <Radio className='size-3.5 text-primary' />
                  {t('terminalConfig.pda.defaults.payloadPreview')}
                </div>
                <div className='grid grid-cols-1 gap-2 text-xs font-medium text-muted-foreground/80'>
                  <div>{t('terminalConfig.pda.payload.rawCode')}: {payloadPreview.rawCode || '-'}</div>
                  <div>{t('terminalConfig.pda.payload.symbology')}: {payloadPreview.symbology || '-'}</div>
                  <div>{t('terminalConfig.pda.payload.scene')}: {payloadPreview.scene || '-'}</div>
                  <div>{t('terminalConfig.pda.payload.deviceId')}: {payloadPreview.deviceId || '-'}</div>
                  <div>{t('terminalConfig.pda.payload.taskId')}: {payloadPreview.taskId || '-'}</div>
                  <div>{t('terminalConfig.pda.payload.materialCode')}: {payloadPreview.materialCode || '-'}</div>
                  <div>{t('terminalConfig.pda.payload.batchNo')}: {payloadPreview.batchNo || '-'}</div>
                  <div>{t('terminalConfig.pda.payload.scannedQty')}: {payloadPreview.scannedQty ?? '-'}</div>
                </div>
              </div>

              {lastError ? (
                <div className='rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs font-medium text-rose-700'>
                  {lastError}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className='rounded-[28px] border-dashed bg-muted/5 shadow-inner border-muted/50'>
            <CardHeader className='pb-4'>
              <CardTitle className='text-sm md:text-base font-black tracking-tight uppercase flex items-center gap-2'>
                <CheckCircle2 className='size-4 text-primary' />
                {t('terminalConfig.pda.response.title')}
              </CardTitle>
              <CardDescription className='text-[10px] md:text-[11px] font-medium text-muted-foreground/70'>
                {t('terminalConfig.pda.response.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {result ? (
                <>
                  <div className='rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2'>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-[10px] font-black uppercase tracking-widest text-emerald-700'>
                        {result.protocol}
                      </span>
                      <Badge className='bg-emerald-500/10 text-emerald-700 border-none'>
                        {result.bridge?.applied
                          ? t('terminalConfig.pda.response.bridged')
                          : t('terminalConfig.pda.response.ingestOnly')}
                      </Badge>
                    </div>
                    <p className='text-sm font-bold text-foreground/90'>{result.parsed.summary}</p>
                    <p className='text-xs text-muted-foreground/70'>
                      {t('terminalConfig.pda.response.productionDate')} {result.parsed.productionDate} /{' '}
                      {t('terminalConfig.pda.response.shortTag')} {result.parsed.shortTag}
                    </p>
                  </div>

                  <div className='grid grid-cols-2 gap-3 text-xs font-medium text-muted-foreground/80'>
                    <div className='rounded-xl bg-background/70 border border-dashed border-muted/50 p-3'>
                      <div>{t('terminalConfig.pda.response.year')}: {result.parsed.segments.year}</div>
                      <div>{t('terminalConfig.pda.response.month')}: {result.parsed.segments.monthCode}</div>
                      <div>{t('terminalConfig.pda.response.day')}: {result.parsed.segments.day}</div>
                      <div>{t('terminalConfig.pda.response.model')}: {result.parsed.segments.modelCode}</div>
                      <div>{t('terminalConfig.pda.response.appearance')}: {result.parsed.segments.appearanceCode}</div>
                    </div>
                    <div className='rounded-xl bg-background/70 border border-dashed border-muted/50 p-3'>
                      <div>{t('terminalConfig.pda.response.holePrefix')}: {result.parsed.segments.holePrefix}</div>
                      <div>{t('terminalConfig.pda.response.holes')}: {result.parsed.segments.holes}</div>
                      <div>{t('terminalConfig.pda.response.serial')}: {result.parsed.segments.serial}</div>
                      <div>{t('terminalConfig.pda.response.product')}: {result.resolved?.product?.name || '-'}</div>
                      <div>{t('terminalConfig.pda.response.material')}: {result.resolved?.material?.name || '-'}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className='rounded-2xl border border-dashed border-muted/50 bg-background/70 p-5 text-sm text-muted-foreground/70'>
                  {t('terminalConfig.pda.response.empty')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
        {pdaCategories.map((section) => {
          const SectionIcon = section.icon
          return (
            <Card
              key={section.title}
              className='rounded-[28px] border-dashed bg-muted/5 shadow-inner border-muted/50'
            >
              <CardHeader className='pb-4'>
                <CardTitle className='text-sm md:text-base font-black tracking-tight uppercase flex items-center gap-2'>
                  <SectionIcon className='size-4 text-primary' />
                  {section.title}
                </CardTitle>
                <CardDescription className='text-[10px] md:text-[11px] font-medium text-muted-foreground/70'>
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {section.items.map((item) => (
                  <div
                    key={item.title}
                    className='rounded-2xl border border-dashed border-muted/50 bg-background/70 p-4 space-y-3'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='space-y-1'>
                        <h4 className='text-sm font-black tracking-tight'>{item.title}</h4>
                        <p className='text-[10px] font-bold text-muted-foreground/60'>{item.target}</p>
                      </div>
                      <Badge
                        className={
                          item.status === 'pendingUpload'
                            ? 'bg-amber-500/10 text-amber-600 border-none'
                            : 'bg-emerald-500/10 text-emerald-600 border-none'
                        }
                      >
                        {item.status === 'pendingUpload'
                          ? t('terminalConfig.shared.statusPendingUpload')
                          : t('terminalConfig.shared.statusPlanned')}
                      </Badge>
                    </div>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-bold text-muted-foreground/70'>
                      <div>{`${t('terminalConfig.shared.versionLabel')}: ${item.version}`}</div>
                      <div>{`${t('terminalConfig.shared.packageTypeLabel')}: ${item.packageType}`}</div>
                    </div>
                    <p className='text-[11px] leading-relaxed text-muted-foreground/80'>{item.note}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
