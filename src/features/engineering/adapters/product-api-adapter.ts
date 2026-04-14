import { buildFlattenDelta } from '@/lib/delta/flatten-delta'
import { type DeltaSet } from '@/lib/delta/types'
import { createLogger } from '@/lib/logger'
import { barcodeConfigSchema, productSchema, type Product, type ProductAttributeValue } from '../data/schema'
import {
  type BulkSyncProductsApiDTO,
  type ProductApiDTO,
  type ProductAttributeValueApiDTO,
  type ProductListPageApiDTO,
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

const logger = createLogger('ProductApiAdapter')

function toProductAttributeValueContract(dto: ProductAttributeValueApiDTO): ProductAttributeValue {
  return {
    id: dto.id,
    productId: dto.productId,
    categoryKey: dto.categoryKey,
    optionValue: normalizeProductAttributeMachineValue(dto.optionValue),
    sortOrder: dto.sortOrder ?? 0,
    version: dto.version ?? 1,
  }
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

function toAttachmentArray(value: unknown): Product['attachments'] {
  return Array.isArray(value) ? (value as Product['attachments']) : []
}

function toBarcodeConfig(value: unknown): Product['barcodeConfig'] {
  const parsed = barcodeConfigSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

function buildProductCandidate(dto: ProductApiDTO) {
  return {
    id: dto.id,
    sku: normalizeProductSkuValue(dto.sku),
    name: dto.name,
    modelCode: normalizeProductModelCodeValue(dto.modelCode),
    typeId: dto.typeId,
    depth: dto.depth,
    widthInternal: dto.widthInternal,
    widthExternal: dto.widthExternal,
    weight: dto.weight,
    length: dto.length,
    angle: dto.angle,
    clamp: dto.clamp,
    offset: dto.offset,
    axleCrown: dto.axleCrown,
    steerer: dto.steerer,
    image: dto.image,
    restrictions: dto.restrictions ?? [],
    moldGroup: dto.moldGroup,
    description: dto.description,
    engineeringSpecId: dto.engineeringSpecId,
    attributeValues: (dto.attributeValues ?? []).map(toProductAttributeValueContract),
    techSpecs: dto.techSpecs,
    barcodeConfig: toBarcodeConfig(dto.barcodeConfig),
    attachments: toAttachmentArray(dto.attachments),
    status: dto.status ?? 'Active',
    templateKey: normalizeProductTemplateKeyValue(dto.templateKey),
    resolvedTemplateId: dto.resolvedTemplateId?.trim() || undefined,
    resolvedTemplateKey: normalizeProductTemplateKeyValue(dto.resolvedTemplateKey),
    templateResolutionSource: dto.templateResolutionSource?.trim() || undefined,
    templateResolutionError: dto.templateResolutionError?.trim() || undefined,
    createdAt: dto.createdAt ?? '',
    version: dto._v ?? 1,
    revisionNo: normalizeEngineeringRevisionNo(dto.revisionNo),
    effectiveFrom: dto.effectiveFrom ?? undefined,
    effectiveTo: dto.effectiveTo ?? undefined,
    changeType: dto.changeType,
    changeOrderNo: normalizeEngineeringChangeOrderNo(dto.changeOrderNo),
    siteCode: normalizeEngineeringSiteCode(dto.siteCode),
    isDefaultSite: dto.isDefaultSite,
  }
}

export function toProductContract(dto: ProductApiDTO): Product {
  return productSchema.parse(buildProductCandidate(dto))
}

export function toProductArrayContract(items: ProductApiDTO[]): Product[] {
  return items.map(toProductContract)
}

export function toProductOptionsArrayContract(items: ProductApiDTO[]): Product[] {
  const validProducts: Product[] = []
  let skipped = 0

  items.forEach((item, index) => {
    const candidate = buildProductCandidate(item)
    const parsed = productSchema.safeParse(candidate)
    if (parsed.success) {
      validProducts.push(parsed.data)
      return
    }

    skipped += 1
    logger.warn('Skipped invalid product option during contract mapping', {
      index,
      id: item.id,
      name: item.name,
      rawSku: item.sku,
      normalizedSku: candidate.sku,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
        message: issue.message,
      })),
    })
  })

  if (skipped > 0) {
    logger.warn('Product options contract mapping completed with skipped entries', {
      received: items.length,
      returned: validProducts.length,
      skipped,
    })
  }

  return validProducts
}

