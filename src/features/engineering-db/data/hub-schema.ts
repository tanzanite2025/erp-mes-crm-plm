import { z } from 'zod'

export const hubSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '请输入花鼓名称'),
  brand: z.string().optional(),
  model: z.string().optional(),
  holeCount: z.string().optional(), // 孔数
  pcdLeft: z.string().optional(),   // 左侧 PCD
  pcdRight: z.string().optional(),  // 右侧 PCD
  flangeLeft: z.string().optional(), // 左侧法兰距
  flangeRight: z.string().optional(), // 右侧法兰距
  fileUrl: z.string().optional(),
  fileExtension: z.string().optional(),
  createdAt: z.string(),
})

export type Hub = z.infer<typeof hubSchema>
