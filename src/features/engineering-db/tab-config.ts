import type { TabItem } from '@/components/module-tabs'

export const engineeringDbTabs: TabItem[] = [
  { key: 'overview', label: '全量汇总', href: '/engineering-db' },
  { key: 'specs', label: '技术规范', href: '/engineering-db/specs' },
  { key: 'drilling', label: '打孔方案', href: '/engineering-db/drilling' },
  { key: 'engineering-master', label: '工程主数据', href: '/engineering-db/engineering-master' },
  { key: 'labeling', label: '贴标图档', href: '/engineering-db/labeling' },
  { key: 'spoke-length', label: '辐条长度', href: '/engineering-db/spoke-length' },
  { key: 'hubs', label: '花鼓数据库', href: '/engineering-db/hubs' },
  { key: 'nipples', label: '辐条帽数据库', href: '/engineering-db/nipples' },
]
