import { buildFlattenDelta } from '@/lib/delta/flatten-delta'
import { type DeltaSet } from '@/lib/delta/types'
import { createLogger } from '@/lib/logger'
import { barcodeConfigSchema, productSchema, type Product, type ProductAttributeValue } from '../data/schema'
import {
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

function buildProductCandidate(
  dto: ProductApiDTO,
  options?: {
    allowMissingCollections?: boolean
  }
) {
  const allowMissingCollections = options?.allowMissingCollections ?? false
  const restrictions = dto.restrictions ?? (allowMissingCollections ? [] : undefined)
  const attributeValues = dto.attributeValues ?? (allowMissingCollections ? [] : undefined)

  if (!restrictions) throw new Error('[CRITICAL] Missing restrictions array in Product DTO')
  if (!attributeValues) throw new Error('[CRITICAL] Missing attributeValues array in Product DTO')

  return {
    id: dto.id,
    sku: normalizeProductSkuValue(dto.sku),
    name: dto.name,
    modelCode: normalizeProductModelCodeValue(dto.modelCode),
    typeId: dto.typeId,
    depth: dto.depth,
    widthInternal: dto.widthInternal,
    widthExternal: dto.widthExternal,
    maxTirePressure: dto.maxTirePressure,
    weight: dto.weight,
    length: dto.length,
    angle: dto.angle,
    clamp: dto.clamp,
    offset: dto.offset,
    axleCrown: dto.axleCrown,
    steerer: dto.steerer,
    image: dto.image,
    restrictions,
    moldGroup: dto.moldGroup,
    description: dto.description,
    engineeringSpecId: dto.engineeringSpecId,
    attributeValues: attributeValues.map(toProductAttributeValueContract),
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
    version: dto.version ?? 1,
    // MasterDataControl 嵌套命名空间
    masterDataControl: {
      revisionNo: normalizeEngineeringRevisionNo(dto.masterDataControl?.revisionNo ?? dto.revisionNo),
      effectiveFrom: dto.masterDataControl?.effectiveFrom ?? dto.effectiveFrom ?? undefined,
      effectiveTo: dto.masterDataControl?.effectiveTo ?? dto.effectiveTo ?? undefined,
      changeType: dto.masterDataControl?.changeType ?? dto.changeType,
      changeOrderNo: normalizeEngineeringChangeOrderNo(dto.masterDataControl?.changeOrderNo ?? dto.changeOrderNo),
      siteCode: normalizeEngineeringSiteCode(dto.masterDataControl?.siteCode ?? dto.siteCode),
      isDefaultSite: dto.masterDataControl?.isDefaultSite ?? dto.isDefaultSite,
    },
  }
}

type ProductWriteCandidate = Omit<ProductApiDTO, 'version'> & {
  version: number
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
    const missingCollections = [
      !item.restrictions ? 'restrictions' : null,
      !item.attributeValues ? 'attributeValues' : null,
    ].filter(Boolean)

    if (missingCollections.length > 0) {
      logger.warn('Normalized missing product option collections during contract mapping', {
        index,
        id: item.id,
        name: item.name,
        missingCollections,
      })
    }

    const candidate = buildProductCandidate(item, { allowMissingCollections: true })
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

function buildProductWriteCandidate(product: SaveProductInput | Product): ProductWriteCandidate {
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
    weight: normalizedProduct.weight,
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

const PRODUCT_PATCH_FIELDS: Array<keyof ProductApiDTO> = [
  'sku',
  'name',
  'modelCode',
  'typeId',
  'depth',
  'widthInternal',
  'widthExternal',
  'maxTirePressure',
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
  'revisionNo',
  'effectiveFrom',
  'effectiveTo',
  'changeType',
  'changeOrderNo',
  'siteCode',
  'isDefaultSite',
]

const PRODUCT_STRUCTURED_PATCH_FIELDS = new Set<keyof ProductApiDTO>([
  'restrictions',
  'attributeValues',
  'techSpecs',
  'barcodeConfig',
  'attachments',
])

function normalizeStructuredPatchValue(value: unknown) {
  return value === undefined ? null : value
}

function areStructuredPatchValuesEqual(currentValue: unknown, nextValue: unknown): boolean {
  if (currentValue === nextValue) return true
  if (currentValue === null || nextValue === null) return currentValue === nextValue
  if (typeof currentValue !== typeof nextValue) return false

  try {
    return JSON.stringify(currentValue) === JSON.stringify(nextValue)
  } catch {
    return false
  }
}

function buildStructuredFieldDelta(
  field: keyof ProductApiDTO,
  currentValue: unknown,
  nextValue: unknown
): DeltaSet {
  const normalizedCurrentValue = normalizeStructuredPatchValue(currentValue)
  const normalizedNextValue = normalizeStructuredPatchValue(nextValue)

  if (areStructuredPatchValuesEqual(normalizedCurrentValue, normalizedNextValue)) {
    return {}
  }

  return {
    [String(field)]: {
      o: normalizedCurrentValue,
      n: normalizedNextValue,
    },
  }
}

export function buildProductDelta(current: Product, next: SaveProductInput): DeltaSet {
  const delta: DeltaSet = {}
  const currentDto = toProductWriteApiDTO(current)
  const nextDto = toProductWriteApiDTO(next)

  for (const field of PRODUCT_PATCH_FIELDS) {
    const fieldDelta = PRODUCT_STRUCTURED_PATCH_FIELDS.has(field)
      ? buildStructuredFieldDelta(field, currentDto[field], nextDto[field])
      : buildFlattenDelta(currentDto[field], nextDto[field], { basePath: String(field) })
    Object.assign(delta, fieldDelta)
  }

  return delta
}
