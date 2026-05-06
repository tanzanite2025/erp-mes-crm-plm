import { useCallback, useEffect, useState } from 'react'
import { History, SearchCheck, Smartphone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { TrackingNumberInput } from '@/components/tracking-number-input'
import { useHierarchyLevelLabels } from '@/features/production-shared/tabs/hierarchy-config/hooks/use-hierarchy-level-labels'
import { createWheelTraceApiGateway } from '../adapters/wheel-trace/api-wheel-trace-gateway'
import { usePageInstall } from '../hooks'
import type { WheelTracePayload } from '../models/wheel-trace'
import { runWheelTraceLookup } from '../use-cases/wheel-trace-lookup'

const DEFAULT_SAMPLE_CODE = '25601014R140123'
const wheelTraceGateway = createWheelTraceApiGateway()

interface WheelTraceShellPageProps {
  autoPromptInstall?: boolean
  autoOpenScanner?: boolean
  scannerSignal?: number
}

export function WheelTraceShellPage({
  autoPromptInstall = false,
  autoOpenScanner = false,
  scannerSignal = 0,
}: WheelTraceShellPageProps) {
  const { level1Name, level3Name } = useHierarchyLevelLabels()
  const [rawCode, setRawCode] = useState(() =>
    autoOpenScanner ? '' : DEFAULT_SAMPLE_CODE
  )
  const [result, setResult] = useState<WheelTracePayload | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const install = usePageInstall({
    manifestHref: '/manifests/wheel-trace.webmanifest',
    autoPrompt: autoPromptInstall,
  })

  const executeLookup = useCallback(async (lookupCode: string) => {
    const value = lookupCode.trim().toUpperCase()
    if (!value) return

    setIsLoading(true)
    setErrorMessage('')

    try {
      const payload = await runWheelTraceLookup(
        {
          rawCode: value,
          source: 'camera',
          surface: 'standalone',
          context: {
            products: [
              {
                id: 'product-wheel-01',
                sku: 'WH-01',
                modelCode: '01',
                name: '700C 公路车圈',
              },
            ],
            appearanceMapping: {
              '1': { label: 'UD' },
              '2': { label: '3K' },
            },
          },
        },
        wheelTraceGateway
      )

      setRawCode(value)
      setResult(payload)
    } catch (error) {
      setResult(null)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '车圈追溯查询失败，请稍后重试。'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleLookup = useCallback(async (nextRawCode?: string) => {
    await executeLookup(nextRawCode ?? rawCode)
  }, [executeLookup, rawCode])

  useEffect(() => {
    if (autoOpenScanner) {
      return
    }

    void executeLookup(DEFAULT_SAMPLE_CODE)
  }, [autoOpenScanner, executeLookup])

  const warningItems = [
    ...(errorMessage ? [errorMessage] : []),
    ...(result?.warnings?.length
      ? result.warnings
      : ['当前为车圈追溯独立页，等待首次查询。']),
    install.canInstall && !install.isPromptAvailable
      ? install.fallbackHint
      : '',
  ].filter(Boolean)

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        title='车圈追溯'
        description='独立追溯页已经切到真实查询接口，当前返回条码解析、产品匹配和生产拓扑锚点，后续可继续接入真实过站记录。'
        icon={SearchCheck}
        statusBadge={<div className='flex flex-wrap gap-2'>
          <Badge className='border-none bg-emerald-500/10 text-emerald-700'>
            SHELL_READY
          </Badge>
          <Badge className='border-none bg-blue-500/10 text-blue-700'>
            REAL_API
          </Badge>
        </div>}
      />

      <Card className='rounded-[28px] border-dashed border-muted/50 bg-muted/5 shadow-inner'>
        <CardHeader className='pb-4'>
          <CardTitle className='text-sm font-black tracking-tight uppercase md:text-base'>
            Trace Lookup
          </CardTitle>
          <CardDescription className='text-[10px] font-medium text-muted-foreground/70 md:text-[11px]'>
            使用网页扫码或手工输入触发追溯查询。页面会直接请求后端真实接口，而不是本地
            mock 数据。
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='rounded-[24px] border border-dashed border-primary/20 bg-background/80 p-4'>
            <TrackingNumberInput
              value={rawCode}
              onValueChange={(value) => setRawCode(value.toUpperCase())}
              onScanComplete={(value) => void handleLookup(value)}
              autoOpenScanner={autoOpenScanner}
              openScannerSignal={scannerSignal}
              placeholder='扫描或输入一维码，例如 25601014R140123'
              inputClassName='h-14 rounded-2xl border-dashed bg-white text-lg font-black tracking-widest text-slate-900'
            />
          </div>

          <div className='flex flex-wrap gap-3'>
            <Button
              className='h-11 rounded-full px-6 text-[11px] font-black tracking-widest uppercase'
              onClick={() => void handleLookup()}
              disabled={isLoading}
            >
              <SearchCheck className='mr-2 size-4' />
              {isLoading ? 'LOADING' : 'RUN_LOOKUP'}
            </Button>

            <Button
              variant='outline'
              className='h-11 rounded-full px-6 text-[11px] font-black tracking-widest uppercase'
              disabled={!install.canInstall && !install.isInstalled}
              onClick={() => void install.promptInstall()}
            >
              <Smartphone className='mr-2 size-4' />
              {install.installLabel}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
        <Card className='rounded-[28px] border-dashed border-muted/50 bg-muted/5 shadow-inner xl:col-span-2'>
          <CardHeader className='pb-4'>
            <CardTitle className='text-sm font-black tracking-tight uppercase md:text-base'>
              Current Hierarchy Snapshot
            </CardTitle>
            <CardDescription className='text-[10px] font-medium text-muted-foreground/70 md:text-[11px]'>
              当前{level1Name}、{level3Name}与班组快照已经来自真实接口。没有真实过站记录时，会返回配置推断的锚点并附带提示。
            </CardDescription>
          </CardHeader>
          <CardContent className='grid grid-cols-1 gap-4 text-[11px] md:grid-cols-2'>
            <div className='rounded-2xl border border-dashed border-muted/50 bg-background/70 p-4'>
              <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                Summary
              </div>
              <div className='mt-2 font-bold text-foreground'>
                {result?.summary || '等待追溯查询'}
              </div>
            </div>

            <div className='rounded-2xl border border-dashed border-muted/50 bg-background/70 p-4'>
              <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {level1Name} / {level3Name}
              </div>
              <div className='mt-2 font-bold text-foreground'>
                {result?.currentStage.segmentName || `暂无${level1Name}锚点`}
              </div>
              <div className='mt-1 text-muted-foreground/70'>
                {result?.currentStage.processName || `暂无${level3Name}`}
              </div>
            </div>

            <div className='rounded-2xl border border-dashed border-muted/50 bg-background/70 p-4'>
              <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                Product
              </div>
              <div className='mt-2 font-bold text-foreground'>
                {result?.identity.productName ||
                  result?.identity.modelCode ||
                  '待匹配产品'}
              </div>
              <div className='mt-1 text-muted-foreground/70'>
                {result?.identity.appearanceLabel ||
                  result?.identity.appearanceCode ||
                  '待匹配外观'}
              </div>
            </div>

            <div className='rounded-2xl border border-dashed border-muted/50 bg-background/70 p-4'>
              <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                Barcode
              </div>
              <div className='mt-2 font-mono text-xs text-foreground'>
                {result?.barcode.rawCode || rawCode || '-'}
              </div>
              <div className='mt-1 text-muted-foreground/70'>
                {result?.barcode.shortTag || '未生成 shortTag'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-[28px] border-dashed border-muted/50 bg-muted/5 shadow-inner'>
          <CardHeader className='pb-4'>
            <CardTitle className='text-sm font-black tracking-tight uppercase md:text-base'>
              Warnings
            </CardTitle>
            <CardDescription className='text-[10px] font-medium text-muted-foreground/70 md:text-[11px]'>
              这里会显示接口返回的限制说明，例如只返回配置锚点、产品未匹配、权限或网络异常等。
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-2'>
            {warningItems.map((warning) => (
              <div
                key={warning}
                className='rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-800'
              >
                {warning}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className='rounded-[28px] border-dashed border-muted/50 bg-muted/5 shadow-inner'>
        <CardHeader className='pb-4'>
          <CardTitle className='flex items-center gap-2 text-sm font-black tracking-tight uppercase md:text-base'>
            <History className='size-4 text-primary' />
            Trace Timeline
          </CardTitle>
          <CardDescription className='text-[10px] font-medium text-muted-foreground/70 md:text-[11px]'>
            时间线现在展示真实接口返回的节点，后续接入过站、质检、入库等数据源时可以继续沿用这块结构。
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {result?.timeline?.length ? (
            result.timeline.map((item) => (
              <div
                key={item.id}
                className='rounded-2xl border border-dashed border-muted/50 bg-background/80 p-4'
              >
                <div className='flex flex-col gap-1 md:flex-row md:items-center md:justify-between'>
                  <div className='font-black text-foreground'>{item.title}</div>
                  <div className='font-mono text-[10px] text-muted-foreground/70'>
                    {item.time}
                  </div>
                </div>
                <div className='mt-2 text-[11px] leading-relaxed text-muted-foreground/85'>
                  {item.description}
                </div>
                <div className='mt-2 text-[10px] font-bold tracking-widest text-primary/70 uppercase'>
                  {[item.segmentName, item.processName, item.operatorName]
                    .filter(Boolean)
                    .join(' / ')}
                </div>
              </div>
            ))
          ) : (
            <div className='rounded-2xl border border-dashed border-muted/50 bg-background/80 p-4 text-[11px] text-muted-foreground/80'>
              暂无轨迹节点，等待查询结果。
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
