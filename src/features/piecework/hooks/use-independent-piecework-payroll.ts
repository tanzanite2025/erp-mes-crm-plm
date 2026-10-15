import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { IndependentPieceworkPayrollService } from '../services/independent-piecework-payroll-service'

export function useGetPieceworkPayItems() {
  return useQuery({
    queryKey: ['piecework_pay_items'],
    queryFn: IndependentPieceworkPayrollService.listPayItems,
  })
}

export function useFinancePieceworkCalculationOptions() {
  return useQuery({
    queryKey: ['finance_piecework_calculation_options'],
    queryFn: IndependentPieceworkPayrollService.getCalculationOptions,
  })
}

export function useIndependentPieceworkPayrollMutations() {
  const client = useQueryClient()
  const { t } = useLanguage()
  const onError = (error: Error) => toast.error(error.message)
  const savePayItem = useMutation({
    mutationFn: IndependentPieceworkPayrollService.savePayItem,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['piecework_pay_items'] })
      toast.success(t('piecework.payroll.saved'))
    },
    onError,
  })
  return { savePayItem }
}
