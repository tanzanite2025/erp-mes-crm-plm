import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'

/**
 * 企业配置接口定义
 */
export interface EnterpriseConfig {
  name: string
  plan: string
  logoUrl?: string
}

export const DEFAULT_ENTERPRISE_LOGO_URL = '/brand/hackgripe.png'

const DEFAULT_ENTERPRISE_CONFIG: EnterpriseConfig = {
  name: '',
  plan: '',
  logoUrl: DEFAULT_ENTERPRISE_LOGO_URL,
}

export interface EnterpriseLogoUploadResponse {
  status: string
  logoUrl: string
  size: number
  config: EnterpriseConfig
}

/**
 * 企业设置服务 - 控制权归属后端
 */
export const EnterpriseService = {
  /**
   * 从后端获取企业配置
   * 如果后端未配置，应由后端返回默认初始值，而非前端硬编码。
   */
  getConfig: async (): Promise<EnterpriseConfig> => {
    try {
      const res = await apiFetch<EnterpriseConfig>('/enterprise/config', {
        suppressErrorStatuses: [404],
      })
      return ensureObjectResponse<EnterpriseConfig & Record<string, unknown>>(
        res,
        'EnterpriseService.getConfig'
      ) as EnterpriseConfig
    } catch (error) {
      const status =
        error && typeof error === 'object' && 'status' in error
          ? Number((error as { status?: unknown }).status)
          : undefined

      if (status === 404) {
        return DEFAULT_ENTERPRISE_CONFIG
      }

      throw error
    }
  },

  /**
   * 保存企业配置到后端
   */
  saveConfig: async (config: EnterpriseConfig): Promise<EnterpriseConfig> => {
    const res = await apiFetch<EnterpriseConfig>('/enterprise/config', {
      method: 'POST',
      body: JSON.stringify(config),
    })
    return ensureObjectResponse<EnterpriseConfig & Record<string, unknown>>(
      res,
      'EnterpriseService.saveConfig'
    ) as EnterpriseConfig
  },

  uploadLogo: async (file: File): Promise<EnterpriseLogoUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)

    const res = await apiFetch<EnterpriseLogoUploadResponse>(
      '/enterprise/config/logo',
      {
        method: 'POST',
        body: formData,
      }
    )
    return ensureObjectResponse<
      EnterpriseLogoUploadResponse & Record<string, unknown>
    >(res, 'EnterpriseService.uploadLogo') as EnterpriseLogoUploadResponse
  },
}
