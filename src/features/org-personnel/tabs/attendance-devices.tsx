'use client'

import { type ElementType, type ReactNode, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Cable,
  CheckCircle2,
  Clock3,
  Edit2,
  KeyRound,
  Loader2,
  MapPin,
  PlugZap,
  Plus,
  RefreshCw,
  Save,
  Search,
  ServerCog,
  ShieldCheck,
  Trash2,
  UsersRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import type { Employee } from '../data/schema'
import { personnelQueryKeys } from '../query-keys'
import {
  attendanceDeviceService,
  type AttendanceDevice,
  type AttendanceDeviceCollectMode,
  type AttendanceDeviceInput,
  type AttendanceDeviceProtocol,
  type AttendanceDeviceStatus,
  type AttendanceDeviceTemplate,
} from '../services/attendance-device-service'
import { EmployeeCoreService } from '../services/employee-core-service'

type AttendanceDeviceForm = Omit<AttendanceDeviceInput, 'config'> & {
  secret: string
  ingressToken: string
  configText: string
}

const ACTION_PERMISSION = ['action_attendance_device_manage', 'perm_manage']

const protocolOptions: Array<{
  value: AttendanceDeviceProtocol
  label: string
}> = [
  { value: 'isup-ehome', label: 'ISUP / EHOME' },
  { value: 'isapi', label: 'ISAPI' },
  { value: 'hcnet-sdk', label: 'HCNetSDK' },
  { value: 'openapi', label: 'OpenAPI' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'middleware-push', label: 'Middleware Push' },
  { value: 'database-view', label: 'Database View' },
  { value: 'csv-import', label: 'CSV Import' },
  { value: 'custom-http', label: 'Custom HTTP' },
  { value: 'custom-file-watch', label: 'File Watch' },
  { value: 'manual', label: 'Manual' },
]

const collectModeOptions: Array<{
  value: AttendanceDeviceCollectMode
  label: string
}> = [
  { value: 'pull', label: '定时拉取' },
  { value: 'push', label: '主动推送' },
  { value: 'file', label: '文件导入' },
  { value: 'manual', label: '人工占位' },
]

const statusOptions: Array<{ value: AttendanceDeviceStatus; label: string }> = [
  { value: 'active', label: '启用' },
  { value: 'paused', label: '暂停' },
  { value: 'offline', label: '离线' },
  { value: 'maintenance', label: '维护中' },
]

const employeeMatchOptions = [
  { value: 'staffId', label: '系统工号 staffId' },
  { value: 'idCard', label: '身份证号 idCard' },
  { value: 'phone', label: '手机号 phone' },
  { value: 'employeeId', label: '员工ID employeeId' },
]

const defaultConfig = {
  adapter: 'hikvision-isup-ehome',
  protocolVersion: '5.0',
  registrationPort: 7660,
  deviceIdField: 'deviceCode',
  secretField: 'isupKey',
  ingressEndpoint: '/api/v1/attendance-events/ingest',
  fieldMapping: {
    employeeNo: 'employeeNo',
    time: 'time',
    eventType: 'eventType',
  },
}

function stringifyConfig(config: Record<string, unknown>): string {
  return JSON.stringify(config, null, 2)
}

function createFormFromTemplate(
  template?: AttendanceDeviceTemplate
): AttendanceDeviceForm {
  return {
    deviceCode: template?.vendor === 'hikvision' ? 'ATT-HIK-01' : 'ATT-001',
    name:
      template?.vendor === 'hikvision' ? '一号门海康考勤机' : '考勤设备 001',
    vendor: template?.vendor ?? 'hikvision',
    model: template?.defaultModel ?? 'DS-K1T / ISUP 5.0 access terminal',
    protocol: template?.protocol ?? 'isup-ehome',
    endpoint:
      template?.protocol === 'webhook'
        ? ''
        : template?.protocol === 'isup-ehome'
          ? 'erp.example.com'
          : 'http://192.168.1.64',
    port: template?.port ?? 7660,
    username: template?.protocol === 'isup-ehome' ? 'ATT-HIK-01' : 'admin',
    secret: '',
    ingressToken: '',
    location: '一号门',
    orgUnitId: '',
    status: 'active',
    collectMode: template?.collectMode ?? 'pull',
    pollIntervalSeconds: 300,
    timeZone: 'Asia/Shanghai',
    employeeMatchField: template?.employeeMatchField ?? 'staffId',
    deviceEmployeeKeyField: template?.deviceEmployeeKeyField ?? 'employeeNo',
    eventTimeField: template?.eventTimeField ?? 'time',
    rawEventCodeField: template?.rawEventCodeField ?? 'eventType',
    clockDirectionRule: template?.clockDirectionRule ?? 'auto',
    deduplicateWindowSec: 60,
    configText: stringifyConfig(template?.config ?? defaultConfig),
  }
}

function createFormFromDevice(device: AttendanceDevice): AttendanceDeviceForm {
  return {
    deviceCode: device.deviceCode,
    name: device.name,
    vendor: device.vendor,
    model: device.model,
    protocol: device.protocol,
    endpoint: device.endpoint,
    port: device.port,
    username: device.username,
    secret: '',
    ingressToken: '',
    location: device.location,
    orgUnitId: device.orgUnitId,
    status: device.status,
    collectMode: device.collectMode,
    pollIntervalSeconds: device.pollIntervalSeconds,
    timeZone: device.timeZone,
    employeeMatchField: device.employeeMatchField,
    deviceEmployeeKeyField: device.deviceEmployeeKeyField,
    eventTimeField: device.eventTimeField,
    rawEventCodeField: device.rawEventCodeField,
    clockDirectionRule: device.clockDirectionRule,
    deduplicateWindowSec: device.deduplicateWindowSec,
    configText: stringifyConfig(device.config),
  }
}

function parseConfig(text: string): Record<string, unknown> {
  const parsed = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('JSON 配置必须是对象')
  }
  return parsed as Record<string, unknown>
}

