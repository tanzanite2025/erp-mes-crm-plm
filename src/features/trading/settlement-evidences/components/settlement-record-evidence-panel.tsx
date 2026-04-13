import { ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCreateSettlementRecordEvidence,
  useDeleteSettlementRecordEvidence,
  useSettlementRecordEvidences,
} from '../hooks/use-settlement-record-evidences'
import { SettlementEvidenceGallery } from './settlement-evidence-gallery'
import { SettlementEvidenceUpload } from './settlement-evidence-upload'
import type { SettlementRecordEvidenceType } from '../services/settlement-evidence-service'

interface SettlementRecordEvidencePanelProps {
  recordId: string | null
  recordType: SettlementRecordEvidenceType
  uploadPath: string
  title: string
}

export function SettlementRecordEvidencePanel({
  recordId,
  recordType,
  uploadPath,
  title,
}: SettlementRecordEvidencePanelProps) {
  const evidencesQuery = useSettlementRecordEvidences(recordType, recordId)
  const createMutation = useCreateSettlementRecordEvidence(recordType)
  const deleteMutation = useDeleteSettlementRecordEvidence(recordType)

  const evidences = evidencesQuery.data ?? []

  return (
    <div className='group space-y-4 rounded-lg border p-4'>
      <div className='flex items-center justify-between px-1'>
        <div className='flex items-center gap-2'>
          <ImageIcon className='size-3.5 text-primary' />
          <h4 className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic'>
            {title}
          </h4>
        </div>
        <span className='text-[8px] font-mono text-muted-foreground/40'>{evidences.length}</span>
      </div>
      {!recordId ? (
        <div className='flex min-h-[120px] flex-col items-center justify-center space-y-2 rounded-[24px] border border-dashed border-muted-foreground/20 bg-muted/5 p-4 text-center text-muted-foreground/40'>
          <ImageIcon className='size-8' />
          <p className='text-[10px] font-black uppercase tracking-[0.2em] italic'>请先选择一条记录</p>
        </div>
      ) : (
        <div className='grid gap-4'>
          <SettlementEvidenceUpload
            uploadPath={uploadPath}
            disabled={createMutation.isPending}
            onUploaded={async (payload) => {
              await createMutation.mutateAsync({
                recordId,
                payload: {
                  ...payload,
                  category: 'IMAGE',
                },
              })
            }}
          />
          {evidencesQuery.isLoading ? (
            <div className='flex min-h-[120px] flex-col items-center justify-center space-y-2 rounded-[24px] border border-dashed border-muted-foreground/20 bg-muted/5 p-4 text-center text-muted-foreground/40'>
              <ImageIcon className='size-8' />
              <p className='text-[10px] font-black uppercase tracking-[0.2em] italic'>记录证据加载中...</p>
            </div>
          ) : evidencesQuery.isError ? (
            <div className='flex min-h-[120px] flex-col items-center justify-center space-y-2 rounded-[24px] border border-dashed border-destructive/20 bg-destructive/5 p-4 text-center text-destructive/70'>
              <ImageIcon className='size-8' />
              <p className='text-[10px] font-black uppercase tracking-[0.2em] italic'>记录证据加载失败</p>
            </div>
          ) : (
            <SettlementEvidenceGallery
              evidences={evidences}
              deletingId={deleteMutation.variables?.evidenceId ?? null}
              onDelete={(evidenceId) => {
                void deleteMutation.mutateAsync({ recordId, evidenceId }).then(() => {
                  toast.success('记录证据已删除')
                })
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
