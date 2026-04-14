import { apiFetch } from '@/lib/api-client'
import { z } from 'zod'

// 终端资源状态定义
export const TerminalResourceStatusSchema = z.enum(['active', 'pendingUpload', 'deprecated', 'planned'])
export type TerminalResourceStatus = z.infer<typeof TerminalResourceStatusSchema>

// 终端资源定义 (驱动、固件等)
export const TerminalResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  category: z.string(),
  status: TerminalResourceStatusSchema,
  updatedAt: z.string(),
  downloadUrl: z.string().optional(),
  fileSize: z.string().optional(),
  compatibility: z.array(z.string()).optional(),
})

export type TerminalResource = z.infer<typeof TerminalResourceSchema>

class TerminalResourceService {
  /**
   * 按分类获取终端资源列表 (如 'printer', 'pda', 'scanner')
   */
  async getResourcesByCategory(category: string): Promise<TerminalResource[]> {
    // 实际生产环境下此接口应对应 GET /api/v1/terminal/resources?category=${category}
    return apiFetch<TerminalResource[]>(`/terminal/resources?category=${category}`, {
      method: 'GET',
    })
  }

  /**
   * 上传资源 (管理员权限)
   */
  async uploadResource(category: string, file: File): Promise<TerminalResource> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)

    return apiFetch<TerminalResource>(`/terminal/resources/upload`, {
      method: 'POST',
      body: formData,
    })
  }

  /**
   * 触发下载操作
   */
  getDownloadUrl(resourceId: string): string {
    return `/api/v1/terminal/resources/${resourceId}/download`
  }
}

export const terminalResourceService = new TerminalResourceService()
