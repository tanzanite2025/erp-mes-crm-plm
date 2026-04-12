import { type TechnicalSpec, technicalSpecSchema } from '../data/schema'
import { engineeringSpecService, type EngineeringSpec } from '@/features/engineering/services/engineering-spec-service'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { failLoudly } from '@/lib/safe-catch'

function toTechnicalSpecContract(item: EngineeringSpec): TechnicalSpec {
  return technicalSpecSchema.parse({
    ...item.specData,
    id: item.id,
    revisionNo: item.revisionNo,
    effectiveFrom: item.effectiveFrom,
    effectiveTo: item.effectiveTo,
    changeType: item.changeType,
    changeOrderNo: item.changeOrderNo,
    siteCode: item.siteCode,
    isDefaultSite: item.isDefaultSite,
    version: item._v,
    createdAt: item.createdAt || new Date().toISOString(),
  })
}

/**
 * 物料规格服务 (Specs Service)
 * 职责: 管理物料技术规范、版本修订及 SDRTS 差量更新。
 */
export const SpecsService = {
  /**
   * 获取所有技术规范
   */
  getSpecs: async (): Promise<TechnicalSpec[]> => {
    try {
      const raw = await engineeringSpecService.getSpecs('TECH_SPEC')
      return raw.map(toTechnicalSpecContract)
    } catch (e) {
      failLoudly(e, 'SpecsService.getSpecs')
      return []
    }
  },

  /**
   * 保存或更新技术规范
   */
  saveSpec: async (item: TechnicalSpec): Promise<TechnicalSpec> => {
    // [BACKEND-AUTHORITY]: 业务编码严禁在前端使用 Date.now() / Math.random() 模拟生成的伪 ID。
    // 编码应当由后端发号器在事务执行时分配。
    const safeCode = (item.id || '').trim()
    
    const spec: EngineeringSpec = {
      id: item.id,
      name: item.name,
      code: safeCode,
      type: 'TECH_SPEC',
      active: true,
      revisionNo: item.revisionNo || 'V1.0',
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
      changeType: item.changeType,
      changeOrderNo: item.changeOrderNo,
      siteCode: item.siteCode,
      isDefaultSite: item.isDefaultSite,
      specData: item,
      _v: item.version || 1,
    }

    const saved = await engineeringSpecService.saveSpec(spec)

    return technicalSpecSchema.parse({
      ...(saved.specData || item),
      id: saved.id,
      revisionNo: saved.revisionNo,
      effectiveFrom: saved.effectiveFrom,
      effectiveTo: saved.effectiveTo,
      changeType: saved.changeType,
      changeOrderNo: saved.changeOrderNo,
      siteCode: saved.siteCode,
      isDefaultSite: saved.isDefaultSite,
      version: saved._v,
      createdAt: saved.createdAt || item.createdAt || new Date().toISOString(),
    })
  },

  /**
   * 局部更新技术规范 (SDRTS Delta Protocol)
   * 事务意图: SPEC_DOCUMENT_UPDATE
   */
  patchSpec: async (id: string, delta: DeltaSet, version: number) => {
    const mappedDelta: DeltaSet = {}
    Object.entries(delta).forEach(([path, value]) => {
      mappedDelta[`specData.${path}`] = value
    })

    const payload: DeltaPayload = {
      op: 'PATCH',
      delta: mappedDelta,
      metadata: {
        id,
        version,
        intent: 'SPEC_DOCUMENT_UPDATE'
      }
    }

    await engineeringSpecService.patchSpec(id, payload.delta, version)
  },

  /**
   * 删除技术规范
   */
  deleteSpec: async (id: string): Promise<void> => {
    await engineeringSpecService.deleteSpec(id)
  }
}
