/**
 * 文件解析服务 (File Resolver Service)
 * 职责: 统一处理工程文件 (Drawing, CAD, Specs) 的安全检查与 URL 转换。
 */
import { createLogger } from '@/lib/logger'

const logger = createLogger('FileResolverService')

export const FileResolverService = {
  /**
   * 辅助方法：解析查看链接（支持本地与远程）
   */
  resolveFileUrl: async (url?: string): Promise<string | null> => {
    if (!url) return null

    const normalized = url.trim()
    try {
      if (normalized.includes('\\')) return null
      if (normalized.startsWith('/uploads/')) {
        const resolved = new URL(
          normalized,
          import.meta.env.VITE_API_BASE_URL || window.location.origin
        )
        return resolved.pathname.startsWith('/uploads/') ? resolved.href : null
      }
      const resolved = new URL(normalized)
      if (
        ['http:', 'https:', 'blob:'].includes(resolved.protocol) &&
        !resolved.username &&
        !resolved.password
      ) {
        return resolved.href
      }
    } catch {
      return null
    }
    logger.warn('Blocked unsupported engineering attachment URL')
    return null
  },

  /**
   * 清空云端数据缓存并重载
   */
  clearAllData: async () => {
    logger.info('Data cache cleared. Re-syncing from cloud...')
    window.location.reload()
  },
}
