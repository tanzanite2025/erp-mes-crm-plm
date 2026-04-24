import { useCallback } from 'react'
import { useLanguage } from '@/context/language-provider'
import type { DeltaSet } from '@/lib/delta/types'
import type { TeamModuleAdapter, TeamRecord } from '@/features/shared/team'
import type { Team } from '../data/schema'
import { useGetTeams, usePieceworkMutations } from './use-piecework'

export function usePieceworkTeamAdapter(): TeamModuleAdapter {
  const { t } = useLanguage()
  const { data: teams = [], isLoading } = useGetTeams()
  const { saveTeamMutation, patchTeamMutation, deleteTeamMutation } = usePieceworkMutations()

  const saveTeam = useCallback(
    ({ data, isPatch, delta, version }: { data: Partial<TeamRecord>; isPatch: boolean; delta?: DeltaSet; version?: number }) => {
      if (isPatch && delta && version !== undefined) {
        patchTeamMutation.mutate({
          id: data.id as string,
          delta,
          version
        })
      } else {
        saveTeamMutation.mutate(data as Partial<Team>)
      }
    },
    [saveTeamMutation, patchTeamMutation]
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
    texts: {
      headerTitle: t('piecework.teams.page.headerTitle'),
      headerDescription: t('piecework.teams.page.headerDescription'),
      searchPlaceholder: t('piecework.teams.page.searchPlaceholder'),
      addButtonLabel: t('piecework.teams.page.add'),
      confirmDeleteMessage: t('piecework.teams.page.confirmDelete'),
      table: {
        code: t('piecework.teams.page.table.code'),
        name: t('piecework.teams.page.table.name'),
        step: t('piecework.teams.page.table.step'),
        section: t('piecework.teams.page.table.section'),
        type: t('piecework.teams.page.table.type'),
        maintenance: t('piecework.teams.page.table.maintenance'),
        status: t('piecework.teams.page.table.status'),
        audit: t('piecework.teams.page.table.audit'),
        commands: t('piecework.teams.page.table.commands'),
      },
      typeLabels: {
        dispatch: t('piecework.teams.page.typeLabels.dispatch'),
        quality: t('piecework.teams.page.typeLabels.quality'),
        transfer: t('piecework.teams.page.typeLabels.transfer'),
        receive: t('piecework.teams.page.typeLabels.receive'),
      },
      maintenanceLabels: {
        true: t('piecework.teams.page.maintenanceLabels.true'),
        false: t('piecework.teams.page.maintenanceLabels.false'),
      },
      statusLabels: {
        active: t('piecework.teams.page.statusLabels.active'),
        inactive: t('piecework.teams.page.statusLabels.inactive'),
      },
      empty: {
        title: t('piecework.teams.page.empty.title'),
        description: t('piecework.teams.page.empty.description'),
      },
      dialog: {
        titleEdit: t('piecework.teams.dialog.titleEdit'),
        titleCreate: t('piecework.teams.dialog.titleCreate'),
        description: t('piecework.teams.dialog.description'),
        footerTracking: t('piecework.teams.dialog.footerTracking'),
        cancel: t('piecework.teams.dialog.cancel'),
        save: t('piecework.teams.dialog.save'),
        validationRequired: t('piecework.teams.dialog.validationRequired'),
        fields: {
          code: t('piecework.teams.dialog.fields.code'),
          name: t('piecework.teams.dialog.fields.name'),
          shortName: t('piecework.teams.dialog.fields.shortName'),
          step: t('piecework.teams.dialog.fields.step'),
          section: t('piecework.teams.dialog.fields.section'),
          type: t('piecework.teams.dialog.fields.type'),
          maintenance: t('piecework.teams.dialog.fields.maintenance'),
          status: t('piecework.teams.dialog.fields.status'),
          remarks: t('piecework.teams.dialog.fields.remarks'),
        },
        placeholders: {
          code: t('piecework.teams.dialog.placeholders.code'),
          name: t('piecework.teams.dialog.placeholders.name'),
          shortName: t('piecework.teams.dialog.placeholders.shortName'),
          section: t('piecework.teams.dialog.placeholders.section'),
          remarks: t('piecework.teams.dialog.placeholders.remarks'),
        },
        sectionOptions: {
          productionControl: t('piecework.teams.dialog.sectionOptions.productionControl'),
          materialPrep: t('piecework.teams.dialog.sectionOptions.materialPrep'),
          batching: t('piecework.teams.dialog.sectionOptions.batching'),
          molding: t('piecework.teams.dialog.sectionOptions.molding'),
          machining: t('piecework.teams.dialog.sectionOptions.machining'),
          finishing: t('piecework.teams.dialog.sectionOptions.finishing'),
        },
        typeOptions: {
          dispatch: t('piecework.teams.dialog.typeOptions.dispatch'),
          quality: t('piecework.teams.dialog.typeOptions.quality'),
          transfer: t('piecework.teams.dialog.typeOptions.transfer'),
          receive: t('piecework.teams.dialog.typeOptions.receive'),
        },
        maintenanceDescription: t('piecework.teams.dialog.maintenanceDescription'),
        statusDescription: t('piecework.teams.dialog.statusDescription'),
        statusOptions: {
          active: t('piecework.teams.dialog.statusOptions.active'),
          inactive: t('piecework.teams.dialog.statusOptions.inactive'),
        },
      },
    },
    saveTeam,
    deleteTeam,
  }
}
