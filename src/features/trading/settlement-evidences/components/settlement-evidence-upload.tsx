import { type ChangeEvent, useState } from 'react'
import { CloudUpload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { failLoudly } from '@/lib/safe-catch'
import { Input } from '@/components/ui/input'
import { uploadSettlementEvidenceImage } from '../services/settlement-evidence-service'

interface SettlementEvidenceUploadProps {
  disabled?: boolean
  uploadPath: string
  onUploaded: (payload: {
    fileName: string
    fileUrl: string
    mimeType: string
    fileSize: number
    note: string
  }) => Promise<void>
}

export function SettlementEvidenceUpload({
  disabled = false,
  uploadPath,
  onUploaded,
}: SettlementEvidenceUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [note, setNote] = useState('')

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0 || disabled) {
      return
    }

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error('图片不能超过 10MB')
          continue
        }
        const uploaded = await uploadSettlementEvidenceImage(uploadPath, file)
        await onUploaded({
          fileName: uploaded.name,
          fileUrl: uploaded.url,
          mimeType: file.type,
          fileSize: file.size,
          note,
        })
      }
      setNote('')
      toast.success('记录证据上传成功')
    } catch (error) {
      failLoudly(error, 'SettlementEvidenceUpload.handleChange', {
        silentUI: true,
      })
      toast.error('记录证据上传失败')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className='grid gap-3'>
      <div className='space-y-1'>
        <p className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
          凭证备注
        </p>
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder='可选备注：例如银行回单、微信截图、阶段款凭证'
          className='h-9 rounded-xl bg-background text-xs shadow-none'
          disabled={disabled || uploading}
        />
      </div>
      <div className='relative'>
        <input
          type='file'
          className='absolute inset-0 z-10 cursor-pointer opacity-0'
          accept='image/*'
          multiple
          disabled={disabled || uploading}
          onChange={handleChange}
        />
        <div className='flex min-h-[160px] flex-col items-center justify-center space-y-2 rounded-2xl border-2 border-dashed border-muted-foreground/20 transition-all hover:border-primary/50 hover:bg-primary/5'>
          {uploading ? (
            <Loader2 className='size-6 animate-spin text-primary' />
          ) : (
            <>
              <div className='flex size-10 items-center justify-center rounded-full bg-muted'>
                <CloudUpload className='size-5 text-muted-foreground' />
              </div>
              <span className='px-1 text-center text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
                上传记录图片证据
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
