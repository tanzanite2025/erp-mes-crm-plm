import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { ProductionMaterialRequirementBomSelection } from '@/features/production-material-requirements/contracts/production-material-requirement-source-bom-and-contribution-api-dto'
import type {
  ProductionMaterialIssuanceSelectedSource,
  ProductionMaterialIssuanceSourceOption,
  ProductionMaterialIssuanceSourcePreparationSelection,
} from '../contracts/production-material-issuance-source-selection-and-preparation-api-dto'
import { productionMaterialIssuanceCacheKeys } from '../data/production-material-issuance-query-and-explicit-command-cache-keys'
import {
  prepareProductionMaterialIssuanceSources,
  queryProductionMaterialIssuanceSourceOptions,
} from '../services/production-material-issuance-source-options-and-preparation-query-service'

export function useProductionMaterialIssuanceSourceSelectionAndPreparation(
  actorId: string,
  initialSources: ProductionMaterialIssuanceSelectedSource[]
) {
  const [selected, setSelected] = useState(initialSources)
  const [revision, setRevision] = useState(0)
  const [query, setQuery] = useState({ search: '', page: 1, pageSize: 20 })
  const scope = JSON.stringify({ selected, revision })
  const options = useQuery({
    queryKey: [
      ...productionMaterialIssuanceCacheKeys.root,
      'source-options',
      actorId,
      query,
    ],
    queryFn: ({ signal }) =>
      queryProductionMaterialIssuanceSourceOptions(query, signal),
    retry: false,
  })
  const preparation = useMutation({
    mutationKey: [
      ...productionMaterialIssuanceCacheKeys.root,
      'source-preparation',
      actorId,
    ],
    mutationFn: async (input: {
      sources: ProductionMaterialIssuanceSourcePreparationSelection[]
      scope: string
    }) => ({
      result: await prepareProductionMaterialIssuanceSources(input.sources),
      scope: input.scope,
    }),
    retry: false,
  })
  const currentPreparation =
    preparation.data?.scope === scope ? preparation.data.result : undefined
  const displayedPreparation =
    preparation.data?.result.sourceLines.length === selected.length &&
    preparation.data.result.sourceLines.every((source) =>
      selected.some(
        (item) =>
          item.salesOrderId === source.salesOrderId &&
          item.salesOrderLineId === source.salesOrderLineId
      )
    )
      ? preparation.data.result
      : undefined
  const preparationPending =
    preparation.isPending && preparation.variables?.scope === scope
  const preparationError =
    preparation.isError && preparation.variables?.scope === scope
      ? preparation.error
      : undefined
  function replaceProductionMaterialIssuanceSelectedSources(
    sources: ProductionMaterialIssuanceSelectedSource[]
  ) {
    setSelected(sources)
    setRevision((value) => value + 1)
  }
  function toggleProductionMaterialIssuanceSource(
    source: ProductionMaterialIssuanceSourceOption
  ) {
    if (source.documentId) return
    const exists = selected.some(
      (item) => item.salesOrderLineId === source.salesOrderLineId
    )
    if (!exists && selected.length >= 500) return
    replaceProductionMaterialIssuanceSelectedSources(
      exists
        ? selected.filter(
            (item) => item.salesOrderLineId !== source.salesOrderLineId
          )
        : [
            ...selected,
            {
              salesOrderId: source.salesOrderId,
              salesOrderLineId: source.salesOrderLineId,
              orderNo: source.orderNo,
              lineNo: source.lineNo,
              productName: source.productName,
            },
          ]
    )
  }
  function changeProductionMaterialIssuanceSelectedBom(
    selection: ProductionMaterialRequirementBomSelection
  ) {
    replaceProductionMaterialIssuanceSelectedSources(
      selected.map((source) =>
        source.salesOrderId === selection.salesOrderId &&
        source.salesOrderLineId === selection.salesOrderLineId
          ? { ...source, bomId: selection.bomId }
          : source
      )
    )
  }
  function prepareSelectedProductionMaterialIssuanceSources() {
    if (selected.length < 1 || selected.length > 500) return
    preparation.mutate({
      scope,
      sources: selected.map(({ salesOrderId, salesOrderLineId, bomId }) => ({
        salesOrderId,
        salesOrderLineId,
        ...(bomId ? { bomId } : {}),
      })),
    })
  }
  return {
    selected,
    query,
    setQuery,
    options,
    currentPreparation,
    displayedPreparation,
    preparationPending,
    preparationError,
    preparationKey: `${scope}/${preparation.submittedAt}`,
    toggleProductionMaterialIssuanceSource,
    changeProductionMaterialIssuanceSelectedBom,
    prepareSelectedProductionMaterialIssuanceSources,
    removeProductionMaterialIssuanceSelectedSource: (id: number) =>
      replaceProductionMaterialIssuanceSelectedSources(
        selected.filter((source) => source.salesOrderLineId !== id)
      ),
  }
}
