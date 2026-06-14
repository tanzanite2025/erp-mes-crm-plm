import { useCallback, useMemo, useState } from 'react'
import type { DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { useHierarchyLevelLabels } from '@/features/production-shared/tabs/hierarchy-config/hooks/use-hierarchy-level-labels'
import type { TeamModuleAdapter, TeamRecord } from '@/features/shared/team'
import type { Team } from '../data/schema'
import { teamsData as initialData } from '../data/teams-data'

function createLocalTeamId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 11)
}

function applyDeltaPatch(target: Team, delta?: DeltaSet) {
  if (!delta?.set) return target
  return { ...target, ...(delta.set as Partial<Team>) }
}

export function useOrgTeamAdapter(): TeamModuleAdapter {
  const { t } = useLanguage()
  const { level1Name, level3Name } = useHierarchyLevelLabels()
  const [teams, setTeams] = useState<Team[]>(initialData)

  const saveTeam = useCallback(
    ({
      data,
      isPatch,
      delta,
      version,
    }: {
      data: Partial<TeamRecord>
      isPatch: boolean
      delta?: DeltaSet
      version?: number
    }) => {
      if (isPatch && data.id) {
        setTeams((prev) =>
          prev.map((team) => {
            if (team.id !== data.id) return team
            const nextTeam = applyDeltaPatch(team, delta)
            const nextVersion =
              typeof version === 'number'
                ? version + 1
                : (team.version ?? 0) + 1
            return { ...nextTeam, version: nextVersion }
          })
        )
        return
      }

      if (data.id) {
        setTeams((prev) =>
          prev.map((team) =>
            team.id === data.id
              ? ({
                  ...team,
                  ...data,
                  version:
                    typeof version === 'number'
                      ? version + 1
                      : (team.version ?? 0) + 1,
                } as Team)
              : team
          )
        )
        return
      }

      const newTeam: Team = {
        ...(data as Team),
        id: createLocalTeamId(),
        operateTime: new Date().toLocaleString(),
        operator: t('sidebar.groups.systemAdmin'),
        status: (data.status as Team['status']) ?? 'active',
        type: (data.type as Team['type']) ?? 'dispatch',
        code: String(data.code ?? ''),
        name: String(data.name ?? ''),
        section: String(data.section ?? ''),
        isMaintenance: Boolean(data.isMaintenance),
        step: typeof data.step === 'number' ? data.step : 0,
        version: 1,
      }

      setTeams((prev) => [newTeam, ...prev])
    },
    [t]
  )

  const deleteTeam = useCallback((id: string) => {
    setTeams((prev) => prev.filter((team) => team.id !== id))
  }, [])

  const texts = useMemo<TeamModuleAdapter['texts']>(
    () => ({
      headerTitle: '班组管理',
      headerDescription: `维护班组主数据、${level3Name}归属与状态。`,
      searchPlaceholder: t('orgPersonnel.org.groups.searchPlaceholderDynamic', {
        levelName: level1Name,
      }),
      addButtonLabel: '新增班组',
      confirmDeleteMessage: '确定删除该班组吗？',
      table: {
        code: '班组编码',
        name: '班组名称',
        step: level3Name,
        section: t('orgPersonnel.org.groups.sectionLabelDynamic', {
          levelName: level1Name,
        }),
        type: '班组类型',
        maintenance: '维护班组',
        status: '状态',
        audit: '审计信息',
        commands: '操作',
      },
      typeLabels: {
        dispatch: '调度',
        quality: '质检',
        transfer: '转运',
        receive: '收料',
      },
      maintenanceLabels: {
        true: '是',
        false: '否',
      },
      statusLabels: {
        active: '启用',
        inactive: '停用',
      },
      empty: {
        title: '暂无班组数据',
        description: t('orgPersonnel.org.groups.emptyDescriptionDynamic', {
          levelName: level1Name,
          relatedLevelName: level3Name,
        }),
      },
      dialog: {
        titleEdit: '编辑班组',
        titleCreate: '新增班组',
        description: '请填写班组基础信息。',
        footerTracking: '保存后自动记录版本与操作信息',
        cancel: '取消',
        save: '保存',
        validationRequired: '请完成必填项',
        fields: {
          code: '班组编码',
          name: '班组名称',
          shortName: '简称',
          step: level3Name,
          section: t('orgPersonnel.org.groups.sectionLabelDynamic', {
            levelName: level1Name,
          }),
          type: '班组类型',
          maintenance: '维护班组',
          status: '状态',
          remarks: '备注',
        },
        placeholders: {
          code: '请输入班组编码',
          name: '请输入班组名称',
          shortName: '请输入简称',
          section: t('orgPersonnel.org.groups.sectionPlaceholderDynamic', {
            levelName: level1Name,
          }),
          remarks: '可选',
        },
        sectionOptions: {
          productionControl: '生产控制',
          materialPrep: '备料',
          batching: '配料',
          molding: '成型',
          machining: '机加',
          finishing: '后处理',
        },
        typeOptions: {
          dispatch: '调度',
          quality: '质检',
          transfer: '转运',
          receive: '收料',
        },
        maintenanceDescription: '开启后该班组将参与维护任务',
        statusDescription: '停用后将不再参与新建流程',
        statusOptions: {
          active: '启用',
          inactive: '停用',
        },
      },
    }),
    [level1Name, level3Name, t]
  )

  return {
    teams: teams as TeamRecord[],
    isLoading: false,
    texts,
    saveTeam,
    deleteTeam,
  }
}
