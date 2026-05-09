import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'
import {
  applyBusinessEventSourceSectionPatch,
  buildBusinessEventSourceSectionPatch,
  getBusinessEventSourceDiff,
  type BusinessEventSourceSection,
} from './business-event-source-card-diff'
import { type UndoPatchState } from './business-event-source-card-actions'
import { cloneBusinessEventSource } from './business-event-source-card-utils'

export type BusinessEventSourceCardSavingState = Record<
  BusinessEventSourceSection,
  boolean
>

export function createBusinessEventSourceSavingState() {
  return {
    general: false,
    actions: false,
    statuses: false,
    fields: false,
    dynamicResolvers: false,
  } satisfies BusinessEventSourceCardSavingState
}

export function createBusinessEventSourceUndoPatchState() {
  return {
    general: null,
    actions: null,
    statuses: null,
    fields: null,
    dynamicResolvers: null,
  } satisfies UndoPatchState
}

export function mergeDirtySectionsIntoIncomingSource(
  previousCommittedSource: BusinessEventSource,
  incomingCommittedSource: BusinessEventSource,
  currentDraft: BusinessEventSource
) {
  const diff = getBusinessEventSourceDiff(previousCommittedSource, currentDraft)
  let nextDraft = cloneBusinessEventSource(incomingCommittedSource)

  const dirtySections: BusinessEventSourceSection[] = []
  if (diff.general.dirty) dirtySections.push('general')
  if (diff.actions.dirty) dirtySections.push('actions')
  if (diff.statuses.dirty) dirtySections.push('statuses')
  if (diff.fields.dirty) dirtySections.push('fields')
  if (diff.dynamicResolvers.dirty) dirtySections.push('dynamicResolvers')

  for (const section of dirtySections) {
    const patch = buildBusinessEventSourceSectionPatch(
      incomingCommittedSource,
      currentDraft,
      section
    )
    nextDraft = cloneBusinessEventSource(
      applyBusinessEventSourceSectionPatch(nextDraft, patch)
    )
  }

  return nextDraft
}
