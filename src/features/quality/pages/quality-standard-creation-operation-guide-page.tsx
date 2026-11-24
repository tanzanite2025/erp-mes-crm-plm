import { ChapteredBusinessOperationGuidePage } from '@/components/chaptered-business-operation-guide-page'
import { QualityStandardCreationGuideBusinessEntry } from '../components/quality-standard-creation-guide-business-entry'
import { qualityStandardCreationOperationGuideDefinition } from '../data/quality-standard-creation-operation-guide-chapter-definitions'

export function QualityStandardCreationOperationGuidePage() {
  return (
    <div className='flex min-h-0 flex-1 flex-col gap-3'>
      <QualityStandardCreationGuideBusinessEntry />
      <div className='min-h-0 flex-1'>
        <ChapteredBusinessOperationGuidePage
          guide={qualityStandardCreationOperationGuideDefinition}
        />
      </div>
    </div>
  )
}
