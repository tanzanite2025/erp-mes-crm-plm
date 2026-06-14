import { type BOM } from '../data/schema'

export interface BOMOwnerDisplay {
  /** 'INTERNAL' | 'CUSTOMER' */
  ownerType: 'INTERNAL' | 'CUSTOMER'
  /** 用于直接渲染的归属标签：内部 → 内部 BOM；客户 → 客户名称 */
  label: string
  /** 客户 BOM 但 customer 缺失时为 true（可能是数据漂移或 customer 被删） */
  missingCustomer: boolean
}

interface ResolveOptions {
  internalLabel: string
  unknownCustomerLabel: string
  customerNameMap?: Map<string, string>
}

/**
 * 方案 B + 1:1：归属语义在 BOM 维度。
 *
 * 同一产品的不同 BOM 可服务不同对象（内部 / 客户A / 客户B），归属是
 * BOM 的固有属性。Product 不再持有归属字段，所有归属解析必须基于 BOM。
 */
export function resolveBOMOwnerDisplay(
  bom: Pick<BOM, 'ownerType' | 'ownerCustomerId'>,
  options: ResolveOptions
): BOMOwnerDisplay {
  const ownerType = bom.ownerType ?? 'INTERNAL'

  if (ownerType !== 'CUSTOMER') {
    return {
      ownerType: 'INTERNAL',
      label: options.internalLabel,
      missingCustomer: false,
    }
  }

  const customerId = bom.ownerCustomerId
  const resolvedName = customerId
    ? options.customerNameMap?.get(customerId)
    : undefined

  if (resolvedName && resolvedName.trim()) {
    return {
      ownerType: 'CUSTOMER',
      label: resolvedName,
      missingCustomer: false,
    }
  }

  return {
    ownerType: 'CUSTOMER',
    label: options.unknownCustomerLabel,
    missingCustomer: true,
  }
}
