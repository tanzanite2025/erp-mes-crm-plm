import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BadgeCheck,
  Binary,
  CircleAlert,
  CircleCheck,
  Keyboard,
  Route,
  ScanLine,
  Usb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { HIDScanInput, type HIDScanResult } from '@/components/hid-scan-input'
import { IndustrialHeader } from '@/components/uds/industrial-header'

type CheckTone = 'ok' | 'warn' | 'idle'

interface ScannerCheck {
  label: string
  value: string
  tone: CheckTone
  description: string
}

interface LinearBarcodeAnalysis {
  candidate: string
  isValid: boolean
  reason: string
  prefix: string
  suffix: string
}

const MONTH_CODES = new Set([
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '0',
  'N',
  'D',
])
const HID_PARAMS = [
  {
    title: '接入模式',
    value: 'USB HID 键盘模式',
    note: '扫码枪像键盘一样输入字符，浏览器不需要额外驱动或串口权限。',
  },
  {
    title: '结束符',
    value: 'Enter',
    note: '建议配置为扫码后自动回车，页面可立即触发扫码完成。',
  },
  {
    title: '前后缀',
    value: '关闭自定义前后缀',
    note: '如果供应商默认带 STX、TAB、空格或自定义字符，需要先关闭或在业务层明确剥离。',
  },
  {
    title: '码制',
    value: 'Code 128 / 一维码',
    note: '当前生产一维码协议按 15 位固定结构校验。',
  },
]

function isValidLinearCandidate(code: string) {
  const normalized = code.toUpperCase()
  if (normalized.length !== 15) return false
  if (!/^\d{2}.\d{2}\d{2}\d[RD]\d{2}\d{4}$/.test(normalized)) return false
  return MONTH_CODES.has(normalized.slice(2, 3))
}

function analyzeLinearBarcode(rawCode: string): LinearBarcodeAnalysis {
  const normalized = rawCode.trim().toUpperCase()

  if (!normalized) {
    return {
      candidate: '',
      isValid: false,
      reason: '等待扫码',
      prefix: '',
      suffix: '',
    }
  }

  if (isValidLinearCandidate(normalized)) {
    return {
      candidate: normalized,
      isValid: true,
      reason: '符合 15 位一维码协议',
      prefix: '',
      suffix: '',
    }
  }

  for (let index = 0; index <= normalized.length - 15; index += 1) {
    const candidate = normalized.slice(index, index + 15)
    if (isValidLinearCandidate(candidate)) {
      return {
        candidate,
        isValid: true,
        reason: '包含可识别的 15 位一维码，但原始输入带前缀或后缀',
        prefix: normalized.slice(0, index),
        suffix: normalized.slice(index + 15),
      }
    }
  }

  return {
    candidate: normalized.length >= 15 ? normalized.slice(0, 15) : normalized,
    isValid: false,
    reason:
      normalized.length === 15
        ? '长度正确，但月份、孔型或数字位不符合协议'
        : '不是 15 位一维码',
    prefix: '',
    suffix: '',
  }
}

function getToneClass(tone: CheckTone) {
  if (tone === 'ok')
    return 'border-emerald-500/25 bg-emerald-500/6 text-emerald-700'
  if (tone === 'warn')
    return 'border-amber-500/25 bg-amber-500/6 text-amber-700'
  return 'border-muted/50 bg-muted/20 text-muted-foreground'
}

function buildChecks(
  scanResult: HIDScanResult | null,
  analysis: LinearBarcodeAnalysis
): ScannerCheck[] {
  if (!scanResult) {
    return [
      {
        label: '回车结束',
        value: '待测试',
        tone: 'idle',
        description: '扫码后如果自动完成，说明结束符可用。',
      },
      {
        label: '前后缀',
        value: '待测试',
        tone: 'idle',
        description: '原始码进入页面后会检查是否夹带额外字符。',
      },
      {
        label: '15 位协议',
        value: '待测试',
        tone: 'idle',
        description: '用于判断是否符合当前一维码规则。',
      },
    ]
  }

  const completionLabel =
    scanResult.completedBy === 'enter'
      ? '已自动回车'
      : scanResult.completedBy === 'tab'
        ? 'Tab 结束'
        : scanResult.completedBy === 'idle'
          ? '短暂停顿完成'
          : '手动完成'

  const hasAffix = Boolean(
    analysis.prefix || analysis.suffix || scanResult.hasWhitespaceWrapper
  )

  return [
    {
      label: '回车结束',
      value: completionLabel,
      tone: scanResult.completedBy === 'enter' ? 'ok' : 'warn',
      description:
        scanResult.completedBy === 'enter'
          ? '扫码枪已带 Enter，后续业务页可直接响应扫码完成。'
          : '建议把扫码枪结束符配置为 Enter，减少人工确认。',
    },
    {
      label: '前后缀',
      value: hasAffix ? '发现额外字符' : '未发现',
      tone: hasAffix ? 'warn' : 'ok',
      description: hasAffix
        ? '原始输入可能带前缀、后缀或首尾空白，建议在扫码枪设置中关闭。'
        : '原始输入干净，后续可直接进入业务解析。',
    },
    {
      label: '15 位协议',
      value: analysis.isValid ? '通过' : '未通过',
      tone: analysis.isValid ? 'ok' : 'warn',
      description: analysis.reason,
    },
  ]
}

