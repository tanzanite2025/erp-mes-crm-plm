import type { Standard } from '../data/schema'

export class QualityStandardApprovalResponseNotConfirmedError extends Error {
  constructor() {
    super(
      'The server response did not confirm the current quality standard approval request'
    )
    this.name = 'QualityStandardApprovalResponseNotConfirmedError'
  }
}

/** The server commits the standard and its current approval request together. */
export async function submitQualityStandardWithConfirmedApprovalRequest({
  savePendingStandard,
}: {
  savePendingStandard: () => Promise<Standard>
}) {
  const savedStandard = await savePendingStandard()
  if (
    savedStandard.status !== 'PENDING_APPROVAL' ||
    !savedStandard.approvalRequestSummary?.id ||
    savedStandard.approvalRequestSummary.status !== 'PENDING'
  ) {
    throw new QualityStandardApprovalResponseNotConfirmedError()
  }
  return { standard: savedStandard }
}
