import { TeamManagementView } from '@/features/shared/team'
import { usePieceworkTeamAdapter } from '../hooks/use-piecework-team-adapter'

export function Teams() {
  const adapter = usePieceworkTeamAdapter()
  return <TeamManagementView adapter={adapter} />
}
