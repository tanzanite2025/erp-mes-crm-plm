import { Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { FileUploader } from '@/components/file-uploader'

interface DrillingAttachmentSectionProps {
  fileUrl: string
  onChange: (url: string, extension?: string) => void
}

export function DrillingAttachmentSection({
  fileUrl,
  onChange,
}: DrillingAttachmentSectionProps) {
  return (
    <div className='space-y-3 rounded-[32px] border border-dashed border-indigo-500/20 bg-indigo-500/5 p-6'>
      <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-indigo-600/60 uppercase'>
        <Info className='size-3' /> 钻孔工程图纸 / ENGINEERING_DWG
      </Label>
      <FileUploader
        value={fileUrl}
        accept='.pdf,.dwg,.dxf,.stp,.step'
        onChange={onChange}
      />
    </div>
  )
}
