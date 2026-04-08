import { RequirementCoreService } from './requirement-core-service'

/**
 * [DEPRECATED] requirementService
 * 
 * 此服务已根据 [XDFC 架构归一化] 协议废弃。
 * 请按照以下映射进行迁移：
 * - 需求数据拉取 -> RequirementCoreService.getMrpRequirements
 * 
 * @deprecated 严禁在新代码中使用。
 */
export const requirementService = new Proxy(RequirementCoreService as any, {
  get(target, prop) {
    if (prop === 'getMrpRequirements') {
        console.warn(`[DEPRECATED] 调用了旧的 requirementService.getMrpRequirements，请迁移至 RequirementCoreService`);
        return target[prop];
    }
    const errorMsg = `[CRITICAL] 调用了已废弃的 requirementService.${String(prop)}。请立即迁移至 RequirementCoreService。`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
});
