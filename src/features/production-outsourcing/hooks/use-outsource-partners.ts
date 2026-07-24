import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import type {
  OutsourcePartner,
  OutsourcePartnerFormValues,
} from '../data/outsource-partner'
import {
  outsourcePartnerQueryKeys,
  type OutsourcePartnerFilters,
} from '../query-keys'
import {
  createOutsourcePartner,
  deleteOutsourcePartner,
  getOutsourcePartners,
  updateOutsourcePartner,
} from '../services/outsource-partners-service'

export function useOutsourcePartners(filters: OutsourcePartnerFilters = {}) {
  return useQuery({
    queryKey: outsourcePartnerQueryKeys.list(filters),
    queryFn: () => getOutsourcePartners(filters),
  })
}

export function useOutsourcePartnerMutations() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const invalidatePartners = () =>
    queryClient.invalidateQueries({
      queryKey: outsourcePartnerQueryKeys.all,
    })

  const createMutation = useMutation({
    mutationFn: (values: OutsourcePartnerFormValues) =>
      createOutsourcePartner(values),
    onSuccess: () => {
      toast.success(t('productionOutsourcing.partners.toasts.saved'))
      void invalidatePartners()
    },
    onError: handleServerError,
  })

  const updateMutation = useMutation({
    mutationFn: ({
      partner,
      values,
    }: {
      partner: OutsourcePartner
      values: OutsourcePartnerFormValues
    }) => updateOutsourcePartner(partner, values),
    onSuccess: () => {
      toast.success(t('productionOutsourcing.partners.toasts.saved'))
      void invalidatePartners()
    },
    onError: handleServerError,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteOutsourcePartner,
    onSuccess: () => {
      toast.success(t('productionOutsourcing.partners.toasts.deleted'))
      void invalidatePartners()
    },
    onError: handleServerError,
  })

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
