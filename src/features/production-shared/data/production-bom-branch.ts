export interface ProductionBOMBranch {
  productId: string
  productSKU: string
  productName: string
  productTypeName?: string
  bomOwnerType: 'INTERNAL' | 'CUSTOMER'
  bomOwnerCustomerId: string
  bomOwnerCustomerName: string
  bomVersionLevel: string
}

export function getProductionBOMBranchIdentityKey(branch: {
  productId?: string
  bomOwnerType?: string
  bomOwnerCustomerId?: string
  bomVersionLevel?: string
}): string {
  const productId = branch.productId?.trim() ?? ''
  const ownerType = branch.bomOwnerType?.trim().toUpperCase() ?? ''
  const ownerCustomerId = branch.bomOwnerCustomerId?.trim() ?? ''
  if (
    !productId ||
    (ownerType !== 'INTERNAL' && ownerType !== 'CUSTOMER') ||
    (ownerType === 'INTERNAL' && ownerCustomerId !== '') ||
    (ownerType === 'CUSTOMER' && ownerCustomerId === '')
  ) {
    return ''
  }

  return JSON.stringify([
    productId,
    ownerType,
    ownerCustomerId,
    branch.bomVersionLevel?.trim() ?? '',
  ])
}

export function getProductionBOMBranchDisplayName(
  branch: ProductionBOMBranch
): string {
  const productLabel = [branch.productSKU, branch.productName]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' · ')
  const versionLabel = branch.bomVersionLevel || '未指定性能版本'
  const ownerLabel =
    branch.bomOwnerType === 'CUSTOMER'
      ? `客户 · ${branch.bomOwnerCustomerName || branch.bomOwnerCustomerId}`
      : '内部'
  const productTypeLabel = branch.productTypeName?.trim()
    ? `分类 · ${branch.productTypeName.trim()}`
    : ''

  return [productTypeLabel, productLabel, versionLabel, ownerLabel]
    .filter(Boolean)
    .join(' · ')
}
