import { Info } from 'lucide-react'
import { FileUploader } from '@/components/file-uploader'
import { Label } from '@/components/ui/label'

interface DrillingAttachmentSectionProps {
  fileUrl: string
  onChange: (url: string, extension?: string) => void
}

export function DrillingAttachmentSection({
  fileUrl,
  onChange,
}: DrillingAttachmentSectionProps) {
  return (
    <div className='bg-indigo-500/5 p-6 rounded-[32px] border border-dashed border-indigo-500/20 space-y-3'>
      <Label className='text-[10px] font-black uppercase tracking-widest text-indigo-600/60 flex items-center gap-2'>
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
