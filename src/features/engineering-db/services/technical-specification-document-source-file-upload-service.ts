import { AssetService } from '@/services/asset-service'

export async function uploadTechnicalSpecificationDocumentSourceFile(
  file: File
) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!['pdf', 'xlsx', 'docx'].includes(extension)) {
    throw new Error('工艺规范文档支持 PDF、Excel（.xlsx）和 Word（.docx）文件')
  }
  const uploaded = await AssetService.uploadFile(file)
  return { url: uploaded.url, extension, fileName: uploaded.fileName }
}
