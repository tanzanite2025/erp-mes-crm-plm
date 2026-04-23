import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ImageUp,
  LockKeyhole,
  MonitorSmartphone,
  Smartphone,
  Wifi,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CameraScanInput } from '@/components/camera-scan-input'
import { IndustrialHeader } from '@/components/uds/industrial-header'

const MOBILE_CAPTURE_POINTS = [
  {
    title: '摄像头扫码',
    icon: Camera,
    note: '适合手机浏览器现场扫码，依赖浏览器的摄像头权限和 BarcodeDetector 能力。',
  },
  {
    title: '拍照识别',
    icon: ImageUp,
    note: '当现场不是 HTTPS 或摄像头实时识别不可用时，可以使用拍照识别作为兜底。',
  },
  {
    title: 'HTTPS / localhost',
    icon: LockKeyhole,
    note: '手机浏览器调用摄像头通常需要 HTTPS；本机 localhost 只适合开发调试。',
  },
  {
    title: '网络与权限',
    icon: Wifi,
    note: '移动采集应先确认 Wi-Fi、浏览器权限、页面登录态和添加到桌面的访问方式。',
  },
]

function getBarcodeSummary(code: string) {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return '等待手机扫码或拍照识别'
  if (normalized.length === 15)
    return '长度符合当前 15 位一维码协议，可进入后续业务解析'
  return '已采集到码值，但不是 15 位生产一维码，请按业务场景继续判断'
}

export function MobileCaptureTab() {
  const [capturedCode, setCapturedCode] = useState('')
  const summary = useMemo(() => getBarcodeSummary(capturedCode), [capturedCode])

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        title='移动采集'
        description='面向普通手机浏览器的扫码与拍照识别入口。这里和 USB HID 扫码枪分开维护，避免摄像头、权限和键盘输入逻辑互相干扰。'
        icon={MonitorSmartphone}
        statusBadge={<Badge className='rounded-full border-none bg-blue-500/10 px-4 py-1.5 text-[10px] font-black text-blue-700'>
          当前接入方式：手机摄像头 / 拍照识别
        </Badge>}
      />

      <section className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        {MOBILE_CAPTURE_POINTS.map((point) => {
          const PointIcon = point.icon
          return (
            <div
              key={point.title}
              className='rounded-[24px] border border-dashed border-blue-500/20 bg-blue-500/5 p-4'
            >
              <div className='flex size-10 items-center justify-center rounded-2xl bg-background/80 text-blue-700 shadow-sm'>
                <PointIcon className='size-4' />
              </div>
              <div className='mt-3 text-sm font-black text-foreground'>
                {point.title}
              </div>
              <p className='mt-2 text-xs leading-relaxed font-medium text-muted-foreground/75'>
                {point.note}
              </p>
            </div>
          )
        })}
      </section>

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-12'>
        <Card className='rounded-[28px] border-dashed border-muted/50 bg-muted/5 shadow-inner xl:col-span-7'>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight'>
              <Smartphone className='size-4 text-primary' />
              手机扫码测试
            </CardTitle>
            <CardDescription className='text-xs leading-relaxed text-muted-foreground/75'>
              用手机打开本页后，可以测试摄像头扫码或拍照识别。这里仅采集码值，不提交任何业务数据。
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-5'>
            <CameraScanInput
              value={capturedCode}
              onValueChange={setCapturedCode}
              onScanComplete={setCapturedCode}
              placeholder='手机扫码或拍照识别后的码值会显示在这里'
              inputClassName='h-12 rounded-2xl border-dashed bg-background font-mono text-sm font-black tracking-widest'
            />

            <div className='rounded-[24px] border border-dashed border-muted/60 bg-background/80 p-4'>
              <div className='text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
                采集结果
              </div>
              <div className='mt-2 font-mono text-sm font-black tracking-wider break-all text-foreground'>
                {capturedCode || '等待采集'}
              </div>
              <div className='mt-4 rounded-2xl border border-dashed border-blue-500/20 bg-blue-500/5 p-3 text-xs leading-relaxed font-bold text-blue-700'>
                {summary}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-[28px] border-dashed border-muted/50 bg-muted/5 shadow-inner xl:col-span-5'>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight'>
              <CheckCircle2 className='size-4 text-primary' />
              接入边界
            </CardTitle>
            <CardDescription className='text-xs leading-relaxed text-muted-foreground/75'>
              移动采集后续可以接追溯、盘点、入库等轻量场景；不和 USB
              扫码枪的键盘输入逻辑混用。
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {[
              '手机采集组件只负责摄像头、拍照和权限提示。',
              'USB HID 扫码枪继续在“扫码设备”TAB 里测试和维护。',
              '业务页面后续统一接收 code，再决定查询、开单或提交。',
            ].map((item) => (
              <div
                key={item}
                className='rounded-2xl border border-dashed border-muted/50 bg-background/80 p-4 text-xs leading-relaxed font-bold text-muted-foreground/80'
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <section className='rounded-[28px] border border-dashed border-primary/20 bg-primary/5 p-5 md:p-6'>
        <div className='text-base font-black text-primary'>移动业务入口</div>
        <p className='mt-2 text-xs leading-relaxed font-medium text-muted-foreground/75'>
          这些按钮先作为移动采集相关入口，具体采集后绑定哪个业务动作，后续再逐个页面确认。
        </p>
        <div className='mt-4 flex flex-wrap gap-2'>
          <Button
            asChild
            className='rounded-full text-[10px] font-black tracking-widest uppercase'
          >
            <Link to='/wheel-trace' search={{ scan: String(Date.now()) }}>
              去追溯扫码
              <ArrowRight className='ml-2 size-3.5' />
            </Link>
          </Button>
          <Button
            asChild
            variant='outline'
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
        </div>
      </section>
    </div>
  )
}