function formatTime(value: string | null | undefined, locale: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getStatusBadgeClassName(status: string): string {
  switch (status) {
    case 'active':
    case 'ready':
    case 'online':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
    case 'paused':
    case 'needs_endpoint':
    case 'needs_secret':
    case 'adapter_pending':
    case 'waiting_registration':
    case 'needs_device_id':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-700'
    case 'offline':
      return 'border-slate-500/20 bg-slate-500/10 text-slate-600'
    case 'error':
      return 'border-rose-500/20 bg-rose-500/10 text-rose-700'
    case 'maintenance':
      return 'border-sky-500/20 bg-sky-500/10 text-sky-700'
    default:
      return 'border-muted bg-muted/50 text-muted-foreground'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'active':
      return '启用'
    case 'paused':
      return '暂停'
    case 'offline':
      return '离线'
    case 'maintenance':
      return '维护中'
    case 'error':
      return '异常'
    case 'ready':
      return '预检通过'
    case 'online':
      return '在线'
    case 'adapter_pending':
      return '等待适配器'
    case 'waiting_registration':
      return '等待设备注册'
    case 'needs_device_id':
      return '缺少注册 ID'
    case 'needs_endpoint':
      return '缺少地址'
    case 'needs_secret':
      return '缺少凭据'
    case 'never':
      return '未同步'
    default:
      return status || '-'
  }
}

function protocolLabel(protocol: string): string {
  return (
    protocolOptions.find((option) => option.value === protocol)?.label ??
    protocol
  )
}

function InfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType
  label: string
  value: string | number
}) {
  return (
    <div className='flex min-w-0 items-center gap-2 rounded-full border border-dashed border-muted/60 bg-background/70 px-3 py-2'>
      <Icon className='size-3.5 shrink-0 text-primary' />
      <span className='shrink-0 text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
        {label}
      </span>
      <span className='truncate text-[11px] font-bold text-foreground/80'>
        {value || '-'}
      </span>
    </div>
  )
}

