/**
 * 定义全局错误动作映射
 * 键：后端返回的原始英文错误字符串
 */
import { type TranslationKey } from '@/locales'

export interface ErrorActionMetadata {
  /** 映射的翻译 Key (用于显示提示消息) */
  messageKey: TranslationKey
  /** 操作按钮的翻译 Key (如果不提供，则只显示普通报错) */
  actionLabelKey?: TranslationKey
  /** 点击按钮后跳转的目标路由 */
  target?: string
}

export const ERROR_ACTION_REGISTRY: Record<string, ErrorActionMetadata> = {
  // 组织架构模块
  'Cannot delete organization with active employees': {
    messageKey: 'orgPersonnel.org.backendErrors.hasEmployees',
    actionLabelKey: 'orgPersonnel.org.goToPersonnel',
    target: '/personnel/employees',
  },
  'Cannot delete organization with child departments': {
    messageKey: 'orgPersonnel.org.backendErrors.hasChildren',
    // 暂不配置跳转，仅作翻译
  },
  'Organization name already exists under the same parent': {
    messageKey: 'orgPersonnel.org.backendErrors.nameConflict',
  },
  'Failed to fetch organization tree': {
    messageKey: 'orgPersonnel.org.backendErrors.fetchTreeFailed',
  },
  'Failed to save organization': {
    messageKey: 'orgPersonnel.org.backendErrors.saveFailed',
  },
  'Invalid organization payload': {
    messageKey: 'orgPersonnel.org.backendErrors.invalidPayload',
  },
  'Organization name is required': {
    messageKey: 'orgPersonnel.org.dialog.nameRequired',
  },
  'Organization parent does not exist': {
    messageKey: 'orgPersonnel.org.backendErrors.parentNotFound',
  },
  'Organization hierarchy is invalid for the selected parent': {
    messageKey: 'orgPersonnel.org.backendErrors.hierarchyInvalid',
  },
  'Organization depth exceeds the supported three levels': {
    messageKey: 'orgPersonnel.org.backendErrors.depthExceeded',
  },
  'Organization linked architecture is invalid': {
    messageKey: 'orgPersonnel.org.backendErrors.linkedArchitectureInvalid',
  },
}
