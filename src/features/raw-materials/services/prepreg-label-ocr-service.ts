import type { PrepregFormState } from '../data/prepreg-material-spec-schema'

export type PrepregLabelOcrStatus = 'ready' | 'ocr_unavailable' | 'failed'

export interface PrepregLabelRecognitionResult {
  status: PrepregLabelOcrStatus
  rawText: string
  fields: Partial<PrepregFormState>
  imagePreviewUrl?: string
  message?: string
}

export const PrepregLabelOcrService = {
  async recognizeImage(file: File): Promise<PrepregLabelRecognitionResult> {
    const imagePreviewUrl = URL.createObjectURL(file)

    return {
      status: 'ocr_unavailable',
      rawText: '',
      fields: {},
      imagePreviewUrl,
      message: '自动识别接口尚未接入；可先粘贴识别文本，再解析填入表单。',
    }
  },
}
