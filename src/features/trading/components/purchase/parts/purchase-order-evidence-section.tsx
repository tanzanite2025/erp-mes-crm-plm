import { DocumentEvidenceManager } from '@/features/sales-document/components/document-evidence-manager'
import { type OrderEvidence } from '../../../data/schema'

interface PurchaseOrderEvidenceSectionProps {
  evidences: OrderEvidence[]
  onChange: (evidences: OrderEvidence[]) => void
}

export function PurchaseOrderEvidenceSection({
  evidences,
  onChange,
}: PurchaseOrderEvidenceSectionProps) {
  return (
    <div className='rounded-[32px] border border-dashed border-muted-foreground/20 bg-muted/5 p-4'>
      <DocumentEvidenceManager
        evidences={evidences}
        onChange={onChange}
        disabled={false}
        uploadPath='/purchase/evidence/upload'
        compact
        evidenceImageHeightClassName='h-[88px]'
        compactUploadSlotMinHeightClassName='min-h-[104px]'
      />
    </div>
  )
}
