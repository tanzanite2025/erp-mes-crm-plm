import { type Product } from '../data/schema'

export interface ProductOwnerDisplay {
  /** 'INTERNAL' | 'CUSTOMER' */
  ownerType: 'INTERNAL' | 'CUSTOMER'
  /** 用于直接渲染的归属标签：内部 → 内部型号；客户 → 客户名称 */
  label: string
  /** 客户型号但 customer 缺失时为 true（可能是数据漂移或 customer 被删） */
  missingCustomer: boolean
}

interface ResolveOptions {
  internalLabel: string
  unknownCustomerLabel: string
  customerNameMap?: Map<string, string>
}

export function resolveProductOwnerDisplay(
  product: Pick<Product, 'ownerType' | 'ownerCustomerId'>,
  options: ResolveOptions
): ProductOwnerDisplay {
  const ownerType = product.ownerType ?? 'INTERNAL'

  if (ownerType !== 'CUSTOMER') {
    return {
      ownerType: 'INTERNAL',
      label: options.internalLabel,
      missingCustomer: false,
    }
  }

  const customerId = product.ownerCustomerId
  const resolvedName = customerId ? options.customerNameMap?.get(customerId) : undefined

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
