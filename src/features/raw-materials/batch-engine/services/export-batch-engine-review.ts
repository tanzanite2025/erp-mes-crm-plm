import type { BatchOptimizerPlan, BatchOptimizerPlanDiffSummary } from '../types'

function buildGeometryMetrics(plan: BatchOptimizerPlan) {
  const geometryZones = plan.geometryLayoutSummary?.zones ?? []
  return {
    geometryZoneCount: geometryZones.length,
    geometryPieceZoneCount: geometryZones.filter((zone) => zone.usageCategory === 'piece').length,
    geometryResidualZoneCount: geometryZones.filter((zone) => zone.usageCategory === 'residual' || zone.usageCategory === 'leftover').length,
    geometryRollCount: Array.from(new Set(geometryZones.map((zone) => zone.rollId).filter(Boolean))).length,
  }
}

function buildExportPayload(plan: BatchOptimizerPlan, diffSummary: BatchOptimizerPlanDiffSummary) {
  const geometryMetrics = buildGeometryMetrics(plan)
  return {
    rank: plan.rank,
    strategyKey: plan.strategyKey,
    score: plan.score,
    utilizationPercent: plan.utilizationPercent,
    lossAreaM2: plan.lossAreaM2,
    comparisonSummary: plan.comparisonSummary,
    scoreBreakdown: plan.scoreBreakdown,
    mustFulfillDiagnostics: plan.mustFulfillDiagnostics,
    diffSummary,
    reportSummary: {
      ...plan.reportSummary,
      baselinePlanRank: diffSummary.baselinePlanRank,
      baselineStrategyKey: diffSummary.baselineStrategyKey,
      changedDemandLineCount: diffSummary.changedDemandLineIds.length,
      changedRollCount: diffSummary.changedRollIds.length,
      highlightZoneCount: diffSummary.highlightZoneIds.length,
    },
    searchConfig: plan.searchConfig,
    candidateBudgetSummary: plan.candidateBudgetSummary,
    budgetRerankReason: plan.budgetRerankReason,
    explainabilitySummary: plan.explainabilitySummary,
    geometryMetrics,
  }
}

export function exportBatchEngineReviewJson(plan: BatchOptimizerPlan, diffSummary: BatchOptimizerPlanDiffSummary) {
  const payload = buildExportPayload(plan, diffSummary)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  downloadBlob(blob, `batch-engine-plan-${plan.rank}-review.json`)
}

export function exportBatchEngineReviewCsv(plan: BatchOptimizerPlan, diffSummary: BatchOptimizerPlanDiffSummary) {
  const geometryMetrics = buildGeometryMetrics(plan)
  const rows = [
    ['planRank', String(plan.rank)],
    ['strategyKey', plan.strategyKey],
    ['baselinePlanRank', String(diffSummary.baselinePlanRank)],
    ['baselineStrategyKey', diffSummary.baselineStrategyKey],
    ['score', plan.score.toFixed(2)],
    ['utilizationPercent', plan.utilizationPercent.toFixed(2)],
    ['lossAreaM2', plan.lossAreaM2.toFixed(3)],
    ['mustFulfillRiskCount', String(plan.mustFulfillDiagnostics.filter((item) => item.status === 'unfulfilled').length)],
    ['changedDemandLineCount', String(diffSummary.changedDemandLineIds.length)],
    ['changedRollCount', String(diffSummary.changedRollIds.length)],
    ['highlightZoneCount', String(diffSummary.highlightZoneIds.length)],
    ['adjacencyBreakCount', String(plan.reportSummary.adjacencyBreakCount)],
    ['rollSwitchCount', String(plan.reportSummary.rollSwitchCount)],
    ['geometryReuseHitCount', String(plan.reportSummary.geometryReuseHitCount)],
    ['reusableResidualAreaM2', plan.reportSummary.reusableResidualAreaM2.toFixed(6)],
    ['searchPreset', plan.searchConfig.presetKey],
    ['beamWidth', String(plan.searchConfig.beamWidth)],
    ['maxSearchDepth', String(plan.searchConfig.maxSearchDepth)],
    ['perDemandBranchingLimit', String(plan.searchConfig.perDemandBranchingLimit)],
    ['candidateMergedCount', String(plan.candidateBudgetSummary.mergedCandidateCount)],
    ['candidateGlobalBudget', String(plan.candidateBudgetSummary.globalBudget)],
    ['budgetRerankReason', plan.budgetRerankReason || '--'],
    ['primaryBreakReasons', plan.explainabilitySummary.primaryBreakReasons.join(' | ') || '--'],
    ['heatZoneAttributions', plan.explainabilitySummary.heatZoneAttributions.map((item) => `${item.zoneId}:${item.segmentKind}`).join(' | ') || '--'],
    ['breakSlices', plan.explainabilitySummary.breakSlices.map((item) => `${item.id}:${item.severityScore.toFixed(2)}`).join(' | ') || '--'],
    ['zoneClusters', plan.explainabilitySummary.zoneClusters.map((item) => `${item.clusterId}:${item.densityScore.toFixed(2)}`).join(' | ') || '--'],
    ['geometryZoneCount', String(geometryMetrics.geometryZoneCount)],
    ['geometryPieceZoneCount', String(geometryMetrics.geometryPieceZoneCount)],
    ['geometryResidualZoneCount', String(geometryMetrics.geometryResidualZoneCount)],
    ['geometryRollCount', String(geometryMetrics.geometryRollCount)],
  ]
  const csv = rows.map(([key, value]) => `${escapeCsv(key)},${escapeCsv(value)}`).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `batch-engine-plan-${plan.rank}-review.csv`)
}

export function printBatchEngineReviewPdf(plan: BatchOptimizerPlan, diffSummary: BatchOptimizerPlanDiffSummary) {
  const payload = buildExportPayload(plan, diffSummary)
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720')
  if (!printWindow) {
    return
  }
  printWindow.document.write(`
    <html>
      <head>
        <title>Batch Engine Review ${plan.rank}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1, h2 { font-style: italic; text-transform: uppercase; }
          pre { white-space: pre-wrap; word-break: break-word; font-size: 12px; background: #f8fafc; padding: 16px; border: 1px dashed #cbd5e1; border-radius: 16px; }
        </style>
      </head>
      <body>
        <h1>Batch Engine Review</h1>
        <h2>Plan #${plan.rank} / ${plan.strategyKey}</h2>
        <pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  window.URL.revokeObjectURL(url)
}

function escapeCsv(value: string) {
  const escaped = value.split('"').join('""')
  return `"${escaped}"`
}

function escapeHtml(value: string) {
  return value
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
}
