import { type Product, type ProductAttributeValue } from '../data/schema'
import {
  type ProductApiDTO,
  type ProductAttributeValueApiDTO,
} from '../contracts/product-api-dto'
import { type SaveProductInput } from '../mutation-types'
import {
  normalizeEngineeringChangeOrderNo,
  normalizeEngineeringRevisionNo,
  normalizeEngineeringSiteCode,
  normalizeProductModelCodeValue,
  normalizeProductSkuValue,
  normalizeProductTemplateKeyValue,
  normalizeSaveProductInput,
} from '../utils/product-code-normalization'
import { normalizeProductAttributeMachineValue } from '../utils/product-attribute-machine-value'

type ProductWriteCandidate = Omit<ProductApiDTO, 'version'> & {
  version: number
}

function toProductAttributeValueApiDTO(item: ProductAttributeValue): ProductAttributeValueApiDTO {
  return {
    id: item.id,
    productId: item.productId,
    categoryKey: item.categoryKey,
    optionValue: normalizeProductAttributeMachineValue(item.optionValue),
    sortOrder: item.sortOrder ?? 0,
    version: item.version ?? 1,
  }
}

export function buildProductWriteCandidate(product: SaveProductInput | Product): ProductWriteCandidate {
  const normalizedProduct = normalizeSaveProductInput(product)
  if (!normalizedProduct.restrictions) throw new Error('[CRITICAL] restrictions missing during save')
  if (!normalizedProduct.attributeValues) throw new Error('[CRITICAL] attributeValues missing during save')
  if (!normalizedProduct.attachments) throw new Error('[CRITICAL] attachments missing during save')

  return {
    id: normalizedProduct.id || '',
    sku: normalizeProductSkuValue(normalizedProduct.sku),
    name: normalizedProduct.name || '',
    modelCode: normalizeProductModelCodeValue(normalizedProduct.modelCode),
    typeId: normalizedProduct.typeId || '',
    depth: normalizedProduct.depth,
    widthInternal: normalizedProduct.widthInternal,
    widthExternal: normalizedProduct.widthExternal,
    maxTirePressure: normalizedProduct.maxTirePressure,
    length: normalizedProduct.length,
    angle: normalizedProduct.angle,
    clamp: normalizedProduct.clamp,
    offset: normalizedProduct.offset,
    axleCrown: normalizedProduct.axleCrown,
    steerer: normalizedProduct.steerer,
    image: normalizedProduct.image,
    restrictions: normalizedProduct.restrictions,
    moldGroup: normalizedProduct.moldGroup,
    description: normalizedProduct.description,
    engineeringSpecId: normalizedProduct.engineeringSpecId || '',
    attributeValues: normalizedProduct.attributeValues.map(toProductAttributeValueApiDTO),
    techSpecs: normalizedProduct.techSpecs,
    barcodeConfig: normalizedProduct.barcodeConfig,
    attachments: normalizedProduct.attachments,
    status: normalizedProduct.status ?? 'Active',
    ownerType: normalizedProduct.ownerType ?? 'INTERNAL',
    ownerCustomerId: normalizedProduct.ownerCustomerId,
    revisionNo: normalizeEngineeringRevisionNo(normalizedProduct.masterDataControl?.revisionNo),
    effectiveFrom: normalizedProduct.masterDataControl?.effectiveFrom ?? null,
    effectiveTo: normalizedProduct.masterDataControl?.effectiveTo ?? null,
    changeType: normalizedProduct.masterDataControl?.changeType,
    changeOrderNo: normalizeEngineeringChangeOrderNo(normalizedProduct.masterDataControl?.changeOrderNo),
    siteCode: normalizeEngineeringSiteCode(normalizedProduct.masterDataControl?.siteCode),
    isDefaultSite: normalizedProduct.masterDataControl?.isDefaultSite,
    createdAt: normalizedProduct.createdAt,
    version: normalizedProduct.version ?? 1,
  }
}

function toProductApiWriteDTO(candidate: ProductWriteCandidate): ProductApiDTO {
  return candidate as ProductApiDTO
}

export function toProductApiDTO(product: SaveProductInput): ProductApiDTO {
  return toProductApiWriteDTO({
    ...buildProductWriteCandidate(product),
    templateKey: normalizeProductTemplateKeyValue(product.templateKey),
  })
}

export function toProductWriteApiDTO(product: SaveProductInput | Product): ProductApiDTO {
  return toProductApiWriteDTO(buildProductWriteCandidate(product))
}
