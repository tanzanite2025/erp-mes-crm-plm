import { z } from 'zod'

export const nippleSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '请输入辐条帽名称'),
  brand: z.string().optional(),
  material: z.string().optional(),
  length: z.string().optional(), // 长度: 12mm, 14mm, 16mm
  color: z.string().optional(),
  fileUrl: z.string().optional(),
  fileExtension: z.string().optional(),
  createdAt: z.string(),
})

export type Nipple = z.infer<typeof nippleSchema>