export function ScannerDevicesTab() {
  const [scanResult, setScanResult] = useState<HIDScanResult | null>(null)
  const [scanHistory, setScanHistory] = useState<HIDScanResult[]>([])

  const analysis = useMemo(
    () => analyzeLinearBarcode(scanResult?.rawCode ?? ''),
    [scanResult?.rawCode]
  )
  const checks = useMemo(
    () => buildChecks(scanResult, analysis),
    [analysis, scanResult]
  )

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        title='USB扫码配置'
        description='仅面向接入后像键盘一样输入的 USB HID 扫码枪。现场只需要让光标停在输入框内，扫码后由页面判断回车、前后缀和一维码协议。'
        icon={ScanLine}
        statusBadge={
          <Badge className='rounded-full border-none bg-emerald-500/10 px-4 py-1.5 text-[10px] font-black text-emerald-700'>
            当前接入模式：USB HID 键盘模式
          </Badge>
        }
      />

      <section className='rounded-[28px] border border-dashed border-emerald-500/25 bg-emerald-500/5 p-5 md:p-6'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          {HID_PARAMS.map((item) => (
            <div
              key={item.title}
              className='rounded-2xl border border-dashed border-emerald-500/20 bg-background/80 p-4'
            >
              <div className='text-[10px] font-black tracking-widest text-emerald-700/70 uppercase'>
                {item.title}
              </div>
              <div className='mt-2 text-sm font-black text-foreground'>
                {item.value}
              </div>
              <p className='mt-2 text-xs leading-relaxed font-medium text-muted-foreground/75'>
                {item.note}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-12'>
        <Card className='rounded-[28px] border-dashed border-muted/50 bg-muted/5 shadow-inner xl:col-span-7'>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight'>
              <Usb className='size-4 text-primary' />
              USB扫码输入测试
            </CardTitle>
            <CardDescription className='text-xs leading-relaxed text-muted-foreground/75'>
              插入 USB 扫码枪后，点击下方输入框并扫码。支持 Enter
              完成，也支持短暂停顿后自动识别完成。
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-5'>
            <HIDScanInput
              autoFocus
              clearOnComplete
              idleDelayMs={320}
              placeholder='点击这里，然后用 USB 扫码枪扫一维码'
              onScanComplete={(_, result) => {
                setScanResult(result)
                setScanHistory((current) => [result, ...current].slice(0, 4))
              }}
            />

            <div className='rounded-[24px] border border-dashed border-muted/60 bg-background/80 p-4'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='space-y-1'>
                  <div className='text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
                    原始扫码结果
                  </div>
                  <div className='font-mono text-sm font-black tracking-wider break-all text-foreground'>
                    {scanResult?.rawCode || '等待扫码'}
                  </div>
                </div>
                {scanResult ? (
                  <Badge className='rounded-full border-none bg-slate-900 text-white'>
                    {scanResult.charCount} 字符 / {scanResult.durationMs}ms
                  </Badge>
                ) : null}
              </div>

              {scanResult ? (
                <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-3'>
                  <div className='rounded-2xl border border-dashed border-muted/50 bg-muted/10 p-3'>
                    <div className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                      规范化结果
                    </div>
                    <div className='mt-1 font-mono text-xs font-black break-all'>
                      {scanResult.normalizedCode}
                    </div>
                  </div>
                  <div className='rounded-2xl border border-dashed border-muted/50 bg-muted/10 p-3'>
                    <div className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                      协议候选
                    </div>
                    <div className='mt-1 font-mono text-xs font-black break-all'>
                      {analysis.candidate || '-'}
                    </div>
                  </div>
                  <div className='rounded-2xl border border-dashed border-muted/50 bg-muted/10 p-3'>
                    <div className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                      前缀 / 后缀
                    </div>
                    <div className='mt-1 font-mono text-xs font-black break-all'>
                      {analysis.prefix || analysis.suffix
                        ? `${analysis.prefix || '-'} / ${analysis.suffix || '-'}`
                        : '无'}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-[28px] border-dashed border-muted/50 bg-muted/5 shadow-inner xl:col-span-5'>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight'>
              <BadgeCheck className='size-4 text-primary' />
              接入检查
            </CardTitle>
            <CardDescription className='text-xs leading-relaxed text-muted-foreground/75'>
              这里只判断扫码输入链路，不会提交任何仓库、订单或追溯业务数据。
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {checks.map((check) => (
              <div
                key={check.label}
                className={cn(
                  'rounded-2xl border border-dashed p-4',
                  getToneClass(check.tone)
                )}
              >
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <div className='text-[10px] font-black tracking-widest uppercase opacity-65'>
                      {check.label}
                    </div>
                    <div className='mt-1 text-sm font-black'>{check.value}</div>
                  </div>
                  {check.tone === 'ok' ? (
                    <CircleCheck className='size-5 shrink-0' />
                  ) : (
                    <CircleAlert className='size-5 shrink-0' />
                  )}
                </div>
                <p className='mt-2 text-xs leading-relaxed font-medium opacity-75'>
                  {check.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <section className='grid grid-cols-1 gap-6 xl:grid-cols-12'>
        <div className='rounded-[28px] border border-dashed border-muted/50 bg-background/70 p-5 md:p-6 xl:col-span-7'>
          <div className='flex items-center gap-2 text-base font-black'>
            <Keyboard className='size-4 text-primary' />
            统一 HID 扫码输入能力
          </div>
          <p className='mt-2 text-xs leading-relaxed font-medium text-muted-foreground/75'>
            已抽出通用输入组件：业务页面后续只需要传入
            onScanComplete(code)，不用再关心扫码枪是 Enter
            结束还是短暂停顿结束。
          </p>
          <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-3'>
            {[
              '输入框聚焦后接收扫码枪键盘输入',
              'Enter / Tab / 短暂停顿都可触发完成',
              '返回原始码、规范化码、耗时和结束方式',
            ].map((item) => (
              <div
                key={item}
                className='rounded-2xl border border-dashed border-muted/50 bg-muted/10 p-3 text-xs font-bold text-muted-foreground/80'
              >
                <Binary className='mb-2 size-3.5 text-primary' />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-[28px] border border-dashed border-primary/20 bg-primary/5 p-5 md:p-6 xl:col-span-5'>
          <div className='flex items-center gap-2 text-base font-black text-primary'>
            <Route className='size-4' />
            前往业务扫码页
          </div>
          <p className='mt-2 text-xs leading-relaxed font-medium text-muted-foreground/75'>
            这些入口只负责把页面切到扫码输入状态，具体扫到码后如何处理，后续按业务页面逐个接入。
          </p>
          <div className='mt-4 flex flex-wrap gap-2'>
            <Button
              asChild
              className='rounded-full text-[10px] font-black tracking-widest uppercase'
            >
              <Link to='/warehouse/inbound' search={{ mode: 'scan' }}>
                去入库扫码
                <ArrowRight className='ml-2 size-3.5' />
              </Link>
            </Button>
            <Button
              asChild
              variant='outline'
              className='rounded-full text-[10px] font-black tracking-widest uppercase'
            >
              <Link to='/warehouse/shipment' search={{ mode: 'scan' }}>
                去出库扫码
                <ArrowRight className='ml-2 size-3.5' />
              </Link>
            </Button>
            <Button
              asChild
              variant='outline'
              className='rounded-full text-[10px] font-black tracking-widest uppercase'
            >
              <Link to='/wheel-trace' search={{ scan: '1' }}>
                去追溯扫码
                <ArrowRight className='ml-2 size-3.5' />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {scanHistory.length ? (
        <section className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 p-5 md:p-6'>
          <div className='mb-4 text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            最近测试记录
          </div>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'>
            {scanHistory.map((item) => (
              <div
                key={`${item.completedAt}-${item.rawCode}`}
                className='rounded-2xl border border-dashed border-muted/50 bg-background/80 p-4'
              >
                <div className='font-mono text-xs font-black break-all'>
                  {item.normalizedCode}
                </div>
                <div className='mt-2 text-[10px] font-bold text-muted-foreground/60'>
                  {item.completedBy} / {item.durationMs}ms
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
