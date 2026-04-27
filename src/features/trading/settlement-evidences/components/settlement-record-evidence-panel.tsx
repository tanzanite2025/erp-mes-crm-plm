import { AlertCircle, ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { DocumentEvidenceManager } from '@/features/sales-document/components/document-evidence-manager'
import type { OrderEvidence } from '@/features/trading/data/schema'
import { failLoudly } from '@/lib/safe-catch'

import type { SettlementRecordEvidenceApiDTO } from '../contracts/settlement-evidence-api-dto'
import {
  useCreateSettlementRecordEvidence,
  useDeleteSettlementRecordEvidence,
  useSettlementRecordEvidences,
} from '../hooks/use-settlement-record-evidences'
import type { SettlementRecordEvidenceType } from '../services/settlement-evidence-service'

interface SettlementRecordEvidencePanelProps {
  recordId: string | null
  recordType: SettlementRecordEvidenceType
  uploadPath: string
  title: string
}

function toDocumentEvidence(evidence: SettlementRecordEvidenceApiDTO): OrderEvidence {
  return {
    id: evidence.id,
    url: evidence.asset.fileUrl,
    name: evidence.asset.fileName,
    uploadedAt: evidence.asset.createdAt,
    note: evidence.note,
  }
}

function EvidenceEmptyState({ text }: { text: string }) {
  return (
    <div className='flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-muted/60 bg-background/60 p-3 text-center text-muted-foreground/45'>
      <ImageIcon className='size-7' />
      <p className='text-[10px] font-black uppercase tracking-[0.14em]'>{text}</p>
    </div>
  )
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

  const evidences = evidencesQuery.readResource.status === 'ready' ? evidencesQuery.readResource.data : []
  const documentEvidences = evidences.map(toDocumentEvidence)
  const isMutating = createMutation.isPending || deleteMutation.isPending

  const handleEvidenceChange = async (nextEvidences: OrderEvidence[]) => {
    if (!recordId) {
      return
    }

    const currentIds = new Set(evidences.map((evidence) => evidence.id))
    const nextIds = new Set(nextEvidences.map((evidence) => evidence.id))
    const deletedEvidences = evidences.filter((evidence) => !nextIds.has(evidence.id))
    const addedEvidences = nextEvidences.filter((evidence) => !currentIds.has(evidence.id))

    for (const evidence of deletedEvidences) {
      await deleteMutation.mutateAsync({ recordId, evidenceId: evidence.id })
      toast.success('记录凭证已删除')
    }

    for (const evidence of addedEvidences) {
      await createMutation.mutateAsync({
        recordId,
        payload: {
          fileName: evidence.name,
          fileUrl: evidence.url,
          category: 'IMAGE',
          note: evidence.note,
          sortOrder: nextEvidences.findIndex((item) => item.id === evidence.id) + 1,
        },
      })
    }
  }

  return (
    <div className='space-y-3 rounded-[22px] border border-dashed border-muted/60 bg-muted/5 p-4 shadow-inner'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <ImageIcon className='size-4 text-primary' />
          <h4 className='text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/60'>
            {title}
          </h4>
        </div>
        <span className='rounded-full border border-dashed border-muted/60 bg-background px-2 py-0.5 text-[10px] font-black tabular-nums text-muted-foreground/60'>
          {evidences.length}
        </span>
      </div>

      {evidencesQuery.readResource.status === 'idle' ? (
        <EvidenceEmptyState text='先选择一条记录，再上传凭证' />
      ) : evidencesQuery.readResource.status === 'loading' ? (
        <div className='flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-muted/60 bg-background/60 p-3 text-center text-muted-foreground/60'>
          <Loader2 className='size-6 animate-spin' />
          <p className='text-[10px] font-black uppercase tracking-[0.14em]'>记录凭证加载中</p>
        </div>
      ) : evidencesQuery.readResource.status === 'error' ? (
        <div className='flex min-h-[110px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-rose-300/60 bg-rose-50/60 p-4 text-center'>
          <AlertCircle className='size-6 text-rose-500' />
          <div className='space-y-1'>
            <p className='text-[10px] font-black uppercase tracking-[0.14em] text-rose-700'>记录凭证加载失败</p>
            <p className='text-[10px] font-bold leading-5 text-rose-700/80'>
              {evidencesQuery.readResource.error.message || '请稍后重试。'}
            </p>
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-8 rounded-full border-dashed px-4 text-[9px] font-black uppercase tracking-widest'
            onClick={() => {
              void evidencesQuery.retryRead()
            }}
          >
            重试
          </Button>
        </div>
      ) : evidences.length === 0 ? (
        <EvidenceEmptyState text='当前记录暂无凭证' />
      ) : (
        <div className='max-h-[280px] overflow-auto pr-1'>
          <DocumentEvidenceManager
            evidences={documentEvidences}
            onChange={(nextEvidences) => {
              void handleEvidenceChange(nextEvidences).catch((error) => {
                failLoudly(error, 'SettlementRecordEvidencePanel.handleEvidenceChange', { silentUI: true })
                toast.error('凭证挂接失败，请稍后重试')
              })
            }}
            disabled={isMutating || evidencesQuery.readResource.status !== 'ready'}
            uploadPath={uploadPath}
            maxCount={20}
            compact
            title={title}
            hint=''
            emptyText='当前记录暂无凭证'
            uploadActionText='上传图片凭证'
            noteLabel='凭证备注'
            notePlaceholder='可选备注，例如银行回单、微信截图、阶段款凭证'
            uploadSuccessText='图片上传成功'
            uploadFailedText='图片上传失败'
            maxSizeExceededText='图片不能超过 10MB'
            duplicateTitle='凭证图片可能重复'
            duplicateDescription='系统检测到相同图片，仍会保留本次挂接记录。'
          />
        </div>
      )}
    </div>
  )
}
