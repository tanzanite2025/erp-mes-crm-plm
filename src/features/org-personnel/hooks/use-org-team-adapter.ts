import { useCallback, useState } from 'react'
import { useLanguage } from '@/context/language-provider'
import { TeamModuleAdapter, TeamRecord } from '@/features/shared/team'
import { Team } from '../data/schema'
import { teamsData as initialData } from '../data/teams-data'

function createLocalTeamId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 11)
}

export function useOrgTeamAdapter(): TeamModuleAdapter {
  const { t } = useLanguage()
  const [teams, setTeams] = useState<Team[]>(initialData)

  const saveTeam = useCallback((data: Partial<TeamRecord> & { id?: string }) => {
    if (data.id) {
      setTeams((prev) => prev.map((team) => (team.id === data.id ? ({ ...team, ...data } as Team) : team)))
      return
    }

    const newTeam: Team = {
      ...(data as Team),
      id: createLocalTeamId(),
      operateTime: new Date().toLocaleString(),
      operator: t('common.systemAdmin' as any),
      status: (data.status as Team['status']) ?? 'active',
      type: (data.type as Team['type']) ?? 'dispatch',
      code: String(data.code ?? ''),
      name: String(data.name ?? ''),
      section: String(data.section ?? ''),
      isMaintenance: Boolean(data.isMaintenance),
      step: typeof data.step === 'number' ? data.step : 0,
    }

    setTeams((prev) => [newTeam, ...prev])
  }, [])

  const deleteTeam = useCallback((id: string) => {
    setTeams((prev) => prev.filter((team) => team.id !== id))
  }, [])

  return {
    teams: teams as TeamRecord[],
    isLoading: false,
    saveTeam,
    deleteTeam,
    headerTitle: t('orgPersonnel.groups.headerTitle' as any),
    headerDescription: t('orgPersonnel.groups.headerDescription' as any),
    searchPlaceholder: t('orgPersonnel.groups.searchPlaceholder' as any),
    addButtonLabel: t('orgPersonnel.groups.addButton' as any),
    confirmDeleteMessage: t('orgPersonnel.groups.deleteConfirmMessage' as any),
  }
}