export function toProductListContract(dto: ProductListPageApiDTO): Product[] {
  return toProductArrayContract(dto.items)
}

export function toProductApiDTO(product: SaveProductInput): ProductApiDTO {
  const normalizedProduct = normalizeSaveProductInput(product)
  return {
    id: normalizedProduct.id || '',
    sku: normalizeProductSkuValue(normalizedProduct.sku),
    name: normalizedProduct.name || '',
    modelCode: normalizeProductModelCodeValue(normalizedProduct.modelCode),
    typeId: normalizedProduct.typeId || '',
    depth: normalizedProduct.depth,
    widthInternal: normalizedProduct.widthInternal,
    widthExternal: normalizedProduct.widthExternal,
    weight: normalizedProduct.weight,
    length: normalizedProduct.length,
    angle: normalizedProduct.angle,
    clamp: normalizedProduct.clamp,
    offset: normalizedProduct.offset,
    axleCrown: normalizedProduct.axleCrown,
    steerer: normalizedProduct.steerer,
    image: normalizedProduct.image,
    restrictions: normalizedProduct.restrictions ?? [],
    moldGroup: normalizedProduct.moldGroup,
    description: normalizedProduct.description,
    engineeringSpecId: normalizedProduct.engineeringSpecId || '',
    attributeValues: (normalizedProduct.attributeValues ?? []).map(toProductAttributeValueApiDTO),
    techSpecs: normalizedProduct.techSpecs,
    barcodeConfig: normalizedProduct.barcodeConfig,
    attachments: normalizedProduct.attachments ?? [],
    status: normalizedProduct.status ?? 'Active',
    templateKey: normalizeProductTemplateKeyValue(normalizedProduct.templateKey),
    revisionNo: normalizeEngineeringRevisionNo(normalizedProduct.revisionNo),
    effectiveFrom: normalizedProduct.effectiveFrom ?? null,
    effectiveTo: normalizedProduct.effectiveTo ?? null,
    changeType: normalizedProduct.changeType,
    changeOrderNo: normalizeEngineeringChangeOrderNo(normalizedProduct.changeOrderNo),
    siteCode: normalizeEngineeringSiteCode(normalizedProduct.siteCode),
    isDefaultSite: normalizedProduct.isDefaultSite,
    createdAt: normalizedProduct.createdAt,
    _v: normalizedProduct.version ?? 1,
  }
}

const PRODUCT_PATCH_FIELDS: Array<keyof ProductApiDTO> = [
  'sku',
  'name',
  'modelCode',
  'typeId',
  'depth',
  'widthInternal',
  'widthExternal',
  'weight',
  'length',
  'angle',
  'clamp',
  'offset',
  'axleCrown',
  'steerer',
  'image',
  'restrictions',
  'moldGroup',
  'description',
  'engineeringSpecId',
  'attributeValues',
  'techSpecs',
  'barcodeConfig',
  'attachments',
  'status',
  'templateKey',
  'revisionNo',
  'effectiveFrom',
  'effectiveTo',
  'changeType',
  'changeOrderNo',
  'siteCode',
  'isDefaultSite',
]

export function buildProductDelta(current: Product, next: SaveProductInput): DeltaSet {
  const delta: DeltaSet = {}
  const currentDto = toProductApiDTO(current)
  const nextDto = toProductApiDTO(next)

  for (const field of PRODUCT_PATCH_FIELDS) {
    const fieldDelta = buildFlattenDelta(currentDto[field], nextDto[field], { basePath: String(field) })
    Object.assign(delta, fieldDelta)
  }

  return delta
}

export function toBulkSyncProductsApiDTO(products: SaveProductInput[]): BulkSyncProductsApiDTO {
  return {
    products: products.map(toProductApiDTO),
  }
}
