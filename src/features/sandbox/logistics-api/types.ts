export type LogisticsStatus = 'Enabled' | 'Disabled'

export interface LogisticsProvider {
  id?: number
  createdAt?: string
  updatedAt?: string
  name: string
  code: string
  appKey?: string
  appSecret?: string
  customerId?: string
  checkWord?: string
  endpoint: string
  status: LogisticsStatus
  quotaTotal?: number
  quotaUsed?: number
  quotaAlertAt?: number
}

export interface LogisticsTemplate {
  name: string
  code: string
  endpoint: string
  note: string
}

export const LOGISTICS_TEMPLATES: LogisticsTemplate[] = [
  {
    name: '顺丰速运 (SF Express)',
    code: 'SF',
    endpoint: 'https://bspgw.sf-express.com/std/service',
    note: '顺丰标准网关，适合国内快递直连场景。',
  },
  {
    name: '京东物流 (JD Logistics)',
    code: 'JD',
    endpoint: 'https://api.jd.com/routerjson',
    note: '京东 JOS 统一网关，适合京东物流接口对接。',
  },
  {
    name: '中通快递 (ZTO)',
    code: 'ZTO',
    endpoint: 'https://japi.zto.com',
    note: '中通开放平台网关，适合中通面单与轨迹查询。',
  },
  {
    name: '圆通速递 (YTO)',
    code: 'YTO',
    endpoint: 'http://openapi.yto.net.cn/open/ic/api',
    note: '圆通开放平台接口入口。',
  },
  {
    name: '韵达快递 (YD)',
    code: 'YD',
    endpoint: 'http://openapi.yundasys.com/api',
    note: '韵达开放平台接口入口。',
  },
  {
    name: '极兔速递 (JTSD)',
    code: 'JTSD',
    endpoint: 'https://openapi.jtexpress.com.cn',
    note: '极兔开放平台接口入口。',
  },
  {
    name: '17TRACK International',
    code: '17TRACK',
    endpoint: '',
    note: '建议从 17TRACK API 后台复制实际环境 endpoint 后再保存；适合国际物流聚合查询。',
  },
]
