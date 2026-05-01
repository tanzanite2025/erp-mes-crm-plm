import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Boxes,
  CheckCircle2,
  Clipboard,
  LinkIcon,
  Loader2,
  PackageCheck,
  QrCode,
  RefreshCw,
  Smartphone,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { renderBwipBarcode } from '@/lib/bwip-renderer'
import { warehouseQueryKeys } from '../query-keys'
import {
  PackagingAssemblyService,
  type PackagingAssembly,
  type PackagingAssemblyCaptureSession,
} from '../services/packaging-assembly-service'

type PackagingCopy = {
  title: string
  description: string
  createSession: string
  refresh: string
  copyLink: string
  mobileEntry: string
  packageCode: string
  scanHint: string
  status: string
  latestAssemblies: string
  itemCount: string
  productBarcodes: string
  empty: string
  sessionCreated: string
  copied: string
  copyFailed: string
  submitted: string
}

const copyByLocale: Record<'zh-CN' | 'en-US', PackagingCopy> = {
  'zh-CN': {
    title: '装箱组装',
    description: '创建箱码二维码，用手机扫码进入装箱采集页，再扫描系统产品一维码完成箱码与产品码绑定。',
    createSession: '新建装箱码',
    refresh: '刷新',
    copyLink: '复制手机链接',
    mobileEntry: '手机扫码入口',
    packageCode: '箱码 / 组装码',
    scanHint: '用手机扫描左侧二维码后，逐个扫描已在系统绑定的产品一维码。提交后这里会自动回显装箱结果。',
    status: '状态',
    latestAssemblies: '装箱组装记录',
    itemCount: '件数',
    productBarcodes: '产品一维码',
    empty: '暂无装箱记录，先新建一个装箱码。',
    sessionCreated: '装箱码已创建',
    copied: '手机扫码链接已复制',
    copyFailed: '复制失败',
    submitted: '装箱组装已完成',
  },
  'en-US': {
    title: 'Packaging Assembly',
    description: 'Create a package QR, scan it with a phone, then scan bound product barcodes into the package.',
    createSession: 'New Package Code',
    refresh: 'Refresh',
    copyLink: 'Copy Mobile Link',
    mobileEntry: 'Mobile Scan Entry',
    packageCode: 'Package / Assembly Code',
    scanHint: 'Scan the QR with a phone, then scan product barcodes already bound in the system. Results appear here after submit.',
    status: 'Status',
    latestAssemblies: 'Packaging Records',
    itemCount: 'Items',
    productBarcodes: 'Product Barcodes',
    empty: 'No packaging records yet. Create a package code first.',
    sessionCreated: 'Package code created',
    copied: 'Mobile scan link copied',
    copyFailed: 'Copy failed',
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

export default function PackagingAssembly() {
  const { locale } = useLanguage()
  const copy = copyByLocale[locale]
  const queryClient = useQueryClient()
  const [captureSession, setCaptureSession] = useState<PackagingAssemblyCaptureSession | null>(null)

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
    const intervalId = window.setInterval(() => {
      void PackagingAssemblyService.getCaptureSession(captureSession.sessionId)
        .then((nextSession) => {
          setCaptureSession((current) => ({
            ...nextSession,
            uploadToken: current?.uploadToken,
          }))
          if (nextSession.status === 'Submitted') {
            toast.success(copy.submitted, { description: nextSession.packageCode })
            void queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.packagingAssemblies() })
          }
        })
        .catch(() => undefined)
    }, 2500)
    return () => window.clearInterval(intervalId)
  }, [captureSession, copy.submitted, queryClient])

  const copyCaptureLink = async () => {
    if (!captureUrl) return
    try {
      await navigator.clipboard.writeText(captureUrl)
      toast.success(copy.copied)
    } catch {
      toast.error(copy.copyFailed)
    }
  }

  const assemblies = assembliesQuery.data?.items ?? []
  const activePackageCode = captureSession?.packageCode || assemblies[0]?.packageCode || ''

  return (
    <div className='flex flex-col gap-5 animate-in fade-in duration-500'>
      <IndustrialHeader title={copy.title} description={copy.description} icon={Boxes} />

      <div className='grid gap-4 xl:grid-cols-[420px_1fr]'>
        <Card className='rounded-lg border border-border/70 shadow-none'>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight'>
              <Smartphone className='size-4 text-primary' />
              {copy.mobileEntry}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-3 sm:grid-cols-[168px_1fr] xl:grid-cols-1'>
              <div className='flex items-center justify-center rounded-lg border border-dashed border-primary/30 bg-white p-3'>
                {captureUrl ? (
                  <PackagingQrCanvas code={captureUrl} />
                ) : (
                  <div className='flex size-40 items-center justify-center rounded-lg bg-muted text-muted-foreground'>
                    <QrCode className='size-12' />
                  </div>
                )}
              </div>

              <div className='space-y-3'>
                <div className='rounded-lg border border-dashed border-border bg-muted/20 p-3'>
                  <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                    {copy.packageCode}
                  </div>
                  <div className='mt-2 break-all font-mono text-lg font-black tracking-tight'>
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
                </div>

                <p className='text-xs font-semibold leading-5 text-muted-foreground'>
                  {copy.scanHint}
                </p>
              </div>
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
                onClick={() => void copyCaptureLink()}
                disabled={!captureUrl}
                className='h-10 rounded-full text-xs font-black'
              >
                <Clipboard className='size-4' />
                {copy.copyLink}
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

            {captureUrl ? (
              <div className='flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-[11px] font-mono'>
                <LinkIcon className='size-3.5 shrink-0 text-muted-foreground' />
                <span className='truncate'>{captureUrl}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className='rounded-lg border border-border/70 shadow-none'>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight'>
              <CheckCircle2 className='size-4 text-primary' />
              {copy.latestAssemblies}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {assembliesQuery.isLoading ? (
              <div className='flex h-40 items-center justify-center text-muted-foreground'>
                <Loader2 className='size-5 animate-spin' />
              </div>
            ) : assemblies.length === 0 ? (
              <div className='flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm font-bold text-muted-foreground'>
                {copy.empty}
              </div>
            ) : (
              assemblies.map((assembly) => (
                <AssemblyRecord key={assembly.id} assembly={assembly} copy={copy} />
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
}: {
  assembly: PackagingAssembly
  copy: PackagingCopy
}) {
  return (
    <div className='rounded-lg border border-border bg-background p-3'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div className='min-w-0 space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='font-mono text-sm font-black'>{assembly.packageCode}</span>
            <Badge variant='secondary' className='rounded-full'>
              {copy.itemCount}: {assembly.itemCount}
            </Badge>
            <Badge variant='outline' className='rounded-full'>
              {assembly.status}
            </Badge>
          </div>
          <div className='text-[11px] font-semibold text-muted-foreground'>
            {formatDateTime(assembly.assembledAt || assembly.createdAt)} / {assembly.assembledBy || '--'}
          </div>
        </div>
        <div className='flex shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-white p-1.5'>
          <PackagingQrCanvas code={assembly.packageCode} className='size-16' />
        </div>
      </div>

      <div className='mt-3 rounded-md bg-muted/30 p-2'>
        <div className='mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
          {copy.productBarcodes}
        </div>
        <div className='flex flex-wrap gap-1.5'>
          {assembly.items.map((item) => (
            <Badge key={item.id} variant='outline' className='rounded-full font-mono text-[10px]'>
              {item.productBarcode}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
