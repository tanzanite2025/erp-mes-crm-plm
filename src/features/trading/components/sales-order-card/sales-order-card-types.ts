import type { ReactNode } from 'react'
import type { SalesOrder } from '../../data/schema'

export type SalesOrderCardSection = 'primary' | 'canceled'

export interface SalesOrderCardContext {
  section: SalesOrderCardSection
  readonly: boolean
}

export interface SalesOrderFeatureCardDescriptor {
  id: string
  priority: number
  visible?: boolean
  render: () => ReactNode
}

export type SalesOrderFeatureCardFactory = (
  order: SalesOrder,
  context: SalesOrderCardContext
) => SalesOrderFeatureCardDescriptor[]
