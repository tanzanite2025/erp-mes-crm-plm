import { type TechnicalSpec, type DrillingPlan, type LabelingDraft, type SpokeLength, technicalSpecSchema, drillingPlanSchema, labelingDraftSchema, spokeLengthSchema } from '../data/schema'
import { engineeringSpecService, type EngineeringSpec } from '@/features/engineering/services/engineering-spec-service'

export const engineeringDBService = {
  // Specs (技术规范)
  getSpecs: async (): Promise<TechnicalSpec[]> => {
    try {
      const raw = await engineeringSpecService.getSpecs('TECH_SPEC')
      return raw.map(s => ({
        ...s.specData,
        id: s.id,
        revisionNo: s.revisionNo,
        effectiveFrom: s.effectiveFrom,
        effectiveTo: s.effectiveTo,
        changeType: s.changeType,
        changeOrderNo: s.changeOrderNo,
        siteCode: s.siteCode,
        isDefaultSite: s.isDefaultSite,
        _v: s._v,
        createdAt: s.createdAt || new Date().toISOString()
      })).filter(item => technicalSpecSchema.safeParse(item).success)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to get specs from cloud', e)
      return []
    }
  },

  saveSpec: async (item: TechnicalSpec): Promise<TechnicalSpec> => {
    const generatedCode = `TECH_SPEC_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const safeCode = (item.id || '').trim() || generatedCode
    const spec: EngineeringSpec = {
      id: item.id,
      name: item.name,
      code: safeCode,
      type: 'TECH_SPEC',
      active: true,
      revisionNo: item.revisionNo || item.version || 'V1.0',
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
      changeType: item.changeType,
      changeOrderNo: item.changeOrderNo,
      siteCode: item.siteCode,
      isDefaultSite: item.isDefaultSite,
      specData: item,
      _v: item._v || 1,
    }

    const saved = await engineeringSpecService.saveSpec(spec)
    const normalized: TechnicalSpec = {
      ...(saved.specData || item),
      id: saved.id,
      revisionNo: saved.revisionNo,
      effectiveFrom: saved.effectiveFrom,
      effectiveTo: saved.effectiveTo,
      changeType: saved.changeType,
      changeOrderNo: saved.changeOrderNo,
      siteCode: saved.siteCode,
      isDefaultSite: saved.isDefaultSite,
      _v: saved._v,
      createdAt: saved.createdAt || item.createdAt || new Date().toISOString(),
    }

    return normalized
  },

  deleteSpec: async (id: string): Promise<void> => {
    await engineeringSpecService.deleteSpec(id)
  },

  saveSpecs: async (data: TechnicalSpec[]) => {
    // 兼容旧调用：保留方法签名，但仅保存首条。
    // 新代码请优先使用 saveSpec。
    if (data.length === 0) return;
    await engineeringDBService.saveSpec(data[0]);
  },

  // Drilling (钻孔方案)
  getDrilling: async (): Promise<DrillingPlan[]> => {
    try {
      const raw = await engineeringSpecService.getSpecs('DRILLING_PLAN')
      return raw.map(s => ({
        ...s.drillingData,
        id: s.id,
        createdAt: s.createdAt || new Date().toISOString()
      })).filter(item => drillingPlanSchema.safeParse(item).success)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to get drilling stats from cloud', e)
      return []
    }
  },

  saveDrilling: async (data: DrillingPlan[]) => {
    if (data.length === 0) return;
    const item = data[0];
    const spec: EngineeringSpec = {
      id: item.id,
      name: item.name,
      code: item.id,
      type: 'DRILLING_PLAN',
      active: true,
      drillingData: item,
      _v: 1
    }
    await engineeringSpecService.saveSpec(spec);
  },

  // Labeling (贴标方案)
  getLabeling: async (): Promise<LabelingDraft[]> => {
    try {
      const raw = await engineeringSpecService.getSpecs('LABELING_DRAFT')
      return raw.map(s => ({
        ...s.labelingData,
        id: s.id,
        createdAt: s.createdAt || new Date().toISOString()
      })).filter(item => labelingDraftSchema.safeParse(item).success)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to get labeling stats from cloud', e)
      return []
    }
  },

  saveLabeling: async (data: LabelingDraft[]) => {
    if (data.length === 0) return;
    const item = data[0];
    const spec: EngineeringSpec = {
      id: item.id,
      name: item.name,
      code: item.id,
      type: 'LABELING_DRAFT',
      active: true,
      labelingData: item,
      _v: 1
    }
    await engineeringSpecService.saveSpec(spec);
  },

  // Spoke Length (辐条长度)
  getSpokeLength: async (): Promise<SpokeLength[]> => {
    try {
      const raw = await engineeringSpecService.getSpecs('SPOKE_LENGTH')
      return raw.map(s => ({
        ...s.spokeLengthData,
        id: s.id,
        createdAt: s.createdAt || new Date().toISOString()
      })).filter(item => spokeLengthSchema.safeParse(item).success)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to get spoke length from cloud', e)
      return []
    }
  },

  saveSpokeLength: async (data: SpokeLength[]) => {
    if (data.length === 0) return;
    const item = data[0];
    const spec: EngineeringSpec = {
      id: item.id,
      name: item.name,
      code: item.id,
      type: 'SPOKE_LENGTH',
      active: true,
      spokeLengthData: item,
      _v: 1
    }
    await engineeringSpecService.saveSpec(spec);
  },
  
  // 获取文件 (已迁移云端预览，本地 Blob 仅作兼容检查)
  getFile: async (_id: string): Promise<Blob | null> => {
    // eslint-disable-next-line no-console
    console.warn('[DEPRECATED] getFile now expected to be handled by direct cloud URLs.');
    return null;
  },

  // 辅助方法：解析查看链接（支持本地与远程）
  resolveFileUrl: async (url?: string): Promise<string | null> => {
    if (!url) return null
    
    // 安全加固
    const isSafeProtocol = /^(https?:|blob:)/i.test(url)
    if (!isSafeProtocol) {
      // eslint-disable-next-line no-console
      console.warn(`[Security Alert] Blocked suspicious URL: ${url}`)
      return null
    }

    if (url.startsWith('file-')) {
       // eslint-disable-next-line no-console
       console.warn('[STORAGE_MIGRATED] 本地存储已切断，file- 协议附件需重新上传至云端。');
       return null;
    }
    return url
  },

  // 清空云端数据缓存（非强制物理删除云端数据）
  clearAllData: async () => {
    // eslint-disable-next-line no-console
    console.info('[PERSISTENCE] Data cache cleared. Re-syncing from cloud...');
    window.location.reload()
  }
}
