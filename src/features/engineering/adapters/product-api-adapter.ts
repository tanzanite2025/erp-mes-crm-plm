import { buildFlattenDelta } from '@/lib/delta/flatten-delta'
import { type DeltaSet } from '@/lib/delta/types'
import { normalizeChangeOrderNo, normalizeModelCode, normalizeRevisionNo, normalizeSiteCode, normalizeSku, normalizeTemplateKey } from '@/lib/codecs/code-normalization'
import { barcodeConfigSchema, type Product, type ProductAttributeValue } from '../data/schema'
import {
  type BulkSyncProductsApiDTO,
  type ProductApiDTO,
  type ProductAttributeValueApiDTO,
  type ProductListPageApiDTO,
} from '../contracts/product-api-dto'
import { type SaveProductInput } from '../mutation-types'

function toProductAttributeValueContract(dto: ProductAttributeValueApiDTO): ProductAttributeValue {
  return {
    id: dto.id,
    productId: dto.productId,
    categoryKey: dto.categoryKey,
    optionValue: dto.optionValue,
    sortOrder: dto.sortOrder ?? 0,
    version: dto.version ?? 1,
  }
}

function toProductAttributeValueApiDTO(item: ProductAttributeValue): ProductAttributeValueApiDTO {
  return {
    id: item.id,
    productId: item.productId,
    categoryKey: item.categoryKey,
    optionValue: item.optionValue,
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

export function toProductContract(dto: ProductApiDTO): Product {
  return {
    id: dto.id,
    sku: normalizeSku(dto.sku),
    name: dto.name,
    modelCode: normalizeModelCode(dto.modelCode),
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
    templateKey: normalizeTemplateKey(dto.templateKey),
    createdAt: dto.createdAt ?? '',
    version: dto._v ?? 1,
    revisionNo: normalizeRevisionNo(dto.revisionNo),
    effectiveFrom: dto.effectiveFrom ?? undefined,
    effectiveTo: dto.effectiveTo ?? undefined,
    changeType: dto.changeType,
    changeOrderNo: normalizeChangeOrderNo(dto.changeOrderNo),
    siteCode: normalizeSiteCode(dto.siteCode),
    isDefaultSite: dto.isDefaultSite,
  }
}

export function toProductArrayContract(items: ProductApiDTO[]): Product[] {
  return items.map(toProductContract)
}

export function toProductListContract(dto: ProductListPageApiDTO): Product[] {
  return toProductArrayContract(dto.items)
}

export function toProductApiDTO(product: SaveProductInput): ProductApiDTO {
  return {
    id: product.id || '',
    sku: normalizeSku(product.sku),
    name: product.name || '',
    modelCode: normalizeModelCode(product.modelCode),
    typeId: product.typeId || '',
    depth: product.depth,
    widthInternal: product.widthInternal,
    widthExternal: product.widthExternal,
    weight: product.weight,
    length: product.length,
    angle: product.angle,
    clamp: product.clamp,
    offset: product.offset,
    axleCrown: product.axleCrown,
    steerer: product.steerer,
    image: product.image,
    restrictions: product.restrictions ?? [],
    moldGroup: product.moldGroup,
    description: product.description,
    engineeringSpecId: product.engineeringSpecId || '',
    attributeValues: (product.attributeValues ?? []).map(toProductAttributeValueApiDTO),
    techSpecs: product.techSpecs,
    barcodeConfig: product.barcodeConfig,
    attachments: product.attachments ?? [],
    status: product.status ?? 'Active',
    templateKey: normalizeTemplateKey(product.templateKey),
    revisionNo: normalizeRevisionNo(product.revisionNo),
    effectiveFrom: product.effectiveFrom ?? null,
    effectiveTo: product.effectiveTo ?? null,
    changeType: product.changeType,
    changeOrderNo: normalizeChangeOrderNo(product.changeOrderNo),
    siteCode: normalizeSiteCode(product.siteCode),
    isDefaultSite: product.isDefaultSite,
    createdAt: product.createdAt,
    _v: product.version ?? 1,
  }
}

const PRODUCT_PATCH_FIELDS: Array<keyof SaveProductInput> = [
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
  'createdAt',
  'version',
]

export function buildProductDelta(next: SaveProductInput): DeltaSet {
  const delta: DeltaSet = {}

  for (const field of PRODUCT_PATCH_FIELDS) {
    if (!(field in next)) {
      continue
    }
    const fieldDelta = buildFlattenDelta(undefined, next[field], { basePath: String(field) })
    Object.assign(delta, fieldDelta)
  }

  return delta
}

export function toBulkSyncProductsApiDTO(products: Product[]): BulkSyncProductsApiDTO {
  return {
    products: products.map(toProductApiDTO),
  }
}
