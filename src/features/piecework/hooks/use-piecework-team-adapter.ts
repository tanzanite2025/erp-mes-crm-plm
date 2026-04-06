import { useCallback } from 'react'
import { TeamModuleAdapter, TeamRecord } from '@/features/shared/team'
import { Team } from '../data/schema'
import { useGetTeams, usePieceworkMutations } from './use-piecework'

export function usePieceworkTeamAdapter(): TeamModuleAdapter {
  const { data: teams = [], isLoading } = useGetTeams()
  const { saveTeamMutation, deleteTeamMutation } = usePieceworkMutations()

  const saveTeam = useCallback(
    (data: Partial<TeamRecord> & { id?: string }) => {
      saveTeamMutation.mutate(data as Partial<Team>)
    },
    [saveTeamMutation]
  )

  const deleteTeam = useCallback(
    (id: string) => {
      deleteTeamMutation.mutate(id)
    },
    [deleteTeamMutation]
  )

  return {
    teams: teams as TeamRecord[],
    isLoading,
    saveTeam,
    deleteTeam,
    headerTitle: '计件班组群组原子中心',
    headerDescription:
      'PERSONNEL_TEAM_HUB / 生产动力核心：管理生产车间班组架构、逻辑分类及计件核算归属',
    searchPlaceholder: '搜索群组编码、名称、区段... SCAN_TEAMS',
    addButtonLabel: '新增班组',
    confirmDeleteMessage: '确认删除该生产班组？此操作不可撤销。',
  }
}
