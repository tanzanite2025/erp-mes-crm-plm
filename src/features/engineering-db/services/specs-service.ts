import { type DeltaSet } from '@/lib/delta/types'
import {
  engineeringSpecService,
  type EngineeringSpec,
  type EngineeringSpecInput,
} from '@/features/engineering/services/engineering-spec-service'
import { type TechnicalSpec, technicalSpecSchema } from '../data/schema'

function toTechnicalSpecContract(item: EngineeringSpec): TechnicalSpec {
  const control = item.masterDataControl ?? {}

  return technicalSpecSchema.parse({
    ...item.specData,
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description ?? '',
    active: item.active,
    revisionNo: control.revisionNo,
    effectiveFrom: control.effectiveFrom,
    effectiveTo: control.effectiveTo,
    changeType: control.changeType,
    changeOrderNo: control.changeOrderNo,
    siteCode: control.siteCode,
    isDefaultSite: control.isDefaultSite,
    version: item.version,
    createdAt: item.createdAt || new Date().toISOString(),
  })
}

/**
 * 工程管理技术规范文档主库服务。
 * 所有入口共用主库 HTTP 接口，产品只保存文档 id。
 */
export const SpecsService = {
  /**
   * 获取所有技术规范
   */
  getSpecs: async (): Promise<TechnicalSpec[]> => {
    const raw = await engineeringSpecService.getSpecs('TECH_SPEC')
    return raw.map(toTechnicalSpecContract)
  },

  getSpec: async (id: string): Promise<TechnicalSpec> => {
    const item = await engineeringSpecService.getSpec(id)
    if (item.type !== 'TECH_SPEC') {
      throw new Error('所选文档不属于工程管理技术规范主库')
    }
    return toTechnicalSpecContract(item)
  },

  /**
   * 保存或更新技术规范
   */
  saveSpec: async (item: TechnicalSpec): Promise<TechnicalSpec> => {
    const document = technicalSpecSchema.parse(item)
    // [BACKEND-AUTHORITY]: 业务编码严禁在前端使用 Date.now() / Math.random() 模拟生成的伪 ID。
    // 编码应当由后端发号器在事务执行时分配。
    const spec: EngineeringSpecInput = {
      id: document.id,
      name: document.name,
      code: document.code,
      description: document.description,
      type: 'TECH_SPEC',
      active: document.active ?? true,
      revisionNo: document.revisionNo || 'V1.0',
      effectiveFrom: document.effectiveFrom,
      effectiveTo: document.effectiveTo,
      changeType: document.changeType,
      changeOrderNo: document.changeOrderNo,
      siteCode: document.siteCode,
      isDefaultSite: document.isDefaultSite,
      specData: {
        category: document.category,
        fileUrl: document.fileUrl,
        fileExtension: document.fileExtension,
      },
      version: document.version || 1,
    }

    const saved = await engineeringSpecService.saveSpec(spec)
    return toTechnicalSpecContract(saved)
  },

  /**
   * 局部更新技术规范 (SDRTS Delta Protocol)
   */
  patchSpec: async (id: string, delta: DeltaSet, version: number) => {
    const mappedDelta: DeltaSet = {}
    Object.entries(delta).forEach(([path, value]) => {
      if (path === 'name') {
        mappedDelta.name = value
        mappedDelta['specData.name'] = value
        return
      }

      if (path === 'description') {
        mappedDelta.description = value
        mappedDelta['specData.description'] = value
        return
      }

      if (
        path === 'revisionNo' ||
        path === 'effectiveFrom' ||
        path === 'effectiveTo' ||
        path === 'changeType' ||
        path === 'changeOrderNo' ||
        path === 'siteCode' ||
        path === 'isDefaultSite'
      ) {
        mappedDelta[path] = value
        return
      }

      if (['id', 'code', 'active', 'version', 'createdAt'].includes(path)) {
        return
      }

      mappedDelta[`specData.${path}`] = value
    })

    const saved = await engineeringSpecService.patchSpec(
      id,
      mappedDelta,
      version
    )
    return toTechnicalSpecContract(saved)
  },

  /**
   * 删除技术规范
   */
  deleteSpec: async (id: string): Promise<void> => {
    await engineeringSpecService.deleteSpec(id)
  },
}
