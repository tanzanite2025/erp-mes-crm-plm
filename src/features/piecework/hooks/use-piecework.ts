import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import type { Team, PieceworkRate } from '../data/schema'
import { PieceworkCoreService } from '../services/piecework-core-service'
import { PieceworkMaintenanceService } from '../services/piecework-maintenance-service'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

// --- 生产班组 (Teams) ---

export function useGetTeams() {
  return useQuery({
    queryKey: ['piecework_teams'],
    queryFn: () => PieceworkCoreService.getTeams(),
  })
}

export function usePieceworkMutations() {
  const queryClient = useQueryClient()
  const { t } = useLanguage()

  const saveTeamMutation = useMutation({
    mutationFn: (data: Partial<Team>) =>
      PieceworkMaintenanceService.saveTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piecework_teams'] })
      toast.success(t('piecework.teams.toast.saveSuccess'))
    },
    onError: (error: unknown) => {
      toast.error(
        t('piecework.teams.toast.saveFailed', {
          message: getErrorMessage(error),
        })
      )
    },
  })

  const patchTeamMutation = useMutation({
    mutationFn: (params: { id: string; delta: DeltaSet; version: number }) =>
      PieceworkMaintenanceService.patchTeam(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piecework_teams'] })
      toast.success(t('piecework.teams.toast.patchSuccess'))
    },
    onError: (error: unknown) => {
      toast.error(
        t('piecework.teams.toast.patchFailed', {
          message: getErrorMessage(error),
        })
      )
    },
  })

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => PieceworkMaintenanceService.deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piecework_teams'] })
      toast.success(t('piecework.teams.toast.deleteSuccess'))
    },
    onError: (error: unknown) => {
      toast.error(
        t('piecework.teams.toast.deleteFailed', {
          message: getErrorMessage(error),
        })
      )
    },
  })

  return { saveTeamMutation, patchTeamMutation, deleteTeamMutation }
}

// --- 计件工价规则 (Piecework Rates/Rules) ---

export function useGetPieceworkRates() {
  return useQuery({
    queryKey: ['piecework_rates'],
    queryFn: () => PieceworkCoreService.getPieceworkRates(),
  })
}

export function usePieceworkRateMutations() {
  const queryClient = useQueryClient()
  const { t } = useLanguage()

  const saveRateMutation = useMutation({
    mutationFn: (data: Partial<PieceworkRate>) =>
      PieceworkMaintenanceService.saveRate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piecework_rates'] })
      toast.success(t('piecework.rules.toast.saveSuccess'))
    },
    onError: (error: unknown) => {
      toast.error(
        t('piecework.rules.toast.saveFailed', {
          message: getErrorMessage(error),
        })
      )
    },
  })

  const patchRateMutation = useMutation({
    mutationFn: (params: { id: string; delta: DeltaSet; version: number }) =>
      PieceworkMaintenanceService.patchRate(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piecework_rates'] })
      toast.success(t('piecework.rules.toast.patchSuccess'))
    },
    onError: (error: unknown) => {
      toast.error(
        t('piecework.rules.toast.patchFailed', {
          message: getErrorMessage(error),
        })
      )
    },
  })

  const deleteRateMutation = useMutation({
    mutationFn: (id: string) => PieceworkMaintenanceService.deleteRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piecework_rates'] })
      toast.success(t('piecework.rules.toast.deleteSuccess'))
    },
    onError: (error: unknown) => {
      toast.error(
        t('piecework.rules.toast.deleteFailed', {
          message: getErrorMessage(error),
        })
      )
    },
  })

  return { saveRateMutation, patchRateMutation, deleteRateMutation }
}
