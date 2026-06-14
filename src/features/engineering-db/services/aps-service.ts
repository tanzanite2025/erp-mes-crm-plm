/**
 * Autodesk Platform Services (APS) Service
 * 处理 CAD 图档的预览鉴权、转换状态与 URN 解析
 */
import { createLogger } from '@/lib/logger'

const logger = createLogger('APSService')

export interface APSConfig {
  clientId: string
  accessToken?: string
  expireAt?: number
}

class APSService {
  private config: APSConfig = {
    clientId: 'MOCK_CLIENT_ID', // 实际使用时需从环境变量或后端获取
  }

  /**
   * 获取访问令牌 (Two-Legged OAuth)
   * 在生产环境中，建议通过后端 API 获取，避免 Client Secret 泄露
   */
  async getAccessToken(): Promise<string> {
    // 模拟令牌获取逻辑
    if (
      this.config.accessToken &&
      this.config.expireAt &&
      this.config.expireAt > Date.now()
    ) {
      return this.config.accessToken
    }

    logger.info('Fetching new access token')
    // 演示代码：返回一个模拟 Token
    this.config.accessToken =
      'Mock_APS_Token_' + Math.random().toString(36).substring(7)
    this.config.expireAt = Date.now() + 3600 * 1000
    return this.config.accessToken
  }

  /**
   * 将文件路径或 ID 转换为 APS 要求的 Base64 URN
   */
  fileToURN(fileId: string): string {
    // APS 要求 URN 是无填充的 Base64 编码
    return btoa(fileId).replace(/=/g, '')
  }

  /**
   * 检查模型衍生状态 (Translation Status)
   */
  async checkManifest(
    urn: string
  ): Promise<{ status: string; progress: string }> {
    logger.info('Checking manifest', { urn })
    // 演示环境默认返回已完成
    return { status: 'success', progress: '100%' }
  }

  /**
   * 转换模型 (Trigger Translation)
   */
  async translate(urn: string): Promise<void> {
    logger.info('Triggering translation', { urn })
  }

  /**
   * 辅助方法：解析文件 URL 供 Viewer 使用
   */
  async resolveFileURN(fileUrl: string): Promise<string> {
    // 如果是本地模拟路径，提取名称作为标识
    const fileName = fileUrl.split('/').pop() || 'unknown'
    return this.fileToURN(fileName)
  }
}

export const apsService = new APSService()
