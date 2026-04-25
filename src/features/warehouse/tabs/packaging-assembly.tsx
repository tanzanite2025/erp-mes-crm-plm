import { useMemo, useState } from 'react'
import {
  Boxes,
  FileCode2,
  LayoutTemplate,
  Printer,
  Settings2,
  Workflow,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'

type CodeType = 'QR' | 'CODE128'
type SerialRule = 'DATE_SEQ' | 'ORDER_BOX' | 'RANDOM_8'

interface PackagingCenterCopy {
  title: string
  subtitle: string
  semanticTip: string
  sectionTemplate: string
  sectionTemplateHint: string
  sectionLayout: string
  sectionLayoutHint: string
  sectionMapping: string
  sectionMappingHint: string
  sectionPreview: string
  sectionPreviewHint: string
  templateLabel: string
  paperWidth: string
  paperHeight: string
  dpi: string
  copies: string
  margin: string
  codeType: string
  prefix: string
  serialRule: string
  payloadFields: string
  fieldOrderNo: string
  fieldCustomer: string
  fieldBoxNo: string
  fieldItemCount: string
  fieldPackedAt: string
  livePayload: string
  liveMatrix: string
  saveDraft: string
  testPrint: string
  publish: string
  saveSuccess: string
  testSuccess: string
  publishSuccess: string
  executionSpec: string
  executionSpecHint: string
  execSales: string
  execWarehouseInbound: string
  serialDateSeq: string
  serialOrderBox: string
  serialRandom: string
}

interface TemplatePreset {
  id: string
  name: string
  widthMm: number
  heightMm: number
  dpi: number
  marginMm: number
}

const templatePresets: TemplatePreset[] = [
  { id: 'carton-100x150', name: '100 x 150 mm Carton Label', widthMm: 100, heightMm: 150, dpi: 300, marginMm: 2 },
  { id: 'carton-80x50', name: '80 x 50 mm Box Sticker', widthMm: 80, heightMm: 50, dpi: 300, marginMm: 1.5 },
  { id: 'line-60x40', name: '60 x 40 mm Line Quick Label', widthMm: 60, heightMm: 40, dpi: 203, marginMm: 1.2 },
]

const copyByLocale: Record<'zh-CN' | 'en-US', PackagingCenterCopy> = {
  'zh-CN': {
    title: '装箱组装功能中心',
    subtitle: '模板管理、尺寸定义、装箱码映射与打印策略统一配置',
    semanticTip:
      '执行扫码不在此页进行。本中心负责“定义规则”；实际发货扫码在销售订单发货弹窗内调用。',
    sectionTemplate: '模板库',
    sectionTemplateHint: '选择装箱单模板，自动带出纸张尺寸与打印分辨率。',
    sectionLayout: '版式与打印参数',
    sectionLayoutHint: '设置标签尺寸、边距、DPI 与默认打印份数。',
    sectionMapping: '装箱码映射规则',
    sectionMappingHint: '定义箱码编码方式、前缀、序列规则与载荷字段。',
    sectionPreview: '预览与发布',
    sectionPreviewHint: '实时查看装箱码载荷与二维码矩阵示意，然后保存或发布。',
    templateLabel: '模板',
    paperWidth: '宽(mm)',
    paperHeight: '高(mm)',
    dpi: 'DPI',
    copies: '默认份数',
    margin: '边距(mm)',
    codeType: '码制',
    prefix: '编码前缀',
    serialRule: '序列规则',
    payloadFields: '载荷字段',
    fieldOrderNo: '订单号',
    fieldCustomer: '客户',
    fieldBoxNo: '箱序号',
    fieldItemCount: '箱内件数',
    fieldPackedAt: '装箱时间',
    livePayload: '实时载荷',
    liveMatrix: '二维码矩阵示意',
    saveDraft: '保存草稿',
    testPrint: '打印测试',
    publish: '发布模板',
    saveSuccess: '装箱模板草稿已保存',
    testSuccess: '测试打印任务已下发',
    publishSuccess: '装箱模板已发布',
    executionSpec: '执行入口约定',
    executionSpecHint: '发货扫码入口应使用弹窗调用本中心规则，避免流程串线。',
    execSales: '销售订单卡片 -> 扫码发货弹窗（产品码/箱码）',
    execWarehouseInbound: '仓库入库 -> 扫箱码弹窗（自动展开箱内产品）',
    serialDateSeq: '日期 + 4位流水',
    serialOrderBox: '订单号 + 箱序号',
    serialRandom: '随机8位',
  },
  'en-US': {
    title: 'Packaging Assembly Function Center',
    subtitle: 'Manage templates, sizing, package-code mapping, and printing strategy',
    semanticTip:
      'Execution scanning is not done on this page. This center defines rules; scan-to-ship is called from sales shipment modal.',
    sectionTemplate: 'Template Library',
    sectionTemplateHint: 'Pick a package label template and inherit size plus print resolution.',
    sectionLayout: 'Layout & Print Parameters',
    sectionLayoutHint: 'Configure label dimensions, margins, DPI, and default copy count.',
    sectionMapping: 'Package Code Mapping',
    sectionMappingHint: 'Define code type, prefix, serial rule, and payload fields.',
    sectionPreview: 'Preview & Publish',
    sectionPreviewHint: 'Review live payload and QR matrix mock before saving or publishing.',
    templateLabel: 'Template',
    paperWidth: 'Width (mm)',
    paperHeight: 'Height (mm)',
    dpi: 'DPI',
    copies: 'Default Copies',
    margin: 'Margin (mm)',
    codeType: 'Code Type',
    prefix: 'Prefix',
    serialRule: 'Serial Rule',
    payloadFields: 'Payload Fields',
    fieldOrderNo: 'Order No.',
    fieldCustomer: 'Customer',
    fieldBoxNo: 'Box No.',
    fieldItemCount: 'Items in Box',
    fieldPackedAt: 'Packed At',
    livePayload: 'Live Payload',
    liveMatrix: 'QR Matrix Mock',
    saveDraft: 'Save Draft',
    testPrint: 'Test Print',
    publish: 'Publish Template',
    saveSuccess: 'Packaging template draft saved',
    testSuccess: 'Test print job submitted',
    publishSuccess: 'Packaging template published',
    executionSpec: 'Execution Entry Contract',
    executionSpecHint: 'Scan-to-ship should consume these rules from modal workflows to avoid process drift.',
    execSales: 'Sales order card -> Ship-by-scan modal (product/package code)',
    execWarehouseInbound: 'Warehouse inbound -> Scan-package modal (expand inner product codes)',
    serialDateSeq: 'Date + 4-digit sequence',
    serialOrderBox: 'Order No. + Box No.',
    serialRandom: 'Random 8-digit',
  },
}

function createMatrixAscii(seed: string) {
  const size = 21
  let state = 0
  for (let i = 0; i < seed.length; i += 1) {
    state = (state * 131 + seed.charCodeAt(i)) % 2147483647
  }

  const rows: string[] = []
  for (let y = 0; y < size; y += 1) {
    let row = ''
    for (let x = 0; x < size; x += 1) {
      state = (state * 1103515245 + 12345 + x + y) & 0x7fffffff
      row += state % 3 === 0 ? '██' : '  '
    }
    rows.push(row)
  }
  return rows.join('\n')
}

function formatSerialExample(rule: SerialRule, orderNo: string, boxNo: string) {
  if (rule === 'DATE_SEQ') return '20260425-0008'
  if (rule === 'ORDER_BOX') return `${orderNo}-${boxNo}`
  return 'A8F39K2P'
}

export default function PackagingAssembly() {
  const { locale } = useLanguage()
  const copy = copyByLocale[locale]

  const [templateId, setTemplateId] = useState(templatePresets[0].id)
  const [widthMm, setWidthMm] = useState(templatePresets[0].widthMm)
  const [heightMm, setHeightMm] = useState(templatePresets[0].heightMm)
  const [dpi, setDpi] = useState(templatePresets[0].dpi)
  const [copies, setCopies] = useState(1)
  const [marginMm, setMarginMm] = useState(templatePresets[0].marginMm)
  const [codeType, setCodeType] = useState<CodeType>('QR')
  const [prefix, setPrefix] = useState('PKG')
  const [serialRule, setSerialRule] = useState<SerialRule>('DATE_SEQ')
  const [includeOrderNo, setIncludeOrderNo] = useState(true)
  const [includeCustomer, setIncludeCustomer] = useState(false)
  const [includeBoxNo, setIncludeBoxNo] = useState(true)
  const [includeItemCount, setIncludeItemCount] = useState(true)
  const [includePackedAt, setIncludePackedAt] = useState(false)

  const selectedTemplate = useMemo(
    () => templatePresets.find((item) => item.id === templateId) ?? templatePresets[0],
    [templateId]
  )

  const payloadExample = useMemo(() => {
    const orderNo = 'SO-2026-0425'
    const boxNo = 'BOX-03'
    const serial = formatSerialExample(serialRule, orderNo, boxNo)
    const parts: string[] = [`${prefix}-${serial}`]
    if (includeOrderNo) parts.push(`order=${orderNo}`)
    if (includeCustomer) parts.push('customer=ACME')
    if (includeBoxNo) parts.push(`box=${boxNo}`)
    if (includeItemCount) parts.push('qty=24')
    if (includePackedAt) parts.push('packedAt=2026-04-25T10:30:00Z')
    parts.push(`codeType=${codeType}`)
    return parts.join('|')
  }, [
    codeType,
    includeBoxNo,
    includeCustomer,
    includeItemCount,
    includeOrderNo,
    includePackedAt,
    prefix,
    serialRule,
  ])

  const matrixPreview = useMemo(() => createMatrixAscii(payloadExample), [payloadExample])

  const handleTemplateChange = (nextId: string) => {
    const next = templatePresets.find((item) => item.id === nextId)
    if (!next) return
    setTemplateId(next.id)
    setWidthMm(next.widthMm)
    setHeightMm(next.heightMm)
    setDpi(next.dpi)
    setMarginMm(next.marginMm)
  }

  return (
    <div className='flex flex-col gap-6 animate-in fade-in duration-500'>
      <IndustrialHeader title={copy.title} description={copy.subtitle} icon={Boxes} />

      <div className='rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-[11px] font-bold text-primary'>
        {copy.semanticTip}
      </div>

      <div className='grid gap-6 xl:grid-cols-[1.2fr_1fr]'>
        <div className='space-y-6'>
          <Card className='rounded-[24px] border border-dashed border-muted/50 shadow-none'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight'>
                <LayoutTemplate className='size-4 text-primary' />
                {copy.sectionTemplate}
              </CardTitle>
              <CardDescription className='text-[11px]'>{copy.sectionTemplateHint}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-3 sm:grid-cols-3'>
                {templatePresets.map((preset) => {
                  const selected = preset.id === templateId
                  return (
                    <button
                      key={preset.id}
                      type='button'
                      onClick={() => handleTemplateChange(preset.id)}
                      className={`rounded-2xl border border-dashed px-3 py-3 text-left transition-all ${
                        selected
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-muted bg-muted/5 hover:border-primary/30'
                      }`}
                    >
                      <div className='text-[10px] font-black uppercase tracking-widest'>{preset.name}</div>
                      <div className='mt-1 text-[10px] text-muted-foreground'>
                        {preset.widthMm} x {preset.heightMm} mm
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className='rounded-[24px] border border-dashed border-muted/50 shadow-none'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight'>
                <Printer className='size-4 text-primary' />
                {copy.sectionLayout}
              </CardTitle>
              <CardDescription className='text-[11px]'>{copy.sectionLayoutHint}</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-4 sm:grid-cols-5'>
              <div className='space-y-1.5 sm:col-span-2'>
                <Label className='text-[10px] font-black uppercase tracking-widest'>{copy.templateLabel}</Label>
                <Select value={templateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger className='h-10 rounded-xl border-dashed'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templatePresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label className='text-[10px] font-black uppercase tracking-widest'>{copy.paperWidth}</Label>
                <Input type='number' value={widthMm} onChange={(e) => setWidthMm(Number(e.target.value))} className='h-10 rounded-xl border-dashed' />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-[10px] font-black uppercase tracking-widest'>{copy.paperHeight}</Label>
                <Input type='number' value={heightMm} onChange={(e) => setHeightMm(Number(e.target.value))} className='h-10 rounded-xl border-dashed' />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-[10px] font-black uppercase tracking-widest'>{copy.dpi}</Label>
                <Input type='number' value={dpi} onChange={(e) => setDpi(Number(e.target.value))} className='h-10 rounded-xl border-dashed' />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-[10px] font-black uppercase tracking-widest'>{copy.copies}</Label>
                <Input type='number' value={copies} onChange={(e) => setCopies(Number(e.target.value))} className='h-10 rounded-xl border-dashed' />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-[10px] font-black uppercase tracking-widest'>{copy.margin}</Label>
                <Input type='number' value={marginMm} onChange={(e) => setMarginMm(Number(e.target.value))} className='h-10 rounded-xl border-dashed' />
              </div>
            </CardContent>
          </Card>

          <Card className='rounded-[24px] border border-dashed border-muted/50 shadow-none'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight'>
                <FileCode2 className='size-4 text-primary' />
                {copy.sectionMapping}
              </CardTitle>
              <CardDescription className='text-[11px]'>{copy.sectionMappingHint}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 sm:grid-cols-3'>
                <div className='space-y-1.5'>
                  <Label className='text-[10px] font-black uppercase tracking-widest'>{copy.codeType}</Label>
                  <Select value={codeType} onValueChange={(value) => setCodeType(value as CodeType)}>
                    <SelectTrigger className='h-10 rounded-xl border-dashed'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='QR'>QR</SelectItem>
                      <SelectItem value='CODE128'>CODE128</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-[10px] font-black uppercase tracking-widest'>{copy.prefix}</Label>
                  <Input value={prefix} onChange={(e) => setPrefix(e.target.value.trim().toUpperCase())} className='h-10 rounded-xl border-dashed' />
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-[10px] font-black uppercase tracking-widest'>{copy.serialRule}</Label>
                  <Select value={serialRule} onValueChange={(value) => setSerialRule(value as SerialRule)}>
                    <SelectTrigger className='h-10 rounded-xl border-dashed'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='DATE_SEQ'>{copy.serialDateSeq}</SelectItem>
                      <SelectItem value='ORDER_BOX'>{copy.serialOrderBox}</SelectItem>
                      <SelectItem value='RANDOM_8'>{copy.serialRandom}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-2 rounded-2xl border border-dashed border-muted/60 bg-muted/5 px-3 py-3'>
                <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
                  {copy.payloadFields}
                </div>
                <div className='grid gap-2 sm:grid-cols-2'>
                  <label className='flex items-center gap-2 text-[11px] font-bold'>
                    <Checkbox checked={includeOrderNo} onCheckedChange={(checked) => setIncludeOrderNo(checked === true)} />
                    {copy.fieldOrderNo}
                  </label>
                  <label className='flex items-center gap-2 text-[11px] font-bold'>
                    <Checkbox checked={includeCustomer} onCheckedChange={(checked) => setIncludeCustomer(checked === true)} />
                    {copy.fieldCustomer}
                  </label>
                  <label className='flex items-center gap-2 text-[11px] font-bold'>
                    <Checkbox checked={includeBoxNo} onCheckedChange={(checked) => setIncludeBoxNo(checked === true)} />
                    {copy.fieldBoxNo}
                  </label>
                  <label className='flex items-center gap-2 text-[11px] font-bold'>
                    <Checkbox checked={includeItemCount} onCheckedChange={(checked) => setIncludeItemCount(checked === true)} />
                    {copy.fieldItemCount}
                  </label>
                  <label className='flex items-center gap-2 text-[11px] font-bold'>
                    <Checkbox checked={includePackedAt} onCheckedChange={(checked) => setIncludePackedAt(checked === true)} />
                    {copy.fieldPackedAt}
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className='rounded-[24px] border border-dashed border-muted/50 shadow-none'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight'>
              <Settings2 className='size-4 text-primary' />
              {copy.sectionPreview}
            </CardTitle>
            <CardDescription className='text-[11px]'>{copy.sectionPreviewHint}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='rounded-2xl border border-dashed border-muted bg-muted/10 p-3'>
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
                {copy.livePayload}
              </div>
              <code className='mt-2 block break-all font-mono text-[10px] leading-5 text-foreground'>
                {payloadExample}
              </code>
            </div>

            <div className='rounded-2xl border border-dashed border-muted bg-background p-3'>
              <div className='mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
                {copy.liveMatrix}
              </div>
              <pre className='max-h-[320px] overflow-auto rounded-xl bg-muted/20 p-2 font-mono text-[6px] leading-[6px] text-foreground'>
                {matrixPreview}
              </pre>
            </div>

            <div className='flex flex-wrap gap-2'>
              <Badge variant='outline' className='rounded-full border-dashed'>
                {selectedTemplate.widthMm} x {selectedTemplate.heightMm} mm
              </Badge>
              <Badge variant='outline' className='rounded-full border-dashed'>
                {dpi} DPI
              </Badge>
              <Badge variant='outline' className='rounded-full border-dashed'>
                {copies} copies
              </Badge>
              <Badge variant='outline' className='rounded-full border-dashed'>
                margin {marginMm} mm
              </Badge>
            </div>

            <div className='space-y-2 rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-3'>
              <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary'>
                <Workflow className='size-3.5' />
                {copy.executionSpec}
              </div>
              <p className='text-[10px] font-medium text-primary/80'>{copy.executionSpecHint}</p>
              <ul className='space-y-1 text-[10px] font-bold text-primary/90'>
                <li>1. {copy.execSales}</li>
                <li>2. {copy.execWarehouseInbound}</li>
              </ul>
            </div>

            <div className='flex items-center justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                className='h-10 rounded-2xl border-dashed px-4 text-[10px] font-black uppercase tracking-widest'
                onClick={() => toast.success(copy.saveSuccess)}
              >
                {copy.saveDraft}
              </Button>
              <Button
                type='button'
                variant='secondary'
                className='h-10 rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest'
                onClick={() => toast.success(copy.testSuccess)}
              >
                {copy.testPrint}
              </Button>
              <Button
                type='button'
                className='h-10 rounded-2xl px-5 text-[10px] font-black uppercase tracking-widest'
                onClick={() => toast.success(copy.publishSuccess)}
              >
                {copy.publish}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
