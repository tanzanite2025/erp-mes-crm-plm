export type LogisticsStatus = 'Enabled' | 'Disabled'
export type LogisticsDirectoryCategory = 'domestic' | 'international'
export type LogisticsCapability =
  | 'tracking'
  | 'callback'
  | 'label'
  | 'order_create'
export type LogisticsVerificationStatus =
  | 'unverified'
  | 'reachable'
  | 'healthy'
  | 'error'
  | 'invalid_config'
  | 'manual_review'
  | 'disabled'

export interface LogisticsProviderCommonFields {
  id?: number
  createdAt?: string
  updatedAt?: string
  name: string
  code: string
  category: LogisticsDirectoryCategory
  website: string
  contact: string
  phone: string
  note: string
  appKey: string
  appSecret: string
  customerId: string
  checkWord: string
  endpoint: string
  status: LogisticsStatus
  capabilities: LogisticsCapability[]
  verificationStatus: LogisticsVerificationStatus
  lastVerifiedAt?: string
  lastVerificationMessage: string
  lastVerificationAction: string
  referenceCount: number
  quotaTotal: number
  quotaUsed: number
  quotaAlertAt: number
}

export type LogisticsProvider = LogisticsProviderCommonFields

export type LogisticsProviderDraft = LogisticsProviderCommonFields

export interface LogisticsProviderDto {
  id?: number
  createdAt?: string
  updatedAt?: string
  name?: string
  code?: string
  category?: LogisticsDirectoryCategory
  website?: string
  contact?: string | null
  phone?: string
  note?: string
  appKey?: string
  appSecret?: string
  customerId?: string
  checkWord?: string
  endpoint?: string
  status?: LogisticsStatus
  capabilities?: string[]
  verificationStatus?: LogisticsVerificationStatus | string
  lastVerifiedAt?: string
  lastVerificationMessage?: string
  lastVerificationAction?: string
  referenceCount?: number
  quotaTotal?: number
  quotaUsed?: number
  quotaAlertAt?: number
}

export interface LogisticsProviderPayload {
  id?: number
  name: string
  code: string
  category: LogisticsDirectoryCategory
  website: string
  contact: string
  phone: string
  note: string
  appKey: string
  appSecret: string
  customerId: string
  checkWord: string
  endpoint: string
  status: LogisticsStatus
  capabilities: LogisticsCapability[]
  quotaAlertAt: number
}

export interface LogisticsTemplate {
  name: string
  code: string
  category: LogisticsDirectoryCategory
  website: string
  contact: string
  phone: string
  endpoint: string
  note: string
  capabilities: LogisticsCapability[]
}

export const LOGISTICS_TEMPLATES: LogisticsTemplate[] = [
  {
    name: '顺丰速运 (SF Express)',
    code: 'SF',
    category: 'domestic',
    website: 'https://www.sf-express.com',
    contact: '大客户对接经理',
    phone: '95338',
    endpoint: 'https://bspgw.sf-express.com/std/service',
    note: '顺丰标准网关，适合国内快递直连场景。',
    capabilities: ['tracking', 'callback', 'label', 'order_create'],
  },
  {
    name: '京东物流 (JD Logistics)',
    code: 'JD',
    category: 'domestic',
    website: 'https://www.jdl.com',
    contact: '企业物流客服',
    phone: '950616',
    endpoint: 'https://api.jd.com/routerjson',
    note: '京东 JOS 统一网关，适合京东物流接口对接。',
    capabilities: ['tracking', 'callback', 'label', 'order_create'],
  },
  {
    name: '中通快递 (ZTO)',
    code: 'ZTO',
    category: 'domestic',
    website: 'https://www.zto.com',
    contact: '',
    phone: '95311',
    endpoint: 'https://japi.zto.com',
    note: '中通开放平台网关，适合中通面单与轨迹查询。',
    capabilities: ['tracking', 'callback', 'label'],
  },
  {
    name: '圆通速递 (YTO)',
    code: 'YTO',
    category: 'domestic',
    website: 'https://www.yto.net.cn',
    contact: '',
    phone: '95554',
    endpoint: 'http://openapi.yto.net.cn/open/ic/api',
    note: '圆通开放平台接口入口。',
    capabilities: ['tracking', 'callback', 'label'],
  },
  {
    name: '韵达快递 (YD)',
    code: 'YD',
    category: 'domestic',
    website: 'https://www.yundaex.com',
    contact: '',
    phone: '95546',
    endpoint: 'http://openapi.yundasys.com/api',
    note: '韵达开放平台接口入口。',
    capabilities: ['tracking', 'callback', 'label'],
  },
  {
    name: '极兔速递 (JTSD)',
    code: 'JTSD',
    category: 'domestic',
    website: 'https://www.jtexpress.com.cn',
    contact: '',
    phone: '956025',
    endpoint: 'https://openapi.jtexpress.com.cn',
    note: '极兔开放平台接口入口。',
    capabilities: ['tracking', 'callback', 'label'],
  },
  {
    name: '17TRACK International',
    code: '17TRACK',
    category: 'international',
    website: 'https://www.17track.net',
    contact: '国际物流平台支持',
    phone: 'N/A',
    endpoint: '',
    note: '建议从 17TRACK API 后台复制实际环境 endpoint 后再保存；适合国际物流聚合查询。',
    capabilities: ['tracking'],
  },
]
