/**
 * 包装件组装 — 仓库出货前把多个 SKU 物理打包成一个发货单元(箱/托盘)。
 *
 * 业务流程:
 *   1. 选目标(销售订单 / 客户)
 *   2. 扫描多个产品标签码(PackagingQrCanvas 渲染待绑标签)
 *   3. 选包装规格(箱型 + 装箱数)
 *   4. 提交后生成包装件二维码(集装码)+ 关联到所有内含产品(供后续追溯)
 *
 * 主要 sub-component:
 *   - PackagingQrCanvas         扫码框 + 实时反馈
 *   - PackageCodePrintFormatSelector  打印格式选择(标签纸/A4 等)
 *   - AssemblyRecord            历史组装记录(展开看明细)
 *
 * 关键不变量:
 *   - 同一标签码不能进入两个不同的包装件
 *   - 包装件 = 集装码 + 多个内含产品标签码 (1:N),后端通过 unique 索引兜底
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Boxes,
  Barcode,
  CheckCircle2,
  Loader2,
  PackageCheck,
  Printer,
  QrCode,
  RefreshCw,
  Smartphone,
} from 'lucide-react'
import { toast } from 'sonner'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { renderBwipBarcode } from '@/lib/bwip-renderer'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import {
  PackagingAssemblyPrintDialog,
  type PackagingLabelType,
} from '../components/packaging-assembly-print-dialog'
import { warehouseQueryKeys } from '../query-keys'
import {
  PackagingAssemblyService,
  type PackagingAssembly,
  type PackagingAssemblyCaptureSession,
} from '../services/packaging-assembly-service'

const logger = createLogger('PackagingAssembly')

type PackagingCopy = {
  title: string
  description: string
  createSession: string
  refresh: string
  printPackageCode: string
  printFormat: string
  barcodeLabel: string
  qrLabel: string
  barcodeHint: string
  qrHint: string
  mobileEntry: string
  packageCode: string
  scanHint: string
  status: string
  latestAssemblies: string
  itemCount: string
  productBarcodes: string
  empty: string
  sessionCreated: string
  submitted: string
}

const copyByLocale: Record<'zh-CN' | 'en-US', PackagingCopy> = {
  'zh-CN': {
    title: '装箱组装',
    description:
      '创建装箱码，打印后贴到外箱；手机扫描贴好的二维码进入装箱采集页，再录入系统产品一维码。',
    createSession: '新建装箱码',
    refresh: '刷新',
    printPackageCode: '打印装箱码',
    printFormat: '打印格式',
    barcodeLabel: '一维码',
    qrLabel: '二维码',
    barcodeHint: '适合扫码枪识别箱码',
    qrHint: '适合手机扫码进入采集',
    mobileEntry: '装箱码生成',
    packageCode: '箱码 / 组装码',
    scanHint:
      '先打印装箱码并贴到外箱。若选择二维码标签，手机扫描箱体贴纸后进入采集页，再逐个录入内部产品一维码。',
    status: '状态',
    latestAssemblies: '装箱组装记录',
    itemCount: '件数',
    productBarcodes: '产品一维码',
    empty: '暂无装箱记录，先新建一个装箱码。',
    sessionCreated: '装箱码已创建',
    submitted: '装箱组装已完成',
  },
  'en-US': {
    title: 'Packaging Assembly',
    description:
      'Create a package QR, scan it with a phone, then scan bound product barcodes into the package.',
    createSession: 'New Package Code',
    refresh: 'Refresh',
    printPackageCode: 'Print Package Code',
    printFormat: 'Print Format',
    barcodeLabel: 'Linear Barcode',
    qrLabel: 'QR Code',
    barcodeHint: 'For scanner-gun package lookup',
    qrHint: 'For mobile capture entry',
    mobileEntry: 'Package Code Setup',
    packageCode: 'Package / Assembly Code',
    scanHint:
      'Print the package code and attach it to the carton. QR labels open the mobile capture page; then scan product barcodes inside the package.',
    status: 'Status',
    latestAssemblies: 'Packaging Records',
    itemCount: 'Items',
    productBarcodes: 'Product Barcodes',
    empty: 'No packaging records yet. Create a package code first.',
    sessionCreated: 'Package code created',
    submitted: 'Packaging assembly submitted',
  },
}

function PackagingQrCanvas({
  code,
  type = 'qrcode',
  className = 'size-40',
}: {
  code: string
  type?: 'qrcode' | 'code128'
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!code || !canvasRef.current) return
    let cancelled = false
    const render = async () => {
      try {
        if (!canvasRef.current || cancelled) return
        await renderBwipBarcode({
          canvas: canvasRef.current,
          code,
          type,
        })
      } catch {
        return
      }
    }
    void render()
    return () => {
      cancelled = true
    }
  }, [code, type])

  return <canvas ref={canvasRef} className={className} />
}

function formatDateTime(value?: string) {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
}

function PackageCodePrintFormatSelector({
  packageCode,
  qrCodeValue,
  selectedType,
  onSelect,
  copy,
}: {
  packageCode: string
  qrCodeValue: string
  selectedType: PackagingLabelType
  onSelect: (type: PackagingLabelType) => void
  copy: PackagingCopy
}) {
  const options: Array<{
    type: PackagingLabelType
    label: string
    hint: string
    code: string
    icon: typeof Barcode
  }> = [
    {
      type: 'code128',
      label: copy.barcodeLabel,
      hint: copy.barcodeHint,
      code: packageCode,
      icon: Barcode,
    },
    {
      type: 'qrcode',
      label: copy.qrLabel,
      hint: copy.qrHint,
      code: qrCodeValue || packageCode,
      icon: QrCode,
    },
  ]

  return (
    <div className='mt-3 space-y-2'>
      <div className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
        {copy.printFormat}
      </div>
      <div className='grid gap-2 sm:grid-cols-2'>
        {options.map((option) => {
          const Icon = option.icon
          const selected = selectedType === option.type
          return (
            <button
              key={option.type}
              type='button'
              onClick={() => onSelect(option.type)}
              className={`min-w-0 rounded-lg border p-2 text-left transition ${
                selected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-background hover:border-primary/40'
              }`}
            >
              <div className='mb-2 flex items-center justify-between gap-2'>
                <span className='inline-flex items-center gap-1.5 text-[11px] font-black'>
                  <Icon className='size-3.5' />
                  {option.label}
                </span>
                <span
                  className={`size-2 rounded-full ${
                    selected ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              </div>
              <div className='flex h-14 items-center justify-center overflow-hidden rounded-md bg-white p-1'>
                <PackagingQrCanvas
                  code={option.code}
                  type={option.type}
                  className={
                    option.type === 'code128'
                      ? 'h-10 w-full max-w-full'
                      : 'size-12'
                  }
                />
              </div>
              <div className='mt-1 truncate text-[10px] font-bold text-muted-foreground'>
                {option.hint}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function PackagingAssembly() {
  const { locale } = useLanguage()
  const copy = copyByLocale[locale]
  const queryClient = useQueryClient()
  const [captureSession, setCaptureSession] =
    useState<PackagingAssemblyCaptureSession | null>(null)
  const [printPackageCode, setPrintPackageCode] = useState('')
  const [printLabelType, setPrintLabelType] =
    useState<PackagingLabelType>('code128')

  const assembliesQuery = useQuery({
    queryKey: warehouseQueryKeys.packagingAssemblies(),
    queryFn: () => PackagingAssemblyService.list(20),
  })

  const captureUrl = useMemo(() => {
    if (!captureSession?.uploadToken || typeof window === 'undefined') return ''
    const sessionId = encodeURIComponent(captureSession.sessionId)
    const token = encodeURIComponent(captureSession.uploadToken)
    const packageCode = encodeURIComponent(captureSession.packageCode)
    return `${window.location.origin}/packaging-assembly-capture/${sessionId}?token=${token}&packageCode=${packageCode}`
  }, [captureSession])

  const createSessionMutation = useMutation({
    mutationFn: () => PackagingAssemblyService.createCaptureSession(),
    onSuccess: (session) => {
      setCaptureSession(session)
      toast.success(copy.sessionCreated, { description: session.packageCode })
    },
  })

  useEffect(() => {
    if (!captureSession || captureSession.status !== 'Waiting') return
    let isActive = true

    const pollCaptureSession = async () => {
      try {
        const nextSession = await PackagingAssemblyService.getCaptureSession(captureSession.sessionId)
        if (!isActive) {
          return
        }

        setCaptureSession((current) => ({
          ...nextSession,
          uploadToken: current?.uploadToken,
        }))
        if (nextSession.status === 'Submitted') {
          toast.success(copy.submitted, {
            description: nextSession.packageCode,
          })
          await queryClient.invalidateQueries({
            queryKey: warehouseQueryKeys.packagingAssemblies(),
          })
        }
      } catch (error) {
        logger.warn('Failed to poll packaging capture session', error)
      }
    }

    const intervalId = window.setInterval(() => {
      void pollCaptureSession()
    }, 2500)

    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [captureSession, copy.submitted, queryClient])

  const assembliesResource = useMemo(() => {
    if (assembliesQuery.isLoading) {
      return { status: 'loading' as const }
    }

    if (assembliesQuery.error) {
      return {
        status: 'error' as const,
        error: assembliesQuery.error instanceof Error
          ? assembliesQuery.error
          : new Error(String(assembliesQuery.error)),
        scope: 'PackagingAssembly.assembliesQuery',
      }
    }

    if (!assembliesQuery.data || !Array.isArray(assembliesQuery.data.items)) {
      return {
        status: 'error' as const,
        error: new Error('[CRITICAL] Packaging assemblies payload missing items after load'),
        scope: 'PackagingAssembly.assembliesQuery',
      }
    }

    return {
      status: 'ready' as const,
      items: assembliesQuery.data.items,
    }
  }, [assembliesQuery.data, assembliesQuery.error, assembliesQuery.isLoading])

  useEffect(() => {
    if (assembliesResource.status !== 'error') {
      return
    }

    logger.error(`Assemblies resource failed: ${assembliesResource.scope}`, assembliesResource.error)
    failLoudly(assembliesResource.error, assembliesResource.scope, { silentUI: true })
  }, [assembliesResource])

  const latestAssemblyPackageCode =
    assembliesResource.status === 'ready' && assembliesResource.items.length > 0
      ? assembliesResource.items[0].packageCode
      : ''
  const activePackageCode =
    captureSession?.packageCode || latestAssemblyPackageCode || ''
  const selectedPrintBarcodeValue =
    printLabelType === 'qrcode' && printPackageCode === activePackageCode
      ? captureUrl || printPackageCode
      : printPackageCode
  const isPrintDialogOpen = printPackageCode.trim() !== ''

  return (
    <div className='flex animate-in flex-col gap-5 duration-500 fade-in'>
      <IndustrialHeader
        title={copy.title}
        description={copy.description}
        icon={Boxes}
      />

      <div className='flex justify-end'>
        <AuditTimelineTriggerButton
          module={AUDIT_MODULES.packagingAssembly}
          targetName={copy.title}
          label='审计'
          className='h-10 md:h-11 rounded-full px-4 md:px-5'
        />
      </div>
      <PackagingAssemblyPrintDialog
        open={isPrintDialogOpen}
        onOpenChange={(open) => {
          if (!open) setPrintPackageCode('')
        }}
        packageCode={printPackageCode}
        barcodeValue={selectedPrintBarcodeValue}
        labelType={printLabelType}
      />

      <div className='grid gap-4 xl:grid-cols-[420px_1fr]'>
        <Card className='rounded-lg border border-border/70 shadow-none'>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 text-sm font-black tracking-tighter italic'>
              <Smartphone className='size-4 text-primary' />
              {copy.mobileEntry}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-3'>
              <div className='rounded-lg border border-dashed border-border bg-muted/20 p-3'>
                <div className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                  {copy.packageCode}
                </div>
                <div className='mt-2 font-mono text-lg font-black tracking-tight break-all'>
                  {activePackageCode || '--'}
                </div>
                <div className='mt-2 flex flex-wrap gap-2'>
                  <Badge variant='outline' className='rounded-full'>
                    {copy.status}: {captureSession?.status || '--'}
                  </Badge>
                  {captureSession?.expiresAt ? (
                    <Badge variant='outline' className='rounded-full'>
                      {formatDateTime(captureSession.expiresAt)}
                    </Badge>
                  ) : null}
                </div>
                {activePackageCode ? (
                  <PackageCodePrintFormatSelector
                    packageCode={activePackageCode}
                    qrCodeValue={captureUrl}
                    selectedType={printLabelType}
                    onSelect={setPrintLabelType}
                    copy={copy}
                  />
                ) : null}
              </div>

              <p className='text-xs leading-5 font-semibold text-muted-foreground'>
                {copy.scanHint}
              </p>
            </div>

            <div className='flex flex-wrap gap-2'>
              <Button
                type='button'
                onClick={() => createSessionMutation.mutate()}
                disabled={createSessionMutation.isPending}
                className='h-10 rounded-full text-xs font-black'
              >
                {createSessionMutation.isPending ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <PackageCheck className='size-4' />
                )}
                {copy.createSession}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => setPrintPackageCode(activePackageCode)}
                disabled={!activePackageCode}
                className='h-10 rounded-full text-xs font-black'
              >
                <Printer className='size-4' />
                {copy.printPackageCode}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => void assembliesQuery.refetch()}
                className='h-10 rounded-full text-xs font-black'
              >
                <RefreshCw className='size-4' />
                {copy.refresh}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-lg border border-border/70 shadow-none'>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 text-sm font-black tracking-tight italic'>
              <CheckCircle2 className='size-4 text-primary' />
              {copy.latestAssemblies}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {assembliesResource.status === 'loading' ? (
              <div className='flex h-40 items-center justify-center text-muted-foreground'>
                <Loader2 className='size-5 animate-spin' />
              </div>
            ) : assembliesResource.status === 'error' ? (
              <div className='flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-rose-200 bg-rose-50/60 px-4 text-center'>
                <div className='text-[10px] font-black uppercase tracking-widest text-rose-700'>
                  {copy.latestAssemblies}
                </div>
                <div className='mt-2 text-[11px] font-bold leading-relaxed text-foreground'>
                  {assembliesResource.error.message}
                </div>
              </div>
            ) : assembliesResource.items.length === 0 ? (
              <div className='flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm font-bold text-muted-foreground'>
                {copy.empty}
              </div>
            ) : (
              assembliesResource.items.map((assembly) => (
                <AssemblyRecord
                  key={assembly.id}
                  assembly={assembly}
                  copy={copy}
                  selectedPrintType={printLabelType}
                  onPrint={() => setPrintPackageCode(assembly.packageCode)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AssemblyRecord({
  assembly,
  copy,
  selectedPrintType,
  onPrint,
}: {
  assembly: PackagingAssembly
  copy: PackagingCopy
  selectedPrintType: PackagingLabelType
  onPrint: () => void
}) {
  return (
    <div className='rounded-lg border border-border bg-background p-3'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div className='min-w-0 space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='font-mono text-sm font-black'>
              {assembly.packageCode}
            </span>
            <Badge variant='secondary' className='rounded-full'>
              {copy.itemCount}: {assembly.itemCount}
            </Badge>
            <Badge variant='outline' className='rounded-full'>
              {assembly.status}
            </Badge>
          </div>
          <div className='text-[11px] font-semibold text-muted-foreground'>
            {formatDateTime(assembly.assembledAt || assembly.createdAt)} /{' '}
            {assembly.assembledBy || '--'}
          </div>
        </div>
        <div className='flex shrink-0 flex-wrap items-center justify-end gap-2'>
          <AuditTimelineTriggerButton
            module={AUDIT_MODULES.packagingAssembly}
            targetId={assembly.id}
            targetName={assembly.packageCode}
            iconOnly
            className='size-8 rounded-full border-dashed px-0'
          />
          <div className='flex items-center justify-center rounded-md border border-dashed border-border bg-white p-1.5'>
            <PackagingQrCanvas
              code={assembly.packageCode}
              type={selectedPrintType}
              className={
                selectedPrintType === 'code128'
                  ? 'h-10 w-24 max-w-full'
                  : 'size-16'
              }
            />
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-8 rounded-full text-[11px] font-black'
            onClick={onPrint}
          >
            <Printer className='size-3.5' />
            {copy.printPackageCode}
          </Button>
        </div>
      </div>

      <div className='mt-3 rounded-md bg-muted/30 p-2'>
        <div className='mb-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
          {copy.productBarcodes}
        </div>
        <div className='flex flex-wrap gap-1.5'>
          {assembly.items.map((item) => (
            <Badge
              key={item.id}
              variant='outline'
              className='rounded-full font-mono text-[10px]'
            >
              {item.productBarcode}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
