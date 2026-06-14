import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import { type StandardCommand } from '../data/schema'
import { RoutingService } from '../services/routing-service'

const logger = createLogger('useCommands')

export function useCommands() {
  const { t } = useLanguage()
  const [commands, setCommands] = useState<StandardCommand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      setError(null)
      const data = await RoutingService.getCommands()
      setCommands(data)
    } catch (err) {
      setError(err)
      logger.error('Failed to load commands', err)
      toast.error(
        t('workflowCore.commands.toasts.loadFailed') ||
          `Failed to load commands: ${err}`
      )
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const addCommand = async (
    data: Omit<StandardCommand, 'id' | 'createdAt'>
  ) => {
    try {
      const newCommand = await RoutingService.saveCommand(data)
      setCommands((prev) => [newCommand, ...prev])
      toast.success(t('workflowCore.commands.toasts.added'))
      return newCommand
    } catch (err) {
      logger.error('Add command failed', err)
      toast.error(`Add command failed: ${err}`)
    }
  }

  const updateCommand = async (
    id: string,
    updates: Partial<StandardCommand>
  ) => {
    try {
      const updated = await RoutingService.updateCommand(id, updates)
      setCommands((prev) =>
        prev.map((command) => (command.id === id ? updated : command))
      )
    } catch (err) {
      logger.error('Update command failed', err)
      toast.error(`Update command failed: ${err}`)
    }
  }

  const deleteCommand = async (id: string) => {
    try {
      await RoutingService.deleteCommand(id)
      setCommands((prev) => prev.filter((command) => command.id !== id))
      toast.info(t('workflowCore.commands.toasts.removed'))
    } catch (err) {
      logger.error('Delete command failed', err)
      toast.error(`Delete command failed: ${err}`)
    }
  }

  return {
    commands,
    loading,
    error,
    addCommand,
    updateCommand,
    deleteCommand,
    reload: loadData,
  }
}
