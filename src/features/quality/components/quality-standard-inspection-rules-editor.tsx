import type { ControlledProtocolInspectionCriterionFormValue } from '../services/controlled-protocol-inspection-criteria-editor'
import { ControlledProtocolInspectionCriteriaEditor } from './controlled-protocol-inspection-criteria-editor'

interface QualityStandardInspectionRulesEditorProps {
  readOnly: boolean
  inspectionCriteria: ControlledProtocolInspectionCriterionFormValue[] | null
  onInspectionCriteriaChange: (
    criteria: ControlledProtocolInspectionCriterionFormValue[]
  ) => void
}

export function QualityStandardInspectionRulesEditor({
  readOnly,
  inspectionCriteria,
  onInspectionCriteriaChange,
}: QualityStandardInspectionRulesEditorProps) {
  if (inspectionCriteria === null) return null
  return (
    <ControlledProtocolInspectionCriteriaEditor
      criteria={inspectionCriteria}
      readOnly={readOnly}
      onCriteriaChange={onInspectionCriteriaChange}
    />
  )
}
