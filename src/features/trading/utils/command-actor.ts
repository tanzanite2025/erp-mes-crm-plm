import { failLoudly } from '@/lib/safe-catch'

type TradingCommandActorInput = {
  actorId?: string | null
  operator?: string | null
}

export type TradingCommandActor = {
  actorId: string
  operator: string
}

export function requireTradingCommandActor(
  actor: TradingCommandActorInput,
  scope: string
): TradingCommandActor {
  const actorId = actor.actorId?.trim()
  const operator = actor.operator?.trim()

  if (!actorId || !operator) {
    const error = new Error(`[CRITICAL] Missing trading command actor in ${scope}`)
    failLoudly(error, scope)
    throw error
  }

  return {
    actorId,
    operator,
  }
}
