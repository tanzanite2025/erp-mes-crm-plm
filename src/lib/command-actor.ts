import { failLoudly } from '@/lib/safe-catch'

type CommandActorInput = {
  actorId?: string | null
  operator?: string | null
}

export type CommandActor = {
  actorId: string
  operator: string
}

export function requireCommandActor(
  actor: CommandActorInput,
  scope: string
): CommandActor {
  const actorId = actor.actorId?.trim()
  const operator = actor.operator?.trim()

  if (!actorId || !operator) {
    const error = new Error(
      `[CRITICAL] Missing command actor in ${scope}`
    )
    failLoudly(error, scope)
    throw error
  }

  return {
    actorId,
    operator,
  }
}
