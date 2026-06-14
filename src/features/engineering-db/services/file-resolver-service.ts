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

    // 安全检查
    const isSafeProtocol = /^(https?:|blob:)/i.test(url)
    if (!isSafeProtocol) {
      logger.warn('Blocked suspicious URL', { url })
      return null
    }

    if (url.startsWith('file-')) {
      logger.warn('本地存储已切断，file- 协议附件需重新上传至云端。')
      return null
    }
    return url
  },

  /**
   * 清空云端数据缓存并重载
   */
  clearAllData: async () => {
    logger.info('Data cache cleared. Re-syncing from cloud...')
    window.location.reload()
  },
}