export default function AttendanceDevices() {
  const { locale } = useLanguage()
  const queryClient = useQueryClient()
  const { allowsAction, isChecking } = usePermissionActions()
  const canManage = allowsAction(ACTION_PERMISSION)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<AttendanceDevice | null>(
    null
  )
  const [selectedTemplateVendor, setSelectedTemplateVendor] =
    useState('hikvision')
  const [form, setForm] = useState<AttendanceDeviceForm>(() =>
    createFormFromTemplate()
  )
  const [configError, setConfigError] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [mappingDevice, setMappingDevice] =
    useState<AttendanceDevice | null>(null)
  const [mappingEmployeeKey, setMappingEmployeeKey] = useState('')
  const [mappingEmployeeId, setMappingEmployeeId] = useState('')

  const devicesQuery = useQuery({
    queryKey: personnelQueryKeys.attendanceDevices.list(),
    queryFn: () => attendanceDeviceService.getDevices(),
  })

  const templatesQuery = useQuery({
    queryKey: personnelQueryKeys.attendanceDevices.templates(),
    queryFn: () => attendanceDeviceService.getTemplates(),
  })

  const eventsQuery = useQuery({
    queryKey: personnelQueryKeys.attendanceDevices.events(),
    queryFn: () => attendanceDeviceService.getEvents(),
    refetchInterval: 30_000,
  })

  const unmatchedEventsQuery = useQuery({
    queryKey: personnelQueryKeys.attendanceDevices.events(
      undefined,
      'unmatched'
    ),
    queryFn: () => attendanceDeviceService.getEvents(undefined, 'unmatched'),
    refetchInterval: 30_000,
  })

  const mappingsQuery = useQuery({
    queryKey: personnelQueryKeys.attendanceDevices.mappings(),
    queryFn: () => attendanceDeviceService.getMappings(),
  })

  const employeesQuery = useQuery<Employee[]>({
    queryKey: personnelQueryKeys.employees(),
    queryFn: () => EmployeeCoreService.getEmployees(),
  })

  const saveMutation = useMutation({
    mutationFn: async ({
      payload,
      ingressToken,
    }: {
      payload: AttendanceDeviceInput
      ingressToken: string
    }) => {
      const saved = await attendanceDeviceService.saveDevice(payload)
      if (ingressToken) {
        await attendanceDeviceService.setIngressToken(saved.id, ingressToken)
      }
      return saved
    },
    onSuccess: () => {
      toast.success(editingDevice ? '考勤设备已更新' : '考勤设备已绑定')
      setIsDialogOpen(false)
      void queryClient.invalidateQueries({
        queryKey: personnelQueryKeys.attendanceDevices.all(),
      })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '保存考勤设备失败')
    },
  })

  const mappingMutation = useMutation({
    mutationFn: () =>
      attendanceDeviceService.saveMapping({
        deviceId: mappingDevice?.id ?? '',
        deviceEmployeeKey: mappingEmployeeKey.trim(),
        employeeId: mappingEmployeeId,
        matchField: mappingDevice?.employeeMatchField ?? 'staffId',
        source: 'manual',
        status: 'active',
      }),
    onSuccess: () => {
      toast.success('设备员工映射已保存')
      setMappingDevice(null)
      void queryClient.invalidateQueries({
        queryKey: personnelQueryKeys.attendanceDevices.all(),
      })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '保存员工映射失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => attendanceDeviceService.deleteDevice(id),
    onSuccess: () => {
      toast.success('考勤设备已删除')
      void queryClient.invalidateQueries({
        queryKey: personnelQueryKeys.attendanceDevices.all(),
      })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除考勤设备失败')
    },
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => attendanceDeviceService.testDevice(id),
    onSuccess: (result) => {
      setTestMessage(`${result.message} ${result.nextAdapterAction}`)
      toast.success(statusLabel(result.status), {
        description: result.message,
      })
      void queryClient.invalidateQueries({
        queryKey: personnelQueryKeys.attendanceDevices.all(),
      })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '设备预检失败')
    },
  })

  const syncMutation = useMutation({
    mutationFn: (id: string) => attendanceDeviceService.syncDevice(id),
    onSuccess: (result) => {
      toast.success('考勤设备同步完成', {
        description: result.message,
      })
      void queryClient.invalidateQueries({
        queryKey: personnelQueryKeys.attendanceDevices.all(),
      })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '考勤设备同步失败')
      void queryClient.invalidateQueries({
        queryKey: personnelQueryKeys.attendanceDevices.all(),
      })
    },
  })

  const templates = templatesQuery.data ?? []
  const devices = devicesQuery.data ?? []
  const events = eventsQuery.data?.items ?? []
  const unmatchedEvents = unmatchedEventsQuery.data?.items ?? []
  const mappings = mappingsQuery.data ?? []
  const employees = employeesQuery.data ?? []
  const filteredDevices = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return devices
    return devices.filter((device) =>
      [
        device.deviceCode,
        device.name,
        device.vendor,
        device.model,
        device.protocol,
        device.endpoint,
        device.location,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }, [devices, searchTerm])

  const summary = useMemo(() => {
    const active = devices.filter((device) => device.status === 'active').length
    const withSecret = devices.filter((device) => device.hasSecret).length
    const hikvision = devices.filter((device) =>
      ['hikvision', 'ivms-4200'].includes(device.vendor)
    ).length
    return { active, withSecret, hikvision, total: devices.length }
  }, [devices])

  const eventStatsByDevice = useMemo(() => {
    const stats = new Map<string, { total: number; unmatched: number }>()
    for (const event of events) {
      const current = stats.get(event.deviceId) ?? { total: 0, unmatched: 0 }
      current.total += 1
      if (event.matchStatus !== 'matched') current.unmatched += 1
      stats.set(event.deviceId, current)
    }
    return stats
  }, [events])

  const mappingCountByDevice = useMemo(() => {
    const counts = new Map<string, number>()
    for (const mapping of mappings) {
      counts.set(mapping.deviceId, (counts.get(mapping.deviceId) ?? 0) + 1)
    }
    return counts
  }, [mappings])

  const openMappingDialog = (deviceId: string, deviceEmployeeKey = '') => {
    if (!canManage) return
    const device = devices.find((item) => item.id === deviceId)
    if (!device) {
      toast.error('未找到对应考勤设备')
      return
    }
    setMappingDevice(device)
    setMappingEmployeeKey(deviceEmployeeKey)
    setMappingEmployeeId('')
  }

  const openCreateDialog = (templateVendor = selectedTemplateVendor) => {
    if (!canManage) return
    const template = templates.find((item) => item.vendor === templateVendor)
    setEditingDevice(null)
    setSelectedTemplateVendor(templateVendor)
    setForm(createFormFromTemplate(template))
    setConfigError(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (device: AttendanceDevice) => {
    if (!canManage) return
    setEditingDevice(device)
    setSelectedTemplateVendor(device.vendor)
    setForm(createFormFromDevice(device))
    setConfigError(null)
    setIsDialogOpen(true)
  }

  const updateForm = (patch: Partial<AttendanceDeviceForm>) => {
    setForm((current) => ({ ...current, ...patch }))
    if ('configText' in patch) {
      setConfigError(null)
    }
  }

  const updateProtocol = (protocol: AttendanceDeviceProtocol) => {
    if (protocol === 'isup-ehome') {
      updateForm({
        protocol,
        collectMode: 'push',
        port: 7660,
      })
      return
    }
    if (protocol === 'isapi') {
      updateForm({
        protocol,
        collectMode: 'pull',
        port: 80,
      })
      return
    }
    updateForm({ protocol })
  }

  const applyTemplate = (vendor: string) => {
    const template = templates.find((item) => item.vendor === vendor)
    setSelectedTemplateVendor(vendor)
    setForm((current) => ({
      ...createFormFromTemplate(template),
      deviceCode: current.deviceCode,
      name: current.name,
      location: current.location,
      orgUnitId: current.orgUnitId,
    }))
    setConfigError(null)
  }

  const handleSave = () => {
    if (!canManage) return
    let config: Record<string, unknown>
    try {
      config = parseConfig(form.configText)
      setConfigError(null)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'JSON 配置格式不正确'
      setConfigError(message)
      toast.error(message)
      return
    }

    const payload: AttendanceDeviceInput = {
      id: editingDevice?.id,
      deviceCode: form.deviceCode.trim(),
      name: form.name.trim(),
      vendor: form.vendor,
      model: form.model,
      protocol: form.protocol,
      endpoint: form.endpoint.trim(),
      port: form.port,
      username: form.username.trim(),
      secret: form.secret.trim() || undefined,
      location: form.location.trim(),
      orgUnitId: form.orgUnitId.trim(),
      status: form.status,
      collectMode: form.collectMode,
      pollIntervalSeconds: form.pollIntervalSeconds,
      timeZone: form.timeZone,
      employeeMatchField: form.employeeMatchField,
      deviceEmployeeKeyField: form.deviceEmployeeKeyField,
      eventTimeField: form.eventTimeField,
      rawEventCodeField: form.rawEventCodeField,
      clockDirectionRule: form.clockDirectionRule,
      deduplicateWindowSec: form.deduplicateWindowSec,
      config,
    }
    saveMutation.mutate({
      payload,
      ingressToken: form.ingressToken.trim(),
    })
  }

  const handleDelete = (device: AttendanceDevice) => {
    if (!canManage) return
    const confirmed = window.confirm(`确定删除考勤设备 [${device.name}] 吗？`)
    if (!confirmed) return
    deleteMutation.mutate(device.id)
  }

  if (
    isForbiddenError(devicesQuery.error) ||
    isForbiddenError(templatesQuery.error) ||
    isForbiddenError(eventsQuery.error) ||
    isForbiddenError(unmatchedEventsQuery.error) ||
    isForbiddenError(mappingsQuery.error) ||
    isForbiddenError(employeesQuery.error)
  ) {
    return <ForbiddenState />
  }

  return (
    <div className='flex animate-in flex-col gap-7 p-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={ServerCog}
        title='考勤设备管理'
        description='ATTENDANCE_DEVICE_BINDING / 统一绑定打卡机、采集协议、员工字段映射与同步策略'
        statusBadge={
          <div className='flex flex-wrap items-center gap-2'>
            <Badge className='border-none bg-emerald-500/10 text-emerald-700'>
              {summary.active}/{summary.total} 启用
            </Badge>
            <Badge className='border-none bg-sky-500/10 text-sky-700'>
              IVMS / 海康 {summary.hikvision}
            </Badge>
            <Badge className='border-none bg-violet-500/10 text-violet-700'>
              事件 {eventsQuery.data?.total ?? 0}
            </Badge>
            <Button
              type='button'
              className='h-9 rounded-full px-4 text-[10px] font-black tracking-widest uppercase'
              disabled={!canManage || isChecking}
              onClick={() => openCreateDialog()}
            >
              <Plus className='mr-2 size-3.5' />
              绑定设备
            </Button>
          </div>
        }
      />

      <div className='grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-5'>
        <Card className='h-fit gap-0 rounded-[20px] border-dashed bg-muted/5 py-0'>
          <CardContent className='flex items-center gap-2.5 p-3'>
            <PlugZap className='size-4 shrink-0 text-emerald-600' />
            <div className='flex min-w-0 items-baseline gap-2'>
              <p className='truncate text-[9px] leading-none font-black tracking-widest text-muted-foreground uppercase'>
                已绑定设备
              </p>
              <p className='text-xl leading-none font-black tracking-tight'>
                {summary.total}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className='h-fit gap-0 rounded-[20px] border-dashed bg-muted/5 py-0'>
          <CardContent className='flex items-center gap-2.5 p-3'>
            <CheckCircle2 className='size-4 shrink-0 text-sky-600' />
            <div className='flex min-w-0 items-baseline gap-2'>
              <p className='truncate text-[9px] leading-none font-black tracking-widest text-muted-foreground uppercase'>
                启用采集
              </p>
              <p className='text-xl leading-none font-black tracking-tight'>
                {summary.active}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className='h-fit gap-0 rounded-[20px] border-dashed bg-muted/5 py-0'>
          <CardContent className='flex items-center gap-2.5 p-3'>
            <KeyRound className='size-4 shrink-0 text-amber-600' />
            <div className='flex min-w-0 items-baseline gap-2'>
              <p className='truncate text-[9px] leading-none font-black tracking-widest text-muted-foreground uppercase'>
                已配置凭据
              </p>
              <p className='text-xl leading-none font-black tracking-tight'>
                {summary.withSecret}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className='h-fit gap-0 rounded-[20px] border-dashed bg-muted/5 py-0'>
          <CardContent className='flex items-center gap-2.5 p-3'>
            <UsersRound className='size-4 shrink-0 text-primary' />
            <div className='flex min-w-0 items-baseline gap-2'>
              <p className='truncate text-[9px] leading-none font-black tracking-widest text-muted-foreground uppercase'>
                默认匹配方式
              </p>
              <p className='truncate text-base leading-none font-black tracking-tight'>
                工号 staffId
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className='h-fit gap-0 rounded-[20px] border-dashed bg-muted/5 py-0'>
          <CardContent className='flex items-center gap-2.5 p-3'>
            <Clock3 className='size-4 shrink-0 text-violet-600' />
            <div className='flex min-w-0 items-baseline gap-2'>
              <p className='truncate text-[9px] leading-none font-black tracking-widest text-muted-foreground uppercase'>
                未匹配事件
              </p>
              <p className='text-xl leading-none font-black tracking-tight'>
                {unmatchedEventsQuery.data?.total ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className='grid grid-cols-1 gap-6 xl:grid-cols-12'>
        <div className='space-y-5 xl:col-span-8'>
          <div className='flex flex-col gap-3 rounded-[24px] border border-dashed bg-muted/5 p-4 md:flex-row md:items-center md:justify-between'>
            <div className='relative min-w-0 flex-1'>
              <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder='搜索设备编码、名称、厂商、协议、地址...'
                className='h-11 rounded-2xl border-dashed bg-background/80 pl-10'
              />
            </div>
            <Button
              type='button'
              variant='outline'
              className='h-11 rounded-full text-[10px] font-black tracking-widest uppercase'
              onClick={() =>
                void queryClient.invalidateQueries({
                  queryKey: personnelQueryKeys.attendanceDevices.all(),
                })
              }
            >
              <RefreshCw className='mr-2 size-3.5' />
              刷新
            </Button>
          </div>

          {devicesQuery.isLoading ? (
            <Card className='rounded-[28px] border-dashed bg-muted/5 p-8 text-center text-sm font-bold text-muted-foreground'>
              正在加载考勤设备配置...
            </Card>
          ) : filteredDevices.length === 0 ? (
            <Card className='rounded-[28px] border-dashed bg-muted/5 p-8 text-center'>
              <ServerCog className='mx-auto mb-3 size-8 text-muted-foreground/40' />
              <p className='text-sm font-black'>暂无考勤设备绑定</p>
              <p className='mt-1 text-xs text-muted-foreground'>
                先绑定 IVMS / 海康模板，后续再增加其他品牌设备。
              </p>
            </Card>
          ) : (
            <div className='grid gap-4'>
              {filteredDevices.map((device) => (
                <Card
                  key={device.id}
                  className='rounded-[28px] border-dashed bg-muted/5 shadow-inner'
                >
                  <CardHeader className='gap-3 pb-2'>
                    <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                      <div className='min-w-0 space-y-2'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <CardTitle className='truncate text-base font-black tracking-tight'>
                            {device.name}
                          </CardTitle>
                          <Badge
                            variant='outline'
                            className={getStatusBadgeClassName(device.status)}
                          >
                            {statusLabel(device.status)}
                          </Badge>
                          {device.lastHealthStatus &&
                          device.lastHealthStatus !== 'unknown' ? (
                            <Badge
                              variant='outline'
                              className={getStatusBadgeClassName(
                                device.lastHealthStatus
                              )}
                            >
                              {statusLabel(device.lastHealthStatus)}
                            </Badge>
                          ) : null}
                          <Badge variant='outline' className='border-dashed'>
                            {protocolLabel(device.protocol)}
                          </Badge>
                        </div>
                        <CardDescription className='font-mono text-[11px]'>
                          {device.deviceCode} / {device.vendor} /{' '}
                          {device.model || '-'}
                        </CardDescription>
                      </div>
                      <div className='flex shrink-0 items-center gap-2'>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='size-9 rounded-full'
                              disabled={!canManage || testMutation.isPending}
                              onClick={() => testMutation.mutate(device.id)}
                            >
                              {testMutation.isPending ? (
                                <Loader2 className='size-4 animate-spin' />
                              ) : (
                                <Cable className='size-4' />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>预检采集配置</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='size-9 rounded-full'
                              disabled={
                                !canManage ||
                                syncMutation.isPending ||
                                device.protocol === 'isup-ehome'
                              }
                              onClick={() => syncMutation.mutate(device.id)}
                            >
                              {syncMutation.isPending ? (
                                <Loader2 className='size-4 animate-spin' />
                              ) : (
                                <RefreshCw className='size-4' />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {device.protocol === 'isup-ehome'
                              ? 'ISUP/EHOME 由设备主动注册并推送事件'
                              : '立即同步考勤事件'}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='size-9 rounded-full'
                              disabled={!canManage}
                              onClick={() => openEditDialog(device)}
                            >
                              <Edit2 className='size-4' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>编辑绑定</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='size-9 rounded-full'
                              disabled={!canManage}
                              onClick={() => openMappingDialog(device.id)}
                            >
                              <UsersRound className='size-4' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>绑定设备员工</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              className='size-9 rounded-full text-rose-600'
                              disabled={!canManage || deleteMutation.isPending}
                              onClick={() => handleDelete(device)}
                            >
                              <Trash2 className='size-4' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>删除设备</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3'>
                      <InfoPill
                        icon={MapPin}
                        label='位置'
                        value={device.location || '-'}
                      />
                      <InfoPill
                        icon={PlugZap}
                        label='地址'
                        value={
                          device.endpoint
                            ? `${device.endpoint}:${device.port || '-'}`
                            : '-'
                        }
                      />
                      <InfoPill
                        icon={Clock3}
                        label='采集'
                        value={`${device.collectMode} / ${device.pollIntervalSeconds}s`}
                      />
                      <InfoPill
                        icon={UsersRound}
                        label='员工匹配'
                        value={`${device.deviceEmployeeKeyField} to ${device.employeeMatchField}`}
                      />
                      <InfoPill
                        icon={ShieldCheck}
                        label='凭据'
                        value={device.hasSecret ? '已保存' : '未配置'}
                      />
                      <InfoPill
                        icon={KeyRound}
                        label='推送令牌'
                        value={
                          device.hasIngressToken ? '已配置' : '未配置'
                        }
                      />
                      <InfoPill
                        icon={UsersRound}
                        label='员工映射'
                        value={`${mappingCountByDevice.get(device.id) ?? 0} 条`}
                      />
                      <InfoPill
                        icon={Clock3}
                        label='最近事件'
                        value={(() => {
                          const stats = eventStatsByDevice.get(device.id)
                          return stats
                            ? `${stats.total} 条 / 未匹配 ${stats.unmatched}`
                            : '暂无'
                        })()}
                      />
                      <InfoPill
                        icon={RefreshCw}
                        label='上次同步'
                        value={`${statusLabel(device.lastSyncStatus)} / ${formatTime(device.lastSyncAt, locale)}`}
                      />
                      <InfoPill
                        icon={Cable}
                        label='连接健康'
                        value={
                          device.lastHealthCheckAt
                            ? `${statusLabel(device.lastHealthStatus)} / ${device.lastHealthLatencyMs ?? 0}ms / ${formatTime(device.lastHealthCheckAt, locale)}`
                            : '未探测'
                        }
                      />
                      <InfoPill
                        icon={Clock3}
                        label='同步结果'
                        value={`${device.lastSyncFetched ?? 0} 读 / ${device.lastSyncAccepted ?? 0} 新`}
                      />
                      <InfoPill
                        icon={Clock3}
                        label='最新事件'
                        value={formatTime(device.lastEventAt, locale)}
                      />
                    </div>
                    {device.lastSyncMessage ? (
                      <div className='rounded-2xl border border-dashed border-muted/60 bg-background/70 p-3 text-xs font-medium text-muted-foreground'>
                        {device.lastSyncMessage}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <aside className='space-y-5 xl:col-span-4'>
          <Card className='rounded-[28px] border-dashed bg-muted/5 shadow-inner'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-sm font-black tracking-tight'>
                <ServerCog className='size-4 text-primary' />
                ISUP / EHOME 对接口径
              </CardTitle>
              <CardDescription className='text-xs leading-relaxed'>
                设备主动注册到 ERP 侧 ISUP 网关，网关解析注册、心跳和考勤事件后，
                再进入 ERP 统一考勤流水。
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3 text-xs leading-relaxed text-muted-foreground'>
              <div className='rounded-2xl border border-dashed bg-background/70 p-4'>
                <p className='font-bold text-foreground'>推荐链路</p>
                <p className='mt-1'>
                  打卡机 / 门禁终端 {'>'} ISUP/EHOME 主动注册 {'>'} ERP
                  侧海康网关 {'>'} 统一事件入库 {'>'} 员工映射 {'>'} 出勤统计。
                </p>
              </div>
              <div className='rounded-2xl border border-dashed bg-background/70 p-4'>
                <p className='font-bold text-foreground'>设备侧配置</p>
                <p className='mt-1'>
                  填写 ERP/网关可访问地址、注册端口、设备注册 ID 和 ISUP
                  Key；注册端口默认 7660，最终以现场网关配置为准。
                </p>
              </div>
              <div className='rounded-2xl border border-dashed bg-background/70 p-4'>
                <p className='font-bold text-foreground'>ERP 入站</p>
                <p className='mt-1'>
                  ISUP 网关把设备事件转换为统一 JSON，携带独立入站令牌推送到
                  /api/v1/attendance-events/ingest。
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className='rounded-[28px] border-dashed bg-muted/5 shadow-inner'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-sm font-black tracking-tight'>
                <PlugZap className='size-4 text-primary' />
                设备模板
              </CardTitle>
              <CardDescription className='text-xs'>
                选择模板后会带入默认协议、字段映射和采集方式。
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {templatesQuery.isLoading ? (
                <p className='text-xs text-muted-foreground'>模板加载中...</p>
              ) : (
                templates.map((template) => (
                  <button
                    key={template.vendor}
                    type='button'
                    className='w-full rounded-2xl border border-dashed bg-background/70 p-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/5'
                    onClick={() => openCreateDialog(template.vendor)}
                    disabled={!canManage}
                  >
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-sm font-black'>
                        {template.label}
                      </span>
                      <Badge variant='outline'>{template.protocol}</Badge>
                    </div>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {template.defaultModel}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {testMessage ? (
            <Card className='rounded-[24px] border-dashed border-sky-500/20 bg-sky-500/5'>
              <CardContent className='p-4 text-xs leading-relaxed font-medium text-sky-800'>
                {testMessage}
              </CardContent>
            </Card>
          ) : null}

          <Card className='rounded-[28px] border-dashed bg-muted/5 shadow-inner'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-sm font-black tracking-tight'>
                <UsersRound className='size-4 text-amber-600' />
                待处理员工映射
              </CardTitle>
              <CardDescription className='text-xs'>
                未匹配的设备工号会先进入这里，绑定一次后后续事件自动匹配。
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-2'>
              {unmatchedEventsQuery.isLoading ? (
                <p className='text-xs text-muted-foreground'>加载中...</p>
              ) : unmatchedEvents.length === 0 ? (
                <p className='text-xs text-muted-foreground'>暂无待处理映射</p>
              ) : (
                unmatchedEvents.slice(0, 6).map((event) => (
                  <div
                    key={event.id}
                    className='flex items-center justify-between gap-3 rounded-2xl border border-dashed bg-background/70 p-3'
                  >
                    <div className='min-w-0'>
                      <p className='truncate font-mono text-xs font-black'>
                        {event.deviceEmployeeKey}
                      </p>
                      <p className='truncate text-[10px] text-muted-foreground'>
                        {event.deviceCode} / {formatTime(event.occurredAt, locale)}
                      </p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type='button'
                          variant='outline'
                          size='icon'
                          className='size-8 shrink-0 rounded-full'
                          disabled={!canManage}
                          onClick={() =>
                            openMappingDialog(
                              event.deviceId,
                              event.deviceEmployeeKey
                            )
                          }
                        >
                          <UsersRound className='size-3.5' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>处理员工映射</TooltipContent>
                    </Tooltip>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className='rounded-[28px] border-dashed bg-muted/5 shadow-inner'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-sm font-black tracking-tight'>
                <Clock3 className='size-4 text-violet-600' />
                最近考勤事件
              </CardTitle>
              <CardDescription className='text-xs'>
                适配器或中间件推送后，事件会先进入统一流水表，再参与员工匹配和考勤统计。
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-2'>
              {events.length === 0 ? (
                <p className='text-xs text-muted-foreground'>暂无事件</p>
              ) : (
                events.slice(0, 6).map((event) => (
                  <div
                    key={event.id}
                    className='flex items-center justify-between gap-3 rounded-2xl border border-dashed bg-background/70 p-3'
                  >
                    <div className='min-w-0'>
                      <p className='truncate text-xs font-black'>
                        {event.employeeName || `设备员工 ${event.deviceEmployeeKey}`}
                      </p>
                      <p className='truncate text-[10px] text-muted-foreground'>
                        {event.deviceCode} / {formatTime(event.occurredAt, locale)}
                      </p>
                    </div>
                    <Badge
                      variant='outline'
                      className={getStatusBadgeClassName(event.matchStatus)}
                    >
                      {event.matchStatus === 'matched' ? '已匹配' : '待处理'}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </section>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent size='6xl' className='rounded-[28px] p-5 xl:gap-3'>
          <DialogHeader className='gap-1'>
            <DialogTitle className='flex items-center gap-2 text-base font-black'>
              <ServerCog className='size-4 text-primary' />
              {editingDevice ? '编辑考勤设备绑定' : '绑定考勤设备'}
            </DialogTitle>
            <DialogDescription className='text-xs'>
              设备连接、采集协议和员工字段映射会作为后端采集适配器的配置源。
            </DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-1 gap-4 xl:grid-cols-12'>
            <div className='space-y-3 xl:col-span-7'>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
                <Field label='设备模板'>
                  <Select
                    value={selectedTemplateVendor}
                    onValueChange={applyTemplate}
                  >
                    <SelectTrigger className='h-10 w-full rounded-xl'>
                      <SelectValue placeholder='选择设备模板' />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem
                          key={template.vendor}
                          value={template.vendor}
                        >
                          {template.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label='设备编码'>
                  <Input
                    value={form.deviceCode}
                    onChange={(event) =>
                      updateForm({
                        deviceCode: event.target.value.toUpperCase(),
                      })
                    }
                    className='h-10 rounded-xl'
                    placeholder='ATT-HIK-01'
                  />
                </Field>
                <Field label='设备名称'>
                  <Input
                    value={form.name}
                    onChange={(event) =>
                      updateForm({ name: event.target.value })
                    }
                    className='h-10 rounded-xl'
                    placeholder='一号门海康考勤机'
                  />
                </Field>
                <Field label='厂商'>
                  <Input
                    value={form.vendor}
                    onChange={(event) =>
                      updateForm({ vendor: event.target.value.toLowerCase() })
                    }
                    className='h-10 rounded-xl'
                    placeholder='hikvision'
                  />
                </Field>
                <Field label='型号 / 管理端'>
                  <Input
                    value={form.model}
                    onChange={(event) =>
                      updateForm({ model: event.target.value })
                    }
                    className='h-10 rounded-xl'
                    placeholder='DS-K1T / iVMS-4200'
                  />
                </Field>
                <Field label='安装位置'>
                  <Input
                    value={form.location}
                    onChange={(event) =>
                      updateForm({ location: event.target.value })
                    }
                    className='h-10 rounded-xl'
                    placeholder='一号门'
                  />
                </Field>
              </div>

              <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                <Field label='采集协议'>
                  <Select
                    value={form.protocol}
                    onValueChange={(value) =>
                      updateProtocol(value as AttendanceDeviceProtocol)
                    }
                  >
                    <SelectTrigger className='h-10 w-full rounded-xl'>
                      <SelectValue placeholder='采集协议' />
                    </SelectTrigger>
                    <SelectContent>
                      {protocolOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label='采集方式'>
                  <Select
                    value={form.collectMode}
                    onValueChange={(value) =>
                      updateForm({
                        collectMode: value as AttendanceDeviceCollectMode,
                      })
                    }
                  >
                    <SelectTrigger className='h-10 w-full rounded-xl'>
                      <SelectValue placeholder='采集方式' />
                    </SelectTrigger>
                    <SelectContent>
                      {collectModeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label='状态'>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      updateForm({ status: value as AttendanceDeviceStatus })
                    }
                  >
                    <SelectTrigger className='h-10 w-full rounded-xl'>
                      <SelectValue placeholder='状态' />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
                <Field
                  label={
                    form.protocol === 'isup-ehome'
                      ? 'ERP / ISUP 网关地址'
                      : '连接地址'
                  }
                >
                  <Input
                    value={form.endpoint}
                    onChange={(event) =>
                      updateForm({ endpoint: event.target.value })
                    }
                    className='h-10 rounded-xl'
                    placeholder={
                      form.protocol === 'isup-ehome'
                        ? '公网 IP 或网关域名'
                        : 'http://192.168.1.64'
                    }
                  />
                </Field>
                <Field
                  label={
                    form.protocol === 'isup-ehome' ? '设备注册端口' : '端口'
                  }
                >
                  <Input
                    type='number'
                    value={form.port}
                    onChange={(event) =>
                      updateForm({ port: Number(event.target.value) || 0 })
                    }
                    className='h-10 rounded-xl'
                    placeholder={
                      form.protocol === 'isup-ehome' ? '7660' : '80'
                    }
                  />
                </Field>
                <Field
                  label={
                    form.protocol === 'isup-ehome' ? '设备注册 ID' : '账号'
                  }
                >
                  <Input
                    value={form.username}
                    onChange={(event) =>
                      updateForm({ username: event.target.value })
                    }
                    className='h-10 rounded-xl'
                    placeholder={
                      form.protocol === 'isup-ehome' ? 'ATT-HIK-01' : 'admin'
                    }
                  />
                </Field>
                <Field
                  label={
                    form.protocol === 'isup-ehome'
                      ? editingDevice?.hasSecret
                        ? '新 ISUP Key (留空不改)'
                        : 'ISUP Key'
                      : editingDevice?.hasSecret
                        ? '新凭据 (留空不改)'
                        : '凭据'
                  }
                >
                  <Input
                    type='password'
                    value={form.secret}
                    onChange={(event) =>
                      updateForm({ secret: event.target.value })
                    }
                    className='h-10 rounded-xl'
                    placeholder={
                      editingDevice?.hasSecret
                        ? '已保存，留空保持原值'
                        : form.protocol === 'isup-ehome'
                          ? '与设备侧配置保持一致'
                          : '设备密码或 token'
                    }
                  />
                </Field>
                <Field
                  label={
                    editingDevice?.hasIngressToken
                      ? '新入站令牌 (留空不改)'
                      : '入站令牌'
                  }
                >
                  <Input
                    type='password'
                    value={form.ingressToken}
                    onChange={(event) =>
                      updateForm({ ingressToken: event.target.value })
                    }
                    className='h-10 rounded-xl'
                    placeholder='供中间件推送事件使用，至少 16 位'
                  />
                </Field>
                {form.protocol === 'isup-ehome' ? (
                  <div className='rounded-xl border border-dashed bg-muted/20 p-2.5 text-xs leading-relaxed text-muted-foreground md:col-span-2 xl:col-span-3'>
                    ISUP Key 用于设备注册认证；入站令牌用于 ISUP
                    网关调用 ERP HTTP 接口，两者应分别设置，不能混用。
                  </div>
                ) : null}
              </div>
            </div>

            <div className='space-y-3 xl:col-span-5'>
              <Card className='rounded-[20px] border-dashed bg-muted/5'>
                <CardHeader className='gap-1 pb-2'>
                  <CardTitle className='text-sm font-black'>
                    员工字段映射
                  </CardTitle>
                  <CardDescription className='text-[11px]'>
                    设备事件中的人员编号如何匹配系统员工档案。
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                    <Field label='系统员工字段'>
                      <Select
                        value={form.employeeMatchField}
                        onValueChange={(value) =>
                          updateForm({ employeeMatchField: value })
                        }
                      >
                        <SelectTrigger className='h-10 w-full rounded-xl'>
                          <SelectValue placeholder='系统员工字段' />
                        </SelectTrigger>
                        <SelectContent>
                          {employeeMatchOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label='设备员工字段'>
                      <Input
                        value={form.deviceEmployeeKeyField}
                        onChange={(event) =>
                          updateForm({
                            deviceEmployeeKeyField: event.target.value,
                          })
                        }
                        className='h-10 rounded-xl'
                        placeholder='employeeNo'
                      />
                    </Field>
                  </div>
                  <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                    <Field label='事件时间字段'>
                      <Input
                        value={form.eventTimeField}
                        onChange={(event) =>
                          updateForm({ eventTimeField: event.target.value })
                        }
                        className='h-10 rounded-xl'
                        placeholder='time'
                      />
                    </Field>
                    <Field label='事件编码字段'>
                      <Input
                        value={form.rawEventCodeField}
                        onChange={(event) =>
                          updateForm({
                            rawEventCodeField: event.target.value,
                          })
                        }
                        className='h-10 rounded-xl'
                        placeholder='eventType'
                      />
                    </Field>
                  </div>
                  <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                    <Field label='去重窗口(秒)'>
                      <Input
                        type='number'
                        value={form.deduplicateWindowSec}
                        onChange={(event) =>
                          updateForm({
                            deduplicateWindowSec:
                              Number(event.target.value) || 0,
                          })
                        }
                        className='h-10 rounded-xl'
                      />
                    </Field>
                    <Field label='轮询间隔(秒)'>
                      <Input
                        type='number'
                        value={form.pollIntervalSeconds}
                        onChange={(event) =>
                          updateForm({
                            pollIntervalSeconds:
                              Number(event.target.value) || 0,
                          })
                        }
                        className='h-10 rounded-xl'
                      />
                    </Field>
                  </div>
                  <Field label='方向判定'>
                    <Input
                      value={form.clockDirectionRule}
                      onChange={(event) =>
                        updateForm({ clockDirectionRule: event.target.value })
                      }
                      className='h-10 rounded-xl'
                      placeholder='auto'
                    />
                  </Field>
                </CardContent>
              </Card>

              <Field label='适配器 JSON 配置'>
                <Textarea
                  value={form.configText}
                  onChange={(event) =>
                    updateForm({ configText: event.target.value })
                  }
                  className='min-h-40 rounded-xl font-mono text-xs'
                />
                {configError ? (
                  <p className='mt-2 text-xs font-bold text-rose-600'>
                    {configError}
                  </p>
                ) : null}
              </Field>
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              className='rounded-full'
              onClick={() => setIsDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              type='button'
              className='rounded-full'
              disabled={!canManage || saveMutation.isPending}
              onClick={handleSave}
            >
              {saveMutation.isPending ? (
                <Loader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <Save className='mr-2 size-4' />
              )}
              保存绑定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={mappingDevice !== null}
        onOpenChange={(open) => {
          if (!open) setMappingDevice(null)
        }}
      >
        <DialogContent className='rounded-[28px]'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base font-black'>
              <UsersRound className='size-4 text-primary' />
              绑定设备员工
            </DialogTitle>
            <DialogDescription>
              {mappingDevice?.name ?? '-'} 的设备工号如何对应系统员工。
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <Field label='设备员工编号'>
              <Input
                value={mappingEmployeeKey}
                onChange={(event) => setMappingEmployeeKey(event.target.value)}
                className='h-11 rounded-2xl'
                placeholder='例如 employeeNo / PIN'
              />
            </Field>
            <Field label='系统员工'>
              <Select
                value={mappingEmployeeId}
                onValueChange={setMappingEmployeeId}
              >
                <SelectTrigger className='h-11 w-full rounded-2xl'>
                  <SelectValue placeholder='选择系统员工' />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} / {employee.staffId || employee.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <p className='text-xs leading-relaxed text-muted-foreground'>
              已有映射会按“设备 + 设备员工编号”更新；事件入库时优先使用手工映射，再尝试按设备配置的系统字段自动匹配。
            </p>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              className='rounded-full'
              onClick={() => setMappingDevice(null)}
            >
              取消
            </Button>
            <Button
              type='button'
              className='rounded-full'
              disabled={
                !canManage ||
                !mappingEmployeeKey.trim() ||
                !mappingEmployeeId ||
                mappingMutation.isPending
              }
              onClick={() => mappingMutation.mutate()}
            >
              {mappingMutation.isPending ? (
                <Loader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <Save className='mr-2 size-4' />
              )}
              保存映射
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className='block space-y-2'>
      <span className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
        {label}
      </span>
      {children}
    </label>
  )
}
